import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { InternalTicket } from '../types/internal';
import { ChevronDown, Printer, Search, Wrench, X } from '../../components/icons';
import { ScrollLock } from '../../hooks/useLockBodyScroll';
import { db } from '../../lib/supabase';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import { stageName } from '../../utils/serviceStages';
import { parseTicketNotes } from '../../utils/ticketNotesParser';
import { mechanicKey, mechanicKeys, useMechanicRoster, WorkshopMechanic } from '../../utils/workshopMechanics';
import { actionLabel } from '../utils/auditLabels';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { toast } from '../utils/toast';
import { PrintPreviewModal } from '../../components/print/PrintTemplate';
import { MechanicServiceRecordDocument } from '../../components/print/MotoCareDocuments';

interface MechanicHistoryModalProps {
  mechanic: WorkshopMechanic;
  tickets: InternalTicket[];
  currentStaffName: string;
  onClose: () => void;
}

type Period = 'MONTH' | 'THREE_MONTHS' | 'YEAR' | 'ALL';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'MONTH', label: 'This month' },
  { value: 'THREE_MONTHS', label: 'Last 3 months' },
  { value: 'YEAR', label: 'This year' },
  { value: 'ALL', label: 'All time' },
];

// Jobs that never reached the workshop floor are not part of a mechanic's work
const NOT_WORKED = new Set(['CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW']);
// Came-back rate only means something once there are enough jobs
const MIN_JOBS_FOR_RATE = 5;

interface TimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string | null;
  details: string | null;
}

interface MovedAway {
  ticket_code: string;
  timestamp: string;
  to: string;
}

const releasedAt = (t: InternalTicket) => t.paid_at || t.updated_at || t.created_at;

function customerLabel(t: InternalTicket): string {
  const name =
    t.customer_name && t.customer_name !== 'Rider Customer'
      ? t.customer_name
      : parseTicketNotes(t.notes).customerName || 'Customer';
  return t.is_walk_in ? `${name} (walk-in)` : name;
}

function motorcycleLabel(t: InternalTicket): string {
  const model = t.motorcycles?.model || 'Motorcycle';
  const plate = t.motorcycles?.plate_number;
  return plate && plate !== 'N/A' ? `${model} · ${plate}` : model;
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function periodStart(period: Period, now = new Date()): Date | null {
  if (period === 'MONTH') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'THREE_MONTHS') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  if (period === 'YEAR') return new Date(now.getFullYear(), 0, 1);
  return null;
}

/** The three most common values, e.g. "PMS · CVT Cleaning · Brakes" */
function topThree(values: string[]): string[] {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([v]) => v);
}

/**
 * Owner only (Team > Mechanics): every job one mechanic handled, as proof of who did
 * the work. Backjobs ("came back") count against the mechanic of the earlier job.
 */
export default function MechanicHistoryModal({ mechanic, tickets, currentStaffName, onClose }: MechanicHistoryModalProps) {
  const roster = useMechanicRoster();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('ALL');
  const [cameBackOnly, setCameBackOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, TimelineEntry[] | 'loading' | 'error'>>({});
  const [movedAway, setMovedAway] = useState<MovedAway[]>([]);
  const [printing, setPrinting] = useState(false);
  // Owner correction of a released job's mechanic
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctTo, setCorrectTo] = useState('');
  const [correctReason, setCorrectReason] = useState('');
  const [correcting, setCorrecting] = useState(false);

  // Every name this mechanic had: released jobs keep the name they were released under,
  // so jobs from before a rename still belong here
  const names = useMemo(() => mechanicKeys(mechanic), [mechanic]);
  const isMine = (name?: string | null) => names.has(mechanicKey(name));

  // Later jobs that point back at an earlier one (backjobs), by the earlier job's id
  const cameBack = useMemo(() => {
    const map = new Map<string, InternalTicket[]>();
    for (const t of tickets) {
      if (!t.backjob_of_ticket_id) continue;
      map.set(t.backjob_of_ticket_id, [...(map.get(t.backjob_of_ticket_id) || []), t]);
    }
    return map;
  }, [tickets]);
  const byId = useMemo(() => new Map(tickets.map((t) => [t.id, t])), [tickets]);

  const myJobs = useMemo(
    () => tickets.filter((t) => names.has(mechanicKey(t.assigned_mechanic)) && !NOT_WORKED.has(t.status)),
    [tickets, names]
  );
  const inShop = myJobs.filter((t) => t.status !== 'COMPLETED').sort((a, b) => b.created_at.localeCompare(a.created_at));
  const released = useMemo(
    () => myJobs.filter((t) => t.status === 'COMPLETED').sort((a, b) => releasedAt(b).localeCompare(releasedAt(a))),
    [myJobs]
  );

  // Summary (all time, so it does not change with the filters)
  const now = new Date();
  const thisMonth = released.filter((t) => {
    const d = new Date(releasedAt(t));
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const cameBackCount = released.filter((t) => cameBack.has(t.id)).length;
  const topServices = topThree(released.map((t) => t.service_type));
  const brands = topThree(released.map((t) => (t.motorcycles?.model || '').trim().split(/\s+/)[0] || ''));

  const shown = useMemo(() => {
    const start = periodStart(period);
    const q = search.trim().toLowerCase();
    return released.filter((t) => {
      if (start && new Date(releasedAt(t)) < start) return false;
      if (cameBackOnly && !cameBack.has(t.id)) return false;
      if (!q) return true;
      return [t.ticket_code, customerLabel(t), motorcycleLabel(t), t.service_type].some((f) =>
        (f || '').toLowerCase().includes(q)
      );
    });
  }, [released, period, search, cameBackOnly, cameBack]);

  // Jobs taken off this mechanic and given to someone else (from Activity Logs, owner only)
  useEffect(() => {
    let alive = true;
    db()
      .from('audit_logs')
      .select('ticket_code, timestamp, previous_value, new_value')
      .eq('action', 'MECHANIC_ASSIGNED')
      .order('timestamp', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (!alive || !data) return;
        const byCode = new Map(tickets.map((t) => [t.ticket_code, t]));
        const seen = new Set<string>();
        const list: MovedAway[] = [];
        for (const row of data as { ticket_code: string; timestamp: string; previous_value: string | null; new_value: string | null }[]) {
          if (!names.has(mechanicKey(row.previous_value)) || seen.has(row.ticket_code)) continue;
          const ticket = byCode.get(row.ticket_code);
          // Only jobs that are not his any more
          if (!ticket || names.has(mechanicKey(ticket.assigned_mechanic)) || NOT_WORKED.has(ticket.status)) continue;
          seen.add(row.ticket_code);
          list.push({ ticket_code: row.ticket_code, timestamp: row.timestamp, to: ticket.assigned_mechanic || 'no one' });
        }
        setMovedAway(list);
      });
    return () => {
      alive = false;
    };
  }, [names, tickets]);

  const toggleJob = (t: InternalTicket) => {
    const next = openId === t.id ? null : t.id;
    setOpenId(next);
    setCorrectingId(null);
    if (!next || timeline[t.id]) return;
    setTimeline((prev) => ({ ...prev, [t.id]: 'loading' }));
    db()
      .from('audit_logs')
      .select('id, timestamp, action, actor, details')
      .eq('ticket_code', t.ticket_code)
      .order('timestamp', { ascending: true })
      .then(({ data, error }) => {
        setTimeline((prev) => ({ ...prev, [t.id]: error ? 'error' : ((data || []) as TimelineEntry[]) }));
      });
  };

  const handleCorrect = async (t: InternalTicket) => {
    const reason = correctReason.trim();
    if (!correctTo || reason.length < 5) {
      toast.error('Pick the right mechanic and write the reason (at least 5 characters).');
      return;
    }
    setCorrecting(true);
    const { data, error } = await db()
      .from('service_tickets')
      .update({ assigned_mechanic: correctTo })
      .eq('id', t.id)
      .select('id');
    if (error || !data?.length) {
      setCorrecting(false);
      toast.error(error?.message || 'The mechanic could not be changed. Refresh and try again.');
      return;
    }
    await recordAuditLog({
      ticketCode: t.ticket_code,
      action: 'MECHANIC_CORRECTED',
      actor: currentStaffName,
      details: `Released job's mechanic corrected from ${t.assigned_mechanic || mechanic.name} to ${correctTo}. Reason: ${reason}`,
      previousValue: t.assigned_mechanic || mechanic.name,
      newValue: correctTo,
    });
    broadcastTicketSync({ id: t.id, action: 'mechanic_corrected' });
    setCorrecting(false);
    setCorrectingId(null);
    setCorrectReason('');
    setOpenId(null);
    toast.success(`#${t.ticket_code} now shows ${correctTo}.`);
  };

  const periodLabel = PERIODS.find((p) => p.value === period)?.label || 'All time';
  const referenceNo = `MR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${mechanic.name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')}`;

  const renderTimeline = (t: InternalTicket) => {
    const entries = timeline[t.id];
    const backjobOf = t.backjob_of_ticket_id ? byId.get(t.backjob_of_ticket_id) : undefined;
    const returns = cameBack.get(t.id) || [];
    return (
      <div className="px-4 sm:px-5 pb-4 pt-1 space-y-3">
        {(backjobOf || returns.length > 0) && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 space-y-0.5">
            {backjobOf && (
              <p>
                This job is a backjob of <span className="font-mono">{backjobOf.ticket_code}</span>
                {backjobOf.assigned_mechanic ? ` (mechanic ${backjobOf.assigned_mechanic})` : ''}.
              </p>
            )}
            {returns.map((r) => (
              <p key={r.id}>
                Came back: <span className="font-mono">{r.ticket_code}</span> on {formatDay(r.created_at)} ({r.service_type}).
              </p>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Timeline</p>
          {entries === 'loading' || entries === undefined ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : entries === 'error' ? (
            <p className="text-sm text-rose-600">The timeline could not be loaded.</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-400">No recorded steps for this job.</p>
          ) : (
            <ol className="space-y-1.5 border-l-2 border-slate-100 pl-3.5">
              {entries.map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="text-slate-400 tabular-nums">{formatTime(e.timestamp)}</span>{' '}
                  <span className="font-semibold text-slate-800">{actionLabel(e.action)}</span>
                  {e.actor && <span className="text-slate-500"> · {e.actor}</span>}
                  {e.details && <p className="text-slate-500 break-words">{e.details}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>

        {t.status === 'COMPLETED' &&
          (correctingId === t.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCorrect(t);
              }}
              className="rounded-2xl border border-slate-200 p-3.5 space-y-2"
            >
              <p className="text-sm font-semibold text-slate-800">Correct the mechanic of this released job</p>
              <label htmlFor={`correct-to-${t.id}`} className="sr-only">
                Right mechanic
              </label>
              <select
                id={`correct-to-${t.id}`}
                value={correctTo}
                onChange={(e) => setCorrectTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="">Who really did this job?</option>
                {roster.mechanics
                  .filter((m) => m.id !== mechanic.id && !isMine(m.name))
                  .map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                      {m.active ? '' : ' (resigned)'}
                    </option>
                  ))}
              </select>
              <label htmlFor={`correct-reason-${t.id}`} className="sr-only">
                Reason
              </label>
              <input
                id={`correct-reason-${t.id}`}
                value={correctReason}
                maxLength={200}
                onChange={(e) => setCorrectReason(e.target.value)}
                placeholder="Reason (kept in Activity Logs)"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectingId(null)}
                  className="h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correcting}
                  className="h-9 px-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {correcting ? 'Saving…' : 'Save correction'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCorrectingId(t.id);
                setCorrectTo('');
                setCorrectReason('');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-orange-700 cursor-pointer"
            >
              Wrong mechanic? Correct it
            </button>
          ))}
      </div>
    );
  };

  const renderJob = (t: InternalTicket, isInShop: boolean) => {
    const open = openId === t.id;
    const returned = cameBack.has(t.id);
    return (
      <li key={t.id}>
        <button
          type="button"
          onClick={() => toggleJob(t)}
          aria-expanded={open}
          className="w-full text-left px-4 sm:px-5 py-3 hover:bg-slate-50/70 transition cursor-pointer grid grid-cols-[auto_1fr_auto] items-start gap-3"
        >
          <span className="w-16 text-sm tabular-nums text-slate-500 pt-0.5">
            {isInShop ? 'In shop' : formatDay(releasedAt(t))}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-slate-900">{t.service_type}</span>
              {returned && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">Came back</span>
              )}
              {t.backjob_of_ticket_id && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">Backjob</span>
              )}
            </span>
            <span className="block text-sm text-slate-500 truncate">
              {customerLabel(t)} · {motorcycleLabel(t)}
            </span>
            <span className="block text-xs text-slate-400 font-mono">
              {t.ticket_code}
              {isInShop && <span className="font-sans"> · Stage {t.stage} {stageName(t.stage)}</span>}
            </span>
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 mt-1 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && renderTimeline(t)}
      </li>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <ScrollLock />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mechanic-history-title"
        className="bg-white w-full max-w-3xl rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> Service history
            </p>
            <h2 id="mechanic-history-title" className="font-display text-xl font-bold tracking-tight text-slate-900 truncate">
              {mechanic.name}
            </h2>
            {(mechanic.previousNames.length > 0 || !mechanic.active) && (
              <p className="text-xs text-slate-500">
                {!mechanic.active && <span className="font-semibold">Resigned</span>}
                {!mechanic.active && mechanic.previousNames.length > 0 && ' · '}
                {mechanic.previousNames.length > 0 && `Earlier name: ${mechanic.previousNames.join(', ')}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPrinting(true)}
              className="h-10 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print record
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {/* Summary: fair numbers, no speed comparison */}
          <div className="px-5 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-500">Jobs done</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{released.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">This month</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{thisMonth}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Came back</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {cameBackCount}
                {released.length >= MIN_JOBS_FOR_RATE && (
                  <span className="text-sm font-semibold text-slate-400">
                    {' '}
                    ({Math.round((cameBackCount / released.length) * 100)}%)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">In the shop now</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{inShop.length}</p>
            </div>
            {(topServices.length > 0 || brands.length > 0) && (
              <div className="col-span-2 sm:col-span-4 text-sm text-slate-600 space-y-0.5">
                {topServices.length > 0 && (
                  <p>
                    <span className="text-slate-400">Most done:</span> {topServices.join(' · ')}
                  </p>
                )}
                {brands.length > 0 && (
                  <p>
                    <span className="text-slate-400">Brands handled:</span> {brands.join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* In the shop now */}
          {inShop.length > 0 && (
            <div className="border-b border-slate-100">
              <p className="px-5 sm:px-6 pt-3 text-xs font-semibold text-slate-500">In the shop now ({inShop.length})</p>
              <ul className="divide-y divide-slate-100">{inShop.map((t) => renderJob(t, true))}</ul>
            </div>
          )}

          {/* Filters */}
          <div className="px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-100">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, plate, ticket or service"
                aria-label="Search released jobs"
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
              />
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              aria-label="Period"
              className="bg-slate-50 border border-slate-200 rounded-full px-3.5 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cameBackOnly}
                onChange={(e) => setCameBackOnly(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              Came back only
            </label>
          </div>

          {/* Released jobs */}
          <p className="px-5 sm:px-6 pt-3 text-xs font-semibold text-slate-500">
            Released jobs ({shown.length}
            {shown.length !== released.length ? ` of ${released.length}` : ''})
          </p>
          <ul className="divide-y divide-slate-100">
            {shown.map((t) => renderJob(t, false))}
            {shown.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-slate-500">
                {released.length === 0 ? `${mechanic.name} has no released jobs yet.` : 'No released jobs match these filters.'}
              </li>
            )}
          </ul>

          {/* Jobs moved to another mechanic */}
          {movedAway.length > 0 && (
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500">Moved to another mechanic ({movedAway.length})</p>
              <ul className="space-y-1">
                {movedAway.map((m) => (
                  <li key={m.ticket_code} className="text-sm text-slate-600">
                    <span className="font-mono">{m.ticket_code}</span> · moved to {m.to} on {formatDay(m.timestamp)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {printing && (
        <PrintPreviewModal
          title="Mechanic service record"
          description={`${mechanic.name} · ${periodLabel}`}
          printLabel="Print record"
          onClose={() => setPrinting(false)}
        >
          <MechanicServiceRecordDocument
            mechanicName={
              mechanic.previousNames.length > 0
                ? `${mechanic.name} (earlier name: ${mechanic.previousNames.join(', ')})`
                : mechanic.name
            }
            periodLabel={periodLabel}
            referenceNo={referenceNo}
            cameBackCount={shown.filter((t) => cameBack.has(t.id)).length}
            rows={shown.map((t) => ({
              ticket_code: t.ticket_code,
              releasedAt: releasedAt(t),
              customer: customerLabel(t),
              motorcycle: motorcycleLabel(t),
              service: t.service_type,
              cameBack: cameBack.get(t.id)?.[0]?.ticket_code ?? null,
            }))}
          />
        </PrintPreviewModal>
      )}
    </div>,
    document.body
  );
}

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Edit3, Plus, UserCheck, UserX, Wrench, X } from '../../components/icons';
import { toast } from '../utils/toast';
import { InternalTicket } from '../types/internal';
import MechanicHistoryModal from '../modals/MechanicHistoryModal';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { broadcastTicketSync } from '../../lib/realtimeSync';
import {
  addMechanicsToRoster,
  cleanMechanicName,
  hasAttendanceToday,
  ignoreNames,
  isInToday,
  isMechanicName,
  isOnTheFloor,
  loadOf,
  MECHANIC_NAME_MAX,
  mechanicKey,
  mechanicLoads,
  mechanicNameError,
  MechanicRoster,
  namesNotOnRoster,
  renameInRoster,
  renameMechanicOnOpenTickets,
  saveMechanicRoster,
  setInToday,
  todayKey,
  useMechanicRoster,
  WorkshopMechanic,
} from '../../utils/workshopMechanics';

interface MechanicsCardProps {
  tickets: InternalTicket[];
  currentStaffName: string;
}

const BTN =
  'h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed';
const PRIMARY =
  'h-10 px-4 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed';

const jobsLine = (active: number, done: number) =>
  `${active === 0 ? 'No job now' : `${active} job${active === 1 ? '' : 's'} now`} · ${done} done`;

/**
 * Team page (owner): the mechanics staff can pick when they assign a job.
 * Mechanics don't sign in, so they have no account, email or password.
 */
export default function MechanicsCard({ tickets, currentStaffName }: MechanicsCardProps) {
  const roster = useMechanicRoster();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newNames, setNewNames] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [historyOf, setHistoryOf] = useState<WorkshopMechanic | null>(null);
  // The mechanic whose "Resigned" confirmation is open
  const [resigningId, setResigningId] = useState<string | null>(null);
  const [showFormer, setShowFormer] = useState(false);

  const loads = useMemo(() => mechanicLoads(tickets), [tickets]);
  const foundNames = useMemo(() => namesNotOnRoster(tickets, roster), [tickets, roster]);
  // Hidden names still written on some ticket (once those tickets are gone, there is nothing to show again)
  const hiddenCount = useMemo(() => {
    const onTickets = new Set(tickets.map((t) => mechanicKey(t.assigned_mechanic)));
    return roster.ignoredNames.filter((n) => onTickets.has(n)).length;
  }, [tickets, roster]);
  const active = roster.mechanics.filter((m) => m.active);
  const turnedOff = roster.mechanics.filter((m) => !m.active);
  const attendanceTaken = hasAttendanceToday(roster);
  const inTodayCount = active.filter((m) => isInToday(roster, m.id)).length;
  const todayLabel = new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

  const save = async (next: MechanicRoster, log?: { action: string; details: string; previousValue?: string; newValue?: string }) => {
    setBusy(true);
    const result = await saveMechanicRoster(next, currentStaffName);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error || 'The mechanic list could not be saved. Refresh and try again.');
      return false;
    }
    if (log) await recordAuditLog({ ticketCode: 'STAFF', actor: currentStaffName, ...log });
    return true;
  };

  const handleAdd = async (names: string[]) => {
    const { next, added, skipped } = addMechanicsToRoster(roster, names);
    if (added.length === 0) {
      toast.error(skipped[0]?.reason || 'Enter at least one name.');
      return;
    }
    const ok = await save(next, {
      action: 'MECHANIC_ADDED',
      details: `Added to the mechanic list: ${added.join(', ')}.`,
      newValue: added.join(', '),
    });
    if (!ok) return;
    setNewNames('');
    setAdding(false);
    toast.success(`Added ${added.length} mechanic${added.length === 1 ? '' : 's'}.`);
    if (skipped.length > 0) {
      toast.info(`Skipped: ${skipped.map((s) => `${s.name} (${s.reason})`).join(' ')}`);
    }
  };

  const startEdit = (m: WorkshopMechanic) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditError(null);
  };

  const handleRename = async (m: WorkshopMechanic) => {
    const name = cleanMechanicName(editName);
    if (name === m.name) {
      setEditingId(null);
      return;
    }
    // Only a change in capital letters is fine; anything else must pass the usual checks
    const error = mechanicKey(name) === mechanicKey(m.name) ? null : mechanicNameError(name, roster, m.id);
    if (error) {
      setEditError(error);
      return;
    }
    // The old name is kept so released jobs under it stay in this mechanic's history
    const next = renameInRoster(roster, m.id, name);
    const ok = await save(next, {
      action: 'MECHANIC_RENAMED',
      details: `Renamed mechanic ${m.name} to ${name}.`,
      previousValue: m.name,
      newValue: name,
    });
    if (!ok) return;
    setEditingId(null);

    // Open jobs show the new name; released tickets keep the old one
    const renamed = await renameMechanicOnOpenTickets(m.name, name);
    if (!renamed.success) {
      toast.error(`Renamed on the list, but open jobs still show ${m.name}: ${renamed.error}`);
      return;
    }
    if (renamed.count > 0) broadcastTicketSync({ action: 'mechanic_renamed' });
    toast.success(
      renamed.count > 0
        ? `Renamed. ${renamed.count} open job${renamed.count === 1 ? '' : 's'} now show ${name}.`
        : `Renamed to ${name}.`
    );
  };

  // Open jobs (not yet Ready) still under this mechanic, so the owner can reassign them
  const openJobsOf = (m: WorkshopMechanic) =>
    tickets.filter((t) => isOnTheFloor(t) && isMechanicName(m, t.assigned_mechanic));

  // Resigned or left the shop: off the pick list, service history kept (never deleted)
  const handleResign = async (m: WorkshopMechanic) => {
    const next = {
      ...roster,
      mechanics: roster.mechanics.map((x) => (x.id === m.id ? { ...x, active: false } : x)),
      presentIds: roster.presentIds.filter((id) => id !== m.id),
    };
    const ok = await save(next, {
      action: 'MECHANIC_TURNED_OFF',
      details: `${m.name} resigned and was taken off the mechanic list. Their service history is kept.`,
    });
    if (!ok) return;
    setResigningId(null);
    const jobs = openJobsOf(m).length;
    if (jobs > 0) {
      toast.info(`${m.name} still has ${jobs} open job${jobs === 1 ? '' : 's'}. Reassign them in the Queue.`);
    } else {
      toast.success(`${m.name} is now under Former mechanics.`);
    }
  };

  const handleBringBack = async (m: WorkshopMechanic) => {
    const next = { ...roster, mechanics: roster.mechanics.map((x) => (x.id === m.id ? { ...x, active: true } : x)) };
    const ok = await save(next, {
      action: 'MECHANIC_TURNED_ON',
      details: `${m.name} is back on the mechanic list.`,
    });
    if (ok) toast.success(`${m.name} is back on the mechanic list.`);
  };

  const handleToggleToday = (m: WorkshopMechanic) => save(setInToday(roster, m.id, !isInToday(roster, m.id)));

  const handleAllIn = () =>
    save({ ...roster, presentDate: todayKey(), presentIds: active.map((m) => m.id) });

  const handleClearToday = () => save({ ...roster, presentDate: todayKey(), presentIds: [] });

  // Names on old tickets that are not mechanics (tests, typos): hide them; tickets stay as they are
  const handleIgnore = async (names: string[]) => {
    const ok = await save(ignoreNames(roster, names));
    if (ok) toast.success(names.length === 1 ? `${names[0]} is hidden.` : `${names.length} names are hidden.`);
  };

  const handleShowIgnored = async () => {
    const ok = await save({ ...roster, ignoredNames: [] });
    if (ok) toast.success('Hidden names are shown again.');
  };

  const pastedNames = newNames.split(/\r?\n/).map(cleanMechanicName).filter(Boolean);

  const renderRow = (m: WorkshopMechanic) => {
    const load = loadOf(loads, m);
    const here = isInToday(roster, m.id);
    const isEditing = editingId === m.id;
    const isResigning = resigningId === m.id;
    const openJobs = isResigning ? openJobsOf(m) : [];
    return (
      <li key={m.id} className={`px-4 sm:px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ${m.active ? '' : 'bg-slate-50/60'}`}>
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
              m.active ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
            }`}
            aria-hidden="true"
          >
            {m.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRename(m);
                }}
                className="space-y-1.5"
              >
                <label htmlFor={`mech-${m.id}`} className="sr-only">
                  New name for {m.name}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id={`mech-${m.id}`}
                    autoFocus
                    value={editName}
                    maxLength={MECHANIC_NAME_MAX}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setEditError(null);
                    }}
                    className="flex-1 min-w-[12rem] bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                  />
                  <button type="submit" disabled={busy} className={BTN}>
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className={BTN}>
                    Cancel
                  </button>
                </div>
                {editError ? (
                  <p className="text-xs text-rose-600">{editError}</p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Only to fix the name of the same person. For a new mechanic, use Add mechanics. Past jobs stay in
                    the service history.
                  </p>
                )}
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <button
                    type="button"
                    onClick={() => setHistoryOf(m)}
                    className={`text-[15px] font-semibold truncate underline decoration-slate-300 underline-offset-4 hover:decoration-orange-500 hover:text-orange-700 cursor-pointer text-left ${
                      m.active ? 'text-slate-900' : 'text-slate-500'
                    }`}
                    title={`Open ${m.name}'s service history`}
                  >
                    {m.name}
                  </button>
                  {m.active && attendanceTaken && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${here ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${here ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {here ? 'In today' : 'Day off'}
                    </span>
                  )}
                  {!m.active && <span className="text-[11px] font-semibold text-slate-500">Resigned</span>}
                </div>
                {m.previousNames.length > 0 && (
                  <p className="text-xs text-slate-400">Earlier name: {m.previousNames.join(', ')}</p>
                )}
                <p className="mt-0.5 text-sm text-slate-500">
                  {jobsLine(load.active, load.done)} ·{' '}
                  <button
                    type="button"
                    onClick={() => setHistoryOf(m)}
                    className="font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    Service history
                  </button>
                </p>
              </>
            )}
          </div>
        </div>

        {!isEditing && !isResigning && (
          <div className="flex flex-wrap gap-2 md:justify-end md:shrink-0 pl-14 md:pl-0">
            {m.active && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleToggleToday(m)}
                aria-pressed={here}
                className={`h-9 px-3.5 rounded-full border text-sm font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                  here
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {here && <Check className="w-3.5 h-3.5" />}
                {here ? 'In today' : 'Mark in today'}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => startEdit(m)} className={BTN}>
              <Edit3 className="w-3.5 h-3.5" />
              Rename
            </button>
            {m.active ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditingId(null);
                  setResigningId(m.id);
                }}
                className="h-9 px-3.5 rounded-full border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-sm font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" />
                Resigned
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleBringBack(m)}
                className="h-9 px-3.5 rounded-full border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Bring back
              </button>
            )}
          </div>
        )}

        {isResigning && (
          <div
            role="group"
            aria-label={`Mark ${m.name} as resigned`}
            className="w-full md:max-w-md md:ml-auto rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 space-y-2"
          >
            <p className="text-sm font-semibold text-slate-900">Mark {m.name} as resigned?</p>
            <p className="text-sm text-slate-600">
              Staff won&apos;t see {m.name} when assigning jobs. The service history stays, and you can bring them
              back any time.
            </p>
            {openJobs.length > 0 && (
              <p className="text-sm text-amber-800 flex gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Still has {openJobs.length} open job{openJobs.length === 1 ? '' : 's'}:{' '}
                  <span className="font-mono">{openJobs.map((t) => `#${t.ticket_code}`).join(', ')}</span>. Reassign
                  them in the Queue after this.
                </span>
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setResigningId(null)} className={BTN}>
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleResign(m)}
                className="h-9 px-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" />
                Yes, mark as resigned
              </button>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-orange-500" />
            Mechanics
          </h2>
          <p className="text-sm text-slate-500">Mechanics don’t sign in. Staff pick them when they assign a job.</p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={`${PRIMARY} self-start sm:self-auto`}>
            <Plus className="w-4 h-4" />
            Add mechanics
          </button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd(pastedNames);
          }}
          className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 space-y-2"
        >
          <label htmlFor="new-mechanics" className="text-sm font-semibold text-slate-800 block">
            Names, one per line
          </label>
          <textarea
            id="new-mechanics"
            autoFocus
            rows={4}
            value={newNames}
            onChange={(e) => setNewNames(e.target.value)}
            placeholder={'Juan Dela Cruz\nPedro Santos'}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-xs text-slate-400">Names already on the list are skipped.</span>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewNames('');
              }}
              className={BTN}
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button type="submit" disabled={busy || pastedNames.length === 0} className={PRIMARY}>
              {pastedNames.length > 1 ? `Add ${pastedNames.length} mechanics` : 'Add mechanic'}
            </button>
          </div>
        </form>
      )}

      {active.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Today, {todayLabel}:</span>{' '}
            {attendanceTaken
              ? `${inTodayCount} of ${active.length} in. Staff see them first when assigning.`
              : 'No one marked yet, so staff see every mechanic.'}
          </p>
          <div className="flex gap-2 shrink-0">
            <button type="button" disabled={busy} onClick={handleAllIn} className={BTN}>
              Everyone in
            </button>
            {attendanceTaken && (
              <button type="button" disabled={busy} onClick={handleClearToday} className={BTN}>
                Clear today
              </button>
            )}
          </div>
        </div>
      )}

      <ul className="divide-y divide-slate-100">
        {active.map(renderRow)}
        {active.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-slate-500">
            {turnedOff.length === 0
              ? 'No mechanics yet. Add them so staff can pick a name instead of typing it.'
              : 'No current mechanics. Add new ones, or bring someone back from Former mechanics.'}
          </li>
        )}
      </ul>

      {/* Resigned mechanics: off the pick list, service history kept */}
      {turnedOff.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFormer((v) => !v)}
            aria-expanded={showFormer}
            aria-controls="former-mechanics"
            className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition cursor-pointer"
          >
            <span className="text-sm font-semibold text-slate-700">
              Former mechanics <span className="font-medium text-slate-400">({turnedOff.length})</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFormer ? 'rotate-180' : ''}`} />
          </button>
          {showFormer && (
            <ul id="former-mechanics" className="divide-y divide-slate-100 border-t border-slate-100">
              {turnedOff.map(renderRow)}
            </ul>
          )}
        </div>
      )}

      {foundNames.length > 0 && (
        <div className="px-4 sm:px-5 py-4 border-t border-slate-100 bg-amber-50/50 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Typed on tickets, not on the list.</span> Add the real mechanics and
              ignore the rest. The tickets themselves are not changed.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleIgnore(foundNames.map((f) => f.name))}
              className={`${BTN} self-start shrink-0`}
            >
              <X className="w-3.5 h-3.5" />
              Ignore all
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {foundNames.slice(0, 12).map((f) => (
              <li
                key={f.name}
                className="h-9 pl-1 pr-1 rounded-full border border-amber-200 bg-white flex items-center text-sm text-slate-700"
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleAdd([f.name])}
                  className="h-7 pl-2.5 pr-2 rounded-full hover:bg-amber-50 font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title={`Add ${f.name} to the mechanic list (used on ${f.tickets} ticket${f.tickets === 1 ? '' : 's'})`}
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  {f.name}
                  <span className="text-xs text-slate-400">({f.tickets})</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleIgnore([f.name])}
                  className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer flex items-center justify-center disabled:opacity-50"
                  title={`Ignore ${f.name}: not a mechanic`}
                  aria-label={`Ignore ${f.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {historyOf && (
        <MechanicHistoryModal
          mechanic={historyOf}
          tickets={tickets}
          currentStaffName={currentStaffName}
          onClose={() => setHistoryOf(null)}
        />
      )}

      {hiddenCount > 0 && (
        <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
          <span>
            {hiddenCount} name{hiddenCount === 1 ? '' : 's'} from old tickets hidden.
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={handleShowIgnored}
            className="font-semibold text-orange-600 hover:text-orange-700 cursor-pointer disabled:opacity-50"
          >
            Show again
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { UserRole, AuditLogEntry } from '../types/internal';
import { canViewAuditLogs } from '../utils/permissions';
import { fetchDatabaseAuditLogs } from '../utils/databaseAuditLogger';
import { Check, ChevronDown, Download, Search, ShieldAlert, RefreshCw } from '../../components/icons';
import { PrintDocument, PrintFields, PrintPreviewModal } from '../../components/print/PrintTemplate';
import { toast } from '../utils/toast';

interface InternalAuditTabProps {
  currentRole: UserRole;
}

type AuditDateFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'PAST_7_DAYS' | 'THIS_MONTH';

const PAGE_SIZE = 25;

/** fetchDatabaseAuditLogs only loads this many (newest first) */
const LOG_LIMIT = 300;

const DATE_FILTERS: { value: AuditDateFilter; label: string }[] = [
  { value: 'ALL', label: 'All dates' },
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'PAST_7_DAYS', label: 'Last 7 days' },
  { value: 'THIS_MONTH', label: 'This month' },
];

/** Plain words for every action the app logs (the exact codes stay in the database) */
const ACTION_LABELS: Record<string, string> = {
  NEW_BOOKING: 'New online booking',
  BOOKING_CONFIRMED: 'Accepted a booking',
  BOOKING_DECLINED: 'Declined a booking',
  TICKET_RESCHEDULED: 'Rescheduled a booking',
  BOOKINGS_EXPIRED_MISSED: 'Marked bookings as missed',
  RIDER_CHECKIN: 'Checked in a motorcycle',
  LATE_CHECKIN_OVERRIDE: 'Allowed a late check-in',
  WALK_IN_TICKET_CREATED: 'Created a walk-in ticket',
  BAY_ASSIGNMENT: 'Put a motorcycle on a bay',
  MECHANIC_ASSIGNED: 'Assigned a mechanic',
  STAGE_ADVANCE: 'Moved to the next stage',
  STAGE_ADVANCED: 'Moved to the next stage',
  STAGE_CHANGE: 'Changed the repair stage',
  VEHICLE_RELEASED: 'Released a motorcycle',
  TICKET_CANCELLED: 'Cancelled a ticket',
  CANCELLED: 'Cancelled a ticket',
  BAY_ADDED: 'Added a bay',
  BAY_REMOVED: 'Removed a bay',
  STAFF_HIRED: 'Added a staff account',
  STAFF_UPDATED: 'Edited a staff account',
  STAFF_ACTIVATED: 'Turned on a staff account',
  STAFF_DEACTIVATED: 'Turned off a staff account',
  PASSWORD_RESET_DISPATCHED: 'Sent a password reset',
  PASSWORD_RESET_SUCCESS: 'Password was reset',
  PASSWORD_CHANGED: 'Changed their own password',
  EMAIL_VERIFIED_SUCCESS: 'Confirmed a staff email',
  REVIEW_SUBMITTED: 'Rider left a review',
  REVIEW_PUBLISHED: 'Showed a review on the website',
  REVIEW_HIDDEN: 'Hid a review',
  REVIEW_REPLIED: 'Replied to a review',
  REVIEW_REPLY_REMOVED: 'Removed a review reply',
  SERVICE_UPDATED: 'Edited a service',
  PHONE_CHANGE_APPROVED: 'Changed a rider’s mobile number',
  PHONE_CHANGE_DECLINED: 'Declined a number change',
};

/** Unknown code: "SOME_NEW_ACTION" -> "Some new action" */
function actionLabel(code: string): string {
  return ACTION_LABELS[code] || code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');
}

// Codes that aren't a real ticket (logged against the shop, a profile, or the system)
const NON_TICKET_CODES = new Set(['SYSTEM', 'WORKSHOP', 'PROFILE', 'STAFF', 'SETTINGS', '']);

function ticketLabel(code?: string): string {
  return code && !NON_TICKET_CODES.has(code.toUpperCase()) ? code : '—';
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    // The year only when it isn't this year
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

/** The PDF always shows the year, in Philippine time */
function formatPaperDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPaperTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
}

/** "+63917… → +63998…", only when it adds something the details don't already say */
function changeText(log: AuditLogEntry): string | null {
  const clean = (v?: string) => {
    const t = (v || '').trim();
    // Skip blanks and internal status codes like IN_PROGRESS
    return t && t !== '-' && t.toLowerCase() !== 'none' && !/^[A-Z_]+$/.test(t) ? t : null;
  };
  const before = clean(log.previousValue);
  const after = clean(log.newValue);
  if (!before || !after || before === after) return null;
  if (log.details.includes(before) && log.details.includes(after)) return null;
  return `${before} → ${after}`;
}

const CARD = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';

/** Small round initial, same look as the Team tab */
function ActorAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white text-xs font-bold flex items-center justify-center shrink-0"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function TicketPill({ code }: { code?: string }) {
  const label = ticketLabel(code);
  if (label === '—') return <span className="text-slate-400">—</span>;
  return (
    <span className="inline-block max-w-full px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold tabular-nums whitespace-nowrap truncate align-top">
      {label}
    </span>
  );
}

/** Pill-shaped dropdown, used instead of the browser's plain select */
function FilterDropdown({
  label,
  value,
  options,
  onChange,
  alignRight = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  alignRight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0 md:w-44">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-11 pl-4 pr-3 rounded-full bg-slate-50 border text-sm font-medium text-slate-800 flex items-center justify-between gap-2 transition cursor-pointer focus:outline-none focus-visible:bg-white focus-visible:border-orange-500 focus-visible:ring-4 focus-visible:ring-orange-500/10 ${
          open ? 'bg-white border-orange-500 ring-4 ring-orange-500/10' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className={`absolute z-20 mt-2 w-56 max-w-[calc(100vw-3rem)] max-h-64 overflow-y-auto overscroll-contain p-1.5 bg-white border border-slate-200/80 rounded-2xl card-elevated animate-in fade-in slide-in-from-top-1 duration-150 ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-left text-sm transition cursor-pointer ${
                  isSelected ? 'bg-orange-50 font-semibold text-orange-700' : 'font-medium text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** The PDF: the same letterhead as every other MotoCare document */
function ActivityLogDocument({
  logs,
  period,
  staff,
  search,
  reportNo,
  limited,
}: {
  logs: AuditLogEntry[];
  period: string;
  staff: string;
  search: string;
  reportNo: string;
  limited: boolean;
}) {
  // Logs are newest first
  const newest = logs[0];
  const oldest = logs[logs.length - 1];
  const newestDay = newest ? formatPaperDay(newest.timestamp) : '';
  const oldestDay = oldest ? formatPaperDay(oldest.timestamp) : '';

  return (
    <PrintDocument
      title="Activity Logs"
      numberLabel="Report no."
      number={reportNo}
      issuedLabel="Generated"
      footnote={
        <>
          Internal record for the shop owner. It may include rider names and mobile numbers, so keep it private.
          {limited && ` Only the newest ${LOG_LIMIT} entries are included.`}
        </>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <PrintFields
          fields={[
            { label: 'Period', value: period },
            { label: 'Staff', value: staff },
            { label: 'Dates covered', value: oldestDay === newestDay ? newestDay : `${oldestDay} to ${newestDay}` },
            { label: 'Total entries', value: String(logs.length) },
            ...(search ? [{ label: 'Search', value: search, wide: true }] : []),
          ]}
        />
      </div>

      {/* Not inside PrintSection: a long table has to be able to continue on the next page */}
      <table className="print-doc__table" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ width: '15%' }}>Date &amp; time</th>
            <th style={{ width: '18%' }}>Staff</th>
            <th>Activity</th>
            <th style={{ width: '17%' }}>Ticket</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const change = changeText(log);
            return (
              <tr key={log.id}>
                <td>
                  {formatPaperDay(log.timestamp)}
                  <br />
                  {formatPaperTime(log.timestamp)}
                </td>
                <td style={{ overflowWrap: 'anywhere' }}>{log.actor || 'System'}</td>
                <td style={{ overflowWrap: 'anywhere' }}>
                  <strong>{actionLabel(log.action)}</strong>
                  {log.details && <div>{log.details}</div>}
                  {change && <div>{change}</div>}
                </td>
                <td style={{ overflowWrap: 'anywhere' }}>{ticketLabel(log.ticketCode)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </PrintDocument>
  );
}

export default function InternalAuditTab({ currentRole }: InternalAuditTabProps) {
  // Permission Guard: Shop Owner Only
  if (!canViewAuditLogs(currentRole)) {
    return (
      <div className={`${CARD} p-8 text-center space-y-3`}>
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-slate-900">Only the shop owner can see this</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">Activity Logs show who did what in the console.</p>
      </div>
    );
  }

  return <AuditTrail />;
}

function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<AuditDateFilter>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // The spinner starts on (initial load) or from the Refresh button
  const loadLogs = useCallback(() => {
    return fetchDatabaseAuditLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);
  const refreshLogs = () => {
    setLoading(true);
    loadLogs();
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('motocare_audit_updated', loadLogs);
    return () => window.removeEventListener('motocare_audit_updated', loadLogs);
  }, [loadLogs]);

  // Distinct Staff Actors
  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.actor && l.actor.trim()) set.add(l.actor.trim());
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtering, newest first
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    return logs
      .filter((log) => {
        const logDate = new Date(log.timestamp);
        if (dateFilter === 'TODAY' && logDate.toDateString() !== todayStr) return false;
        if (dateFilter === 'YESTERDAY') {
          const yest = new Date(now);
          yest.setDate(yest.getDate() - 1);
          if (logDate.toDateString() !== yest.toDateString()) return false;
        }
        if (dateFilter === 'PAST_7_DAYS') {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (logDate < weekAgo) return false;
        }
        if (dateFilter === 'THIS_MONTH') {
          if (logDate.getFullYear() !== now.getFullYear() || logDate.getMonth() !== now.getMonth()) return false;
        }

        if (actorFilter !== 'ALL' && log.actor.trim() !== actorFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            log.ticketCode.toLowerCase().includes(q) ||
            log.action.toLowerCase().includes(q) ||
            actionLabel(log.action).toLowerCase().includes(q) ||
            log.actor.toLowerCase().includes(q) ||
            log.details.toLowerCase().includes(q) ||
            (log.previousValue && log.previousValue.toLowerCase().includes(q)) ||
            (log.newValue && log.newValue.toLowerCase().includes(q))
          );
        }

        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, dateFilter, actorFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageLogs = filteredLogs.slice(firstIndex, firstIndex + PAGE_SIZE);
  const isLimited = logs.length >= LOG_LIMIT;

  // YYYY-MM-DD in Philippine time, for the report number and the PDF's file name
  const todayStamp = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  // The browser names the saved PDF after the page title
  useEffect(() => {
    if (!isExportOpen) return;
    const previousTitle = document.title;
    document.title = `MotoCare_Activity_Logs_${todayStamp}`;
    return () => {
      document.title = previousTitle;
    };
  }, [isExportOpen, todayStamp]);

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      toast.info('No activity to export with these filters.');
      return;
    }
    setIsExportOpen(true);
  };

  const emptyMessage = loading ? 'Loading activity…' : 'No activity found.';
  const countLabel = loading
    ? 'Loading…'
    : `${filteredLogs.length} ${filteredLogs.length === 1 ? 'entry' : 'entries'} · newest first`;

  return (
    <div className={CARD}>
      {/* Heading and actions */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Activity history</h2>
          <p className="text-sm text-slate-500">{countLabel}</p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshLogs}
            disabled={loading}
            className="h-11 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="h-11 px-3 sm:px-5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold whitespace-nowrap flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="px-4 sm:px-5 py-3 flex flex-col md:flex-row md:items-center gap-2.5 border-b border-slate-100">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search staff, ticket or action"
            aria-label="Search activity"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
          />
        </div>
        <div className="grid grid-cols-2 md:flex gap-2.5">
          <FilterDropdown
            label="Filter by date"
            value={dateFilter}
            options={DATE_FILTERS}
            onChange={(value) => {
              setDateFilter(value as AuditDateFilter);
              setPage(1);
            }}
          />
          <FilterDropdown
            label="Filter by staff"
            value={actorFilter}
            alignRight
            options={[{ value: 'ALL', label: 'All staff' }, ...uniqueActors.map((actor) => ({ value: actor, label: actor }))]}
            onChange={(value) => {
              setActorFilter(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Desktop and tablet: table */}
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-100 text-xs text-slate-500">
            <tr>
              <th scope="col" className="w-28 pl-5 pr-3 py-3 font-medium">Date</th>
              <th scope="col" className="w-40 lg:w-44 px-3 py-3 font-medium">Staff</th>
              <th scope="col" className="px-3 py-3 font-medium">Activity</th>
              <th scope="col" className="w-36 pl-3 pr-5 py-3 font-medium">Ticket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageLogs.map((log) => {
                const change = changeText(log);
                const actor = log.actor || 'System';
                return (
                  <tr key={log.id} className="align-top hover:bg-slate-50/70 transition-colors">
                    <td className="pl-5 pr-3 py-4 tabular-nums">
                      <p className="font-medium text-slate-800">{formatDay(log.timestamp)}</p>
                      <p className="text-xs text-slate-500">{formatTime(log.timestamp)}</p>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-start gap-2">
                        <ActorAvatar name={actor} />
                        <span className="min-w-0 pt-0.5 font-medium text-slate-800 break-words">{actor}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{actionLabel(log.action)}</p>
                      {log.details && <p className="mt-0.5 text-slate-500 break-words">{log.details}</p>}
                      {change && <p className="mt-0.5 text-slate-500 break-words tabular-nums">{change}</p>}
                    </td>
                    <td className="pl-3 pr-5 py-4">
                      <TicketPill code={log.ticketCode} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phone: same information as a simple list */}
      <ul className="md:hidden divide-y divide-slate-100">
        {pageLogs.length === 0 ? (
          <li className="px-4 py-14 text-center text-sm text-slate-500">{emptyMessage}</li>
        ) : (
          pageLogs.map((log) => {
            const change = changeText(log);
            const actor = log.actor || 'System';
            const hasTicket = ticketLabel(log.ticketCode) !== '—';
            return (
              <li key={log.id} className="px-4 py-4">
                <p className="text-[15px] font-semibold text-slate-900">{actionLabel(log.action)}</p>
                {log.details && <p className="mt-1 text-sm text-slate-600 break-words">{log.details}</p>}
                {change && <p className="mt-0.5 text-sm text-slate-600 break-words tabular-nums">{change}</p>}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ActorAvatar name={actor} />
                    <div className="min-w-0 leading-tight">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{actor}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {formatDay(log.timestamp)}, {formatTime(log.timestamp)}
                      </p>
                    </div>
                  </div>
                  {hasTicket && (
                    <span className="shrink-0">
                      <TicketPill code={log.ticketCode} />
                    </span>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Count and pages */}
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 border-t border-slate-100 text-sm text-slate-500">
        <span className="tabular-nums">
          {filteredLogs.length === 0
            ? '0 entries'
            : `${firstIndex + 1}–${firstIndex + pageLogs.length} of ${filteredLogs.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-9 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {isExportOpen && (
        <PrintPreviewModal
          title="Export PDF"
          description="Next, choose “Save as PDF” in the print window."
          printLabel="Save as PDF"
          onClose={() => setIsExportOpen(false)}
        >
          <ActivityLogDocument
            logs={filteredLogs}
            period={DATE_FILTERS.find((f) => f.value === dateFilter)?.label || 'All dates'}
            staff={actorFilter === 'ALL' ? 'All staff' : actorFilter}
            search={searchQuery.trim()}
            reportNo={`AL-${todayStamp.replace(/-/g, '')}`}
            limited={isLimited}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
}

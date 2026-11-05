import { useMemo, useState } from 'react';
import { InternalTicket } from '../types/internal';
import { lateCheckIn } from '../utils/ticketActions';
import { parseTicketNotes, formatPhoneNumber } from '../../utils/ticketNotesParser';
import { Printer, Search, X } from '../../components/icons';
import { toast } from '../utils/toast';

interface InternalHistoryTabProps {
  tickets: InternalTicket[];
  currentStaffName: string;
  onRefresh: () => void;
  /** Next step after a late check-in: put the motorcycle on a bay */
  onOpenDispatch: (ticket: InternalTicket) => void;
  onOpenJobOrderPrint: (ticket: InternalTicket) => void;
  onOpenReceiptPrint: (ticket: InternalTicket) => void;
}

type HistoryFilter = 'ALL' | 'RELEASED' | 'CANCELLED' | 'MISSED';

const PAGE_SIZE = 25;

const CARD = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';
const SMALL_BTN =
  'px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5';

function historyKind(t: InternalTicket): Exclude<HistoryFilter, 'ALL'> | null {
  if (t.status === 'COMPLETED') return 'RELEASED';
  if (t.status === 'CANCELLED' || t.status === 'CANCELLED_BY_ADMIN') return 'CANCELLED';
  if (t.status === 'MISSED' || t.status === 'NO_SHOW') return 'MISSED';
  return null;
}

/** When the ticket closed. A missed booking closed on the day it was booked for. */
function closedOn(t: InternalTicket): string {
  const kind = historyKind(t);
  if (kind === 'RELEASED') return t.paid_at || t.updated_at || t.created_at;
  if (kind === 'CANCELLED') return t.cancelled_at || t.updated_at || t.created_at;
  return t.dropoff_date ? `${t.dropoff_date}T00:00:00` : t.updated_at || t.created_at;
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

const STATUS_LOOK: Record<Exclude<HistoryFilter, 'ALL'>, { label: string; dot: string }> = {
  RELEASED: { label: 'Released', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', dot: 'bg-slate-400' },
  MISSED: { label: 'Missed', dot: 'bg-rose-500' },
};

/** Released motorcycles and closed bookings. Today's work stays in the Queue. */
export default function InternalHistoryTab({
  tickets,
  currentStaffName,
  onRefresh,
  onOpenDispatch,
  onOpenJobOrderPrint,
  onOpenReceiptPrint,
}: InternalHistoryTabProps) {
  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const closedTickets = useMemo(
    () =>
      tickets
        .filter((t) => historyKind(t) !== null)
        .sort((a, b) => new Date(closedOn(b)).getTime() - new Date(closedOn(a)).getTime()),
    [tickets]
  );

  const counts = useMemo(() => {
    const result = { ALL: closedTickets.length, RELEASED: 0, CANCELLED: 0, MISSED: 0 };
    closedTickets.forEach((t) => {
      const kind = historyKind(t);
      if (kind) result[kind] += 1;
    });
    return result;
  }, [closedTickets]);

  const shownTickets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return closedTickets.filter((t) => {
      if (filter !== 'ALL' && historyKind(t) !== filter) return false;
      if (!q) return true;
      return [
        t.ticket_code,
        t.customer_name,
        t.customer_phone,
        t.motorcycles?.model,
        t.motorcycles?.plate_number,
        t.assigned_mechanic,
        t.service_type,
      ].some((field) => (field || '').toLowerCase().includes(q));
    });
  }, [closedTickets, filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(shownTickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageTickets = shownTickets.slice(firstIndex, firstIndex + PAGE_SIZE);

  const handleLateCheckIn = async (ticket: InternalTicket) => {
    setUpdatingId(ticket.id);
    const result = await lateCheckIn(ticket, currentStaffName);
    setUpdatingId(null);
    if (!result.success) {
      toast.error(result.error || 'Failed to perform late check-in.');
      return;
    }
    onRefresh();
    onOpenDispatch({ ...ticket, stage: 1, status: 'IN_PROGRESS' });
  };

  const customerOf = (t: InternalTicket) => {
    const notes = parseTicketNotes(t.notes);
    const phone =
      t.customer_phone && !t.customer_phone.includes(',') && t.customer_phone !== 'N/A' ? t.customer_phone : notes.phone;
    return { name: t.customer_name || notes.customerName || 'Rider Customer', phone };
  };

  /** One line on what happened: who released it, or why it was cancelled */
  const detailOf = (t: InternalTicket): string | null => {
    const kind = historyKind(t);
    if (kind === 'RELEASED') return t.released_by ? `By ${t.released_by}` : null;
    if (kind === 'CANCELLED') return t.cancellation_reason || null;
    return 'The rider did not arrive';
  };

  const renderActions = (t: InternalTicket) => {
    const kind = historyKind(t);
    if (kind === 'RELEASED') {
      return (
        <>
          <button type="button" onClick={() => onOpenJobOrderPrint(t)} className={SMALL_BTN}>
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Job order
          </button>
          <button type="button" onClick={() => onOpenReceiptPrint(t)} className={SMALL_BTN}>
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            Gate pass
          </button>
        </>
      );
    }
    if (kind === 'MISSED') {
      return (
        <button
          type="button"
          disabled={updatingId === t.id}
          onClick={() => handleLateCheckIn(t)}
          className="px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
        >
          Late check-in
        </button>
      );
    }
    return null;
  };

  const renderStatus = (t: InternalTicket) => {
    const kind = historyKind(t);
    if (!kind) return null;
    const look = STATUS_LOOK[kind];
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium whitespace-nowrap">
        <span className={`w-1.5 h-1.5 rounded-full ${look.dot}`} />
        {look.label}
      </span>
    );
  };

  const emptyMessage = closedTickets.length === 0 ? 'Nothing here yet.' : 'No tickets match your search.';

  return (
    <div className={CARD}>
      {/* Search and filters */}
      <div className="p-4 sm:p-5 space-y-3 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ticket, customer, phone or plate"
            aria-label="Search history"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 bg-slate-50 border border-slate-200 rounded-full pl-10 pr-9 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter history">
          {(
            [
              ['ALL', 'All'],
              ['RELEASED', 'Released'],
              ['CANCELLED', 'Cancelled'],
              ['MISSED', 'Missed'],
            ] as const
          ).map(([id, label]) => {
            const selected = filter === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setFilter(id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition cursor-pointer ${
                  selected ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {label}
                <span className="text-xs tabular-nums opacity-70">{counts[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Big screens: table */}
      <div className="hidden xl:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-100 text-xs text-slate-500">
            <tr>
              <th scope="col" className="w-24 pl-5 pr-3 py-3 font-medium">Date</th>
              <th scope="col" className="px-3 py-3 font-medium">Motorcycle</th>
              <th scope="col" className="w-44 px-3 py-3 font-medium">Customer</th>
              <th scope="col" className="w-48 px-3 py-3 font-medium">Status</th>
              <th scope="col" className="w-64 pl-3 pr-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageTickets.map((t) => {
                const customer = customerOf(t);
                const detail = detailOf(t);
                return (
                  <tr key={t.id} className="align-top hover:bg-slate-50/70 transition-colors">
                    <td className="pl-5 pr-3 py-4 font-medium text-slate-800 tabular-nums">{formatDay(closedOn(t))}</td>
                    <td className="px-3 py-4 min-w-0">
                      <p className="font-semibold text-slate-900 break-words">{t.motorcycles?.model || 'Motorcycle'}</p>
                      <p className="text-xs text-slate-500 break-words">
                        <span className="font-mono">{t.motorcycles?.plate_number || 'No plate'}</span> · {t.service_type}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{t.ticket_code}</p>
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-medium text-slate-800 break-words">{customer.name}</p>
                      {customer.phone && (
                        <a href={`tel:${customer.phone}`} className="font-mono text-xs text-slate-500 hover:text-orange-600 transition">
                          {formatPhoneNumber(customer.phone)}
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      {renderStatus(t)}
                      {detail && <p className="mt-1 text-xs text-slate-500 break-words">{detail}</p>}
                    </td>
                    <td className="pl-3 pr-5 py-4">
                      <div className="flex flex-wrap justify-end gap-1.5">{renderActions(t)}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Phones and tablets: the same information as a list */}
      <ul className="xl:hidden divide-y divide-slate-100">
        {pageTickets.length === 0 ? (
          <li className="px-4 py-14 text-center text-sm text-slate-500">{emptyMessage}</li>
        ) : (
          pageTickets.map((t) => {
            const customer = customerOf(t);
            const detail = detailOf(t);
            const actions = renderActions(t);
            return (
              <li key={t.id} className="px-4 sm:px-5 py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 break-words">{t.motorcycles?.model || 'Motorcycle'}</p>
                    <p className="text-sm text-slate-500 break-words">
                      <span className="font-mono text-xs">{t.motorcycles?.plate_number || 'No plate'}</span> · {t.service_type}
                    </p>
                  </div>
                  <div className="shrink-0">{renderStatus(t)}</div>
                </div>
                <p className="text-sm text-slate-600 break-words">
                  {customer.name}
                  {customer.phone && (
                    <>
                      {' · '}
                      <a href={`tel:${customer.phone}`} className="font-mono text-xs hover:text-orange-600 transition">
                        {formatPhoneNumber(customer.phone)}
                      </a>
                    </>
                  )}
                </p>
                {detail && <p className="text-sm text-slate-500 break-words">{detail}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">
                    {formatDay(closedOn(t))} · <span className="font-mono">{t.ticket_code}</span>
                  </p>
                  {actions && <div className="flex flex-wrap gap-1.5">{actions}</div>}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Count and pages */}
      <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 border-t border-slate-100 text-sm text-slate-500">
        <span className="tabular-nums">
          {shownTickets.length === 0 ? '0 tickets' : `${firstIndex + 1}–${firstIndex + pageTickets.length} of ${shownTickets.length}`}
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
    </div>
  );
}

import { useState, useMemo } from 'react';
import { InternalTicket, UserRole } from '../types/internal';
import { 
  Printer, 
  Search, 
  KeyRound, 
  CheckCircle2, 
  ClipboardCheck, 
  Phone,
  Clock
} from 'lucide-react';
import { parseTicketNotes, formatPhoneNumber } from '../../utils/ticketNotesParser';

interface InternalBillingTabProps {
  tickets: InternalTicket[];
  onOpenStage5Billing: (ticket: InternalTicket) => void;
  onOpenReceiptPrint: (ticket: InternalTicket) => void;
  currentRole: UserRole;
}

export default function InternalBillingTab({
  tickets,
  onOpenStage5Billing,
  onOpenReceiptPrint,
  currentRole: _currentRole,
}: InternalBillingTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'READY' | 'COMPLETED' | 'ALL'>('READY');

  // Tickets ready for pickup & handover (Stage 5 and not completed)
  const readyForRelease = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.stage === 5 &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED' &&
        t.status !== 'CANCELLED_BY_ADMIN'
    );
  }, [tickets]);

  // Completed & Handed Over Today
  const releasedToday = useMemo(() => {
    const today = new Date().toDateString();
    return tickets.filter(
      (t) =>
        t.status === 'COMPLETED' &&
        new Date(t.paid_at || t.updated_at || t.created_at).toDateString() === today
    );
  }, [tickets]);

  // All completed tickets
  const allReleased = useMemo(() => {
    return tickets.filter((t) => t.status === 'COMPLETED');
  }, [tickets]);

  // Total tickets active or handled today
  const totalTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return tickets.filter(
      (t) =>
        new Date(t.created_at).toDateString() === today ||
        (t.updated_at && new Date(t.updated_at).toDateString() === today)
    ).length;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let base = tickets;
    if (filterMode === 'READY') {
      base = readyForRelease;
    } else if (filterMode === 'COMPLETED') {
      base = allReleased;
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (t) =>
        t.ticket_code.toLowerCase().includes(q) ||
        t.customer_name?.toLowerCase().includes(q) ||
        t.customer_phone?.toLowerCase().includes(q) ||
        t.motorcycles?.model?.toLowerCase().includes(q) ||
        t.motorcycles?.plate_number?.toLowerCase().includes(q)
    );
  }, [tickets, readyForRelease, allReleased, filterMode, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-5 h-5 text-orange-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Counter Release
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Customer verification, vehicle inspection sign-off, and key release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            <span>{readyForRelease.length} Ready for Release</span>
          </span>
        </div>
      </div>

      {/* 2. Purely Operational Turnover Metrics (Zero Payment/Cash Tracking) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Awaiting Pickup & Handover */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between transition hover:border-purple-200">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">
              Ready for Pickup
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-700">
              {readyForRelease.length}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              Waiting at counter • Keys ready
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shadow-2xs shrink-0">
            <KeyRound className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Metric 2: Released & Cleared Today */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between transition hover:border-emerald-200">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">
              Released Today
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {releasedToday.length}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              Turned over to owner
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shadow-2xs shrink-0">
            <CheckCircle2 className="w-5 h-5 stroke-[2]" />
          </div>
        </div>

        {/* Metric 3: Total Orders Handled Today */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center justify-between transition hover:border-orange-200">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">
              Total Processed Today
            </span>
            <span className="text-2xl sm:text-3xl font-black text-orange-600">
              {totalTodayCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              Active tickets handled today
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200/70 flex items-center justify-center shadow-2xs shrink-0">
            <Clock className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* 3. Filter Pills & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticket #, rider name, mobile, plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('READY')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
              filterMode === 'READY'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Awaiting Pickup ({readyForRelease.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('COMPLETED')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
              filterMode === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Released & Cleared ({allReleased.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Work Orders ({tickets.length})
          </button>
        </div>
      </div>

      {/* 4. Tickets List Grid */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
          <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-700">No Vehicles in This View</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filterMode === 'READY'
              ? 'No motorcycles currently awaiting pickup at the release desk.'
              : 'No service records match your current filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => {
            const isCompleted = ticket.status === 'COMPLETED';
            const isReady = ticket.stage === 5 && !isCompleted;

            return (
              <div
                key={ticket.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 transition ${
                  isReady
                    ? 'border-purple-300 bg-purple-50/15 hover:border-purple-400'
                    : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Header: Ticket Code & Operational Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-bold text-orange-600 text-sm">
                        #{ticket.ticket_code}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {isCompleted ? '✓ Released & Cleared' : '● Stage 5: Ready for Handover'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {ticket.service_type || 'Standard PMS'}
                    </h3>
                  </div>

                  {/* Release Timestamp or Status */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      {isCompleted ? 'Released At' : 'Turnover Status'}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {isCompleted
                          ? ticket.paid_at
                            ? new Date(ticket.paid_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                            : 'Released'
                          : 'Awaiting Claim'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Rider & Unit Details */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/90 rounded-xl text-xs">
                  {(() => {
                    const parsedNotes = parseTicketNotes(ticket.notes);
                    const rawPhone = (ticket.customer_phone && !ticket.customer_phone.includes(',') && ticket.customer_phone !== 'N/A')
                      ? ticket.customer_phone
                      : parsedNotes.phone;
                    const displayPhone = rawPhone ? formatPhoneNumber(rawPhone) : null;
                    const customerName = ticket.customer_name || parsedNotes.customerName || 'Rider Customer';

                    return (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer / Mobile</span>
                        <span className="font-bold text-slate-900 truncate block">
                          {customerName}
                        </span>
                        {displayPhone ? (
                          <a
                            href={`tel:${rawPhone}`}
                            className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 mt-0.5 font-mono"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{displayPhone}</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">No phone provided</span>
                        )}
                      </div>
                    );
                  })()}

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Motorcycle & Plate</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {ticket.motorcycles?.model || 'Motorcycle Unit'}
                    </span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] inline-block mt-0.5">
                      {ticket.motorcycles?.plate_number || 'NO PLATE'}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">
                    {ticket.assigned_mechanic ? `Serviced by: ${ticket.assigned_mechanic}` : 'Front Desk Intake'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenReceiptPrint(ticket)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      title="Print Vehicle Release Pass & Gate Clearance"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Gate Pass</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenStage5Billing(ticket)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        isCompleted
                          ? 'bg-slate-800 hover:bg-slate-900 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>View Release Summary</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Handover Keys & Release ➔</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

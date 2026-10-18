import { useState, ReactNode } from 'react';
import {
  CalendarCheck,
  MessageSquare,
  Star,
  Receipt,
  CalendarX,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  Reply,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  PartyPopper,
  ArrowRight,
} from 'lucide-react';
import { HardcopyRequest, updateHardcopyStatus } from '../../lib/hardcopyService';
import { adminLateCheckInOverride } from '../../utils/bookingLifecycle';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { acceptOnlineBooking, cancelOrDeclineTicket } from '../utils/ticketActions';
import { setReviewPublished } from '../utils/reviewModeration';
import { ActionCenterData } from '../hooks/useActionCenterData';
import { InternalTicket, InternalTab } from '../types/internal';
import type { OperationalView } from './InternalQueueTab';

interface InternalActionCenterTabProps {
  /** Action lists computed once in the console (see useActionCenterData) */
  data: ActionCenterData;
  tickets: InternalTicket[];
  currentStaffName: string;
  onRefresh: () => void;
  onRefreshHardcopies: () => void;
  onOpenStage5Billing: (ticket: InternalTicket) => void;
  onOpenQueue: (view: OperationalView) => void;
  onOpenConversation: (userId: string) => void;
  onNavigateTab: (tab: InternalTab) => void;
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (isNaN(diffMin)) return '';
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function bikeLabel(t: InternalTicket): string {
  const model = t.motorcycles?.model || 'Motorcycle';
  return t.motorcycles?.plate_number ? `${model} • ${t.motorcycles.plate_number}` : model;
}

function Section({
  icon,
  title,
  description,
  count,
  tone,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  count: number;
  tone: 'orange' | 'blue' | 'amber' | 'emerald' | 'rose' | 'slate';
  action?: ReactNode;
  children: ReactNode;
}) {
  if (count === 0) return null;
  const toneClass = {
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    blue: 'bg-sky-50 text-sky-600 border-sky-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  }[tone];

  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
      <header className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${toneClass}`}>{icon}</div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              {title}
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono">{count}</span>
            </h2>
            <p className="text-[11px] text-slate-500 truncate">{description}</p>
          </div>
        </div>
        {action}
      </header>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  );
}

function Row({ title, subtitle, meta, children }: { title: ReactNode; subtitle?: ReactNode; meta?: string; children?: ReactNode }) {
  return (
    <li className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{title}</p>
        {subtitle && <div className="text-[11px] text-slate-500 truncate">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        {meta && <span className="text-[10px] text-slate-400 mr-1">{meta}</span>}
        {children}
      </div>
    </li>
  );
}

const btn = {
  primary:
    'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50',
  dark: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50',
  outline:
    'px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50',
  danger:
    'px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50',
  ghost: 'px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition cursor-pointer',
};

export default function InternalActionCenterTab({
  data,
  tickets,
  currentStaffName,
  onRefresh,
  onRefreshHardcopies,
  onOpenStage5Billing,
  onOpenQueue,
  onOpenConversation,
  onNavigateTab,
}: InternalActionCenterTabProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const {
    pendingBookings,
    chatsToAnswer,
    pendingReviews,
    readyForRelease,
    missedBookings,
    pendingHardcopies,
    customerUpdates,
    totalActions,
    reloadReviews: loadPendingReviews,
  } = data;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const run = async (key: string, task: () => Promise<{ success: boolean; error?: string }>, after?: () => void) => {
    setBusyKey(key);
    setErrorMsg(null);
    try {
      const res = await task();
      if (!res.success) {
        setErrorMsg(res.error || 'Action failed. Please try again.');
        return;
      }
      after?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const dismiss = (keys: string[]) => {
    data.dismiss(keys, currentStaffName).then((res) => {
      if (!res.success) setErrorMsg(res.error || 'Failed to save. Please try again.');
    });
  };

  const handleLateCheckIn = (t: InternalTicket) =>
    run(
      `missed:${t.id}`,
      async () => {
        const res = await adminLateCheckInOverride(t.id, currentStaffName);
        if (res.success) {
          await recordAuditLog({
            ticketCode: t.ticket_code,
            action: 'LATE_CHECKIN_OVERRIDE',
            actor: currentStaffName,
            details: 'Late arrival checked in from the Action Center.',
            previousValue: t.status,
            newValue: 'IN_PROGRESS',
          });
        }
        return res;
      },
      onRefresh
    );

  const handleMarkHardcopyReady = (r: HardcopyRequest) =>
    run(
      `hardcopy:${r.id}`,
      async () => {
        const ok = await updateHardcopyStatus({
          requestId: r.id,
          userId: r.userId,
          bikeModel: r.bikeModel,
          status: 'READY_FOR_PICKUP',
        });
        return ok ? { success: true } : { success: false, error: 'Failed to update the hardcopy request.' };
      },
      onRefreshHardcopies
    );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-5">
      <div className="flex justify-end px-1">
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
            totalActions > 0 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {totalActions > 0
            ? `${totalActions} ${totalActions === 1 ? 'item needs' : 'items need'} attention`
            : 'All caught up'}
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-2 text-rose-800 text-xs">
          <span className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            {errorMsg}
          </span>
          <button type="button" onClick={() => setErrorMsg(null)} className="font-bold text-rose-700 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {totalActions === 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-2">
          <PartyPopper className="w-9 h-9 text-emerald-500 mx-auto" />
          <h2 className="font-bold text-base text-slate-900">All caught up!</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No bookings, messages, approvals, or requests are waiting. New customer activity will appear here live.
          </p>
          <button type="button" onClick={() => onNavigateTab('queue')} className={`${btn.outline} mx-auto mt-2`}>
            Go to Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. New online bookings */}
      <Section
        icon={<CalendarCheck className="w-4 h-4" />}
        title="New online bookings"
        description="Accept to add to the schedule, or decline with a reason."
        count={pendingBookings.length}
        tone="orange"
      >
        {pendingBookings.map((t) => {
          const key = `booking:${t.id}`;
          const isDeclining = decliningId === t.id;
          return (
            <li key={t.id} className="px-4 sm:px-5 py-3 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                    {t.customer_name || 'Rider Customer'} — {t.service_type}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    #{t.ticket_code} • {bikeLabel(t)} • Drop-off {t.dropoff_date || '—'}
                    {t.dropoff_window ? ` (${t.dropoff_window})` : ''}
                  </p>
                </div>
                {!isDeclining && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-400 mr-1">{timeAgo(t.created_at)}</span>
                    <button
                      type="button"
                      disabled={busyKey === key}
                      onClick={() => run(key, () => acceptOnlineBooking(t, currentStaffName), onRefresh)}
                      className={btn.primary}
                    >
                      {busyKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDecliningId(t.id);
                        setDeclineReason('');
                      }}
                      className={btn.danger}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                )}
              </div>
              {isDeclining && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    autoFocus
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Reason for declining (saved to the ticket and activity log)"
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                  />
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setDecliningId(null)} className={btn.ghost}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === key || !declineReason.trim()}
                      onClick={() =>
                        run(key, () => cancelOrDeclineTicket(t, declineReason, currentStaffName), () => {
                          setDecliningId(null);
                          onRefresh();
                        })
                      }
                      className={btn.danger}
                    >
                      {busyKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Confirm Decline
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </Section>

      {/* 2. Customers waiting for a reply */}
      <Section
        icon={<MessageSquare className="w-4 h-4" />}
        title="Customers waiting for a reply"
        description="Their latest message has no answer from the shop yet."
        count={chatsToAnswer.length}
        tone="blue"
      >
        {chatsToAnswer.map((c) => (
          <Row
            key={c.userId}
            title={c.customerName}
            subtitle={<span className="italic">“{c.lastMessage}”</span>}
            meta={timeAgo(c.lastTime)}
          >
            <button type="button" onClick={() => onOpenConversation(c.userId)} className={btn.dark}>
              <Reply className="w-3.5 h-3.5" /> Reply
            </button>
          </Row>
        ))}
      </Section>

      {/* 4. Reviews waiting for approval */}
      <Section
        icon={<Star className="w-4 h-4" />}
        title="Reviews waiting for approval"
        description="Low ratings stay off the website until you approve them."
        count={pendingReviews.length}
        tone="amber"
      >
        {pendingReviews.map((r) => {
          const key = `review:${r.id}`;
          const ticketCode = tickets.find((t) => t.id === r.ticket_id)?.ticket_code || 'REVIEW';
          return (
            <Row
              key={r.id}
              title={`${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}  ${r.display_name}`}
              subtitle={r.comment ? <span className="italic">“{r.comment}”</span> : 'No written comment'}
              meta={timeAgo(r.created_at)}
            >
              <button
                type="button"
                disabled={busyKey === key}
                onClick={() => run(key, () => setReviewPublished(r, true, currentStaffName, ticketCode), loadPendingReviews)}
                className={btn.primary}
              >
                <Eye className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                type="button"
                disabled={busyKey === key}
                onClick={() => run(key, () => setReviewPublished(r, false, currentStaffName, ticketCode), loadPendingReviews)}
                className={btn.outline}
              >
                <EyeOff className="w-3.5 h-3.5" /> Keep Hidden
              </button>
            </Row>
          );
        })}
      </Section>

      {/* 5. Ready for release */}
      <Section
        icon={<Receipt className="w-4 h-4" />}
        title="Ready for release"
        description="Repair finished — complete the handover checklist and release the motorcycle."
        count={readyForRelease.length}
        tone="emerald"
      >
        {readyForRelease.map((t) => (
          <Row
            key={t.id}
            title={`${t.customer_name || 'Rider Customer'} — ${t.service_type}`}
            subtitle={`#${t.ticket_code} • ${bikeLabel(t)}`}
          >
            <button type="button" onClick={() => onOpenStage5Billing(t)} className={btn.primary}>
              <Receipt className="w-3.5 h-3.5" /> Release
            </button>
          </Row>
        ))}
      </Section>

      {/* 6. Missed appointments */}
      <Section
        icon={<CalendarX className="w-4 h-4" />}
        title="Missed appointments"
        description="The drop-off window passed without check-in. The customer was notified and can reschedule."
        count={missedBookings.length}
        tone="rose"
      >
        {missedBookings.map((t) => {
          const key = `missed:${t.id}`;
          return (
            <Row
              key={t.id}
              title={`${t.customer_name || 'Rider Customer'} — ${t.service_type}`}
              subtitle={`#${t.ticket_code} • ${bikeLabel(t)} • Was due ${t.dropoff_date || '—'}`}
            >
              <button type="button" disabled={busyKey === key} onClick={() => handleLateCheckIn(t)} className={btn.dark}>
                {busyKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Late Check-in
              </button>
              <button type="button" onClick={() => onOpenQueue('MISSED')} className={btn.outline}>
                Reschedule
              </button>
              <button type="button" onClick={() => dismiss([key])} className={btn.ghost}>
                Got it
              </button>
            </Row>
          );
        })}
      </Section>

      {/* 7. Hardcopy requests */}
      <Section
        icon={<FileText className="w-4 h-4" />}
        title="Certified hardcopy requests"
        description="Prepare and sign the printed record, then mark it ready for pickup."
        count={pendingHardcopies.length}
        tone="slate"
      >
        {pendingHardcopies.map((r) => {
          const key = `hardcopy:${r.id}`;
          return (
            <Row
              key={r.id}
              title={`${r.customerName} — ${r.purpose}`}
              subtitle={`${r.id} • ${r.bikeModel} • ${r.plateNumber}`}
              meta={timeAgo(r.createdAt)}
            >
              <button type="button" disabled={busyKey === key} onClick={() => handleMarkHardcopyReady(r)} className={btn.primary}>
                {busyKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Mark Ready
              </button>
            </Row>
          );
        })}
      </Section>

      {/* 8. FYI customer updates */}
      <Section
        icon={<Bell className="w-4 h-4" />}
        title="Customer updates"
        description="Changes customers made to their bookings — for your awareness."
        count={customerUpdates.length}
        tone="slate"
        action={
          <button type="button" onClick={() => dismiss(customerUpdates.map((u) => u.key))} className={btn.ghost}>
            Dismiss all
          </button>
        }
      >
        {customerUpdates.map((u) => (
          <Row
            key={u.key}
            title={u.label}
            subtitle={`#${u.ticket.ticket_code} • ${u.ticket.customer_name || 'Rider Customer'} • ${u.ticket.service_type}`}
          >
            <button type="button" onClick={() => dismiss([u.key])} className={btn.ghost}>
              Got it
            </button>
          </Row>
        ))}
      </Section>
    </div>
  );
}

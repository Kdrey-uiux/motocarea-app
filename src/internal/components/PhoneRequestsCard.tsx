import { useEffect, useState } from 'react';
import { db } from '../../lib/supabase';
import { toast } from '../utils/toast';
import { Check, Loader2, Phone, ShieldCheck, X } from '../../components/icons';
import {
  approvePhoneChange,
  declinePhoneChange,
  fetchPendingPhoneRequests,
  formatPhoneForDisplay,
  type PhoneChangeRequest,
} from '../../lib/phoneChangeService';

const card = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Owner only: riders asking to change their mobile number. The owner checks it's really
 * them, then Approve (the database changes the number, tells the rider, logs it) or Decline.
 * Hidden when there's nothing waiting.
 */
export default function PhoneRequestsCard() {
  const [requests, setRequests] = useState<PhoneChangeRequest[]>([]);
  // Which request is asking "are you sure?" and in which way
  const [confirming, setConfirming] = useState<{ id: string; action: 'approve' | 'decline' } | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchPendingPhoneRequests().then((rows) => {
        if (active) setRequests(rows);
      });
    load();
    // New requests and cancellations show up live (only the owner receives these rows)
    const channel = db()
      .channel('owner-phone-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phone_change_requests' }, load)
      .subscribe();
    return () => {
      active = false;
      db().removeChannel(channel);
    };
  }, []);

  if (requests.length === 0) return null;

  const decide = async (req: PhoneChangeRequest, action: 'approve' | 'decline') => {
    if (action === 'decline' && declineReason.trim().length < 3) {
      toast.error('Please give the rider a reason.');
      return;
    }
    setBusyId(req.id);
    const result =
      action === 'approve' ? await approvePhoneChange(req.id) : await declinePhoneChange(req.id, declineReason);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error || 'Something went wrong.');
      return;
    }
    toast.success(
      action === 'approve'
        ? `${req.rider_name}'s number is now ${formatPhoneForDisplay(req.new_phone)}.`
        : `Declined. ${req.rider_name} has been told why.`
    );
    setConfirming(null);
    setDeclineReason('');
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  return (
    <section className={`${card} p-4 sm:p-5 animate-in fade-in duration-200`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[12px] bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
          <Phone className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-base text-slate-900">
            {requests.length} number change request{requests.length > 1 ? 's' : ''}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">Check it’s really the rider before you approve.</p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {requests.map((req) => {
          const isConfirming = confirming?.id === req.id;
          const busy = busyId === req.id;
          return (
            <li key={req.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {(req.rider_name || 'R').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {req.rider_name}
                      <span className="ml-2 text-xs font-normal text-slate-400">{timeAgo(req.requested_at)}</span>
                    </p>
                    <p className="mt-0.5 text-sm tabular-nums text-slate-700 break-words">
                      {/* Each number stays on one line; on narrow screens the new one drops below */}
                      <span className="text-slate-500 whitespace-nowrap">{formatPhoneForDisplay(req.old_phone)}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-semibold text-slate-900 whitespace-nowrap">{formatPhoneForDisplay(req.new_phone)}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 break-words">“{req.reason}”</p>
                  </div>
                </div>

                {!isConfirming && (
                  <div className="flex gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: req.id, action: 'decline' })}
                      className="flex-1 sm:flex-none h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: req.id, action: 'approve' })}
                      className="flex-1 sm:flex-none h-9 px-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold shadow-sm shadow-orange-500/25 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="sm:hidden">Approve</span>
                      <span className="hidden sm:inline">Approve & change</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Step 2: confirm (approve) or give a reason (decline) */}
              {isConfirming && confirming.action === 'approve' && (
                <div className="mt-3 rounded-xl bg-white border border-orange-200 p-3 space-y-3">
                  <p className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                    Did you confirm it’s {req.rider_name}? For example, call {formatPhoneForDisplay(req.old_phone)}, ask in
                    chat, or check in person. The rider’s number will change right away.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      disabled={busy}
                      className="h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(req, 'approve')}
                      disabled={busy}
                      className="h-9 px-3.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Yes, change the number
                    </button>
                  </div>
                </div>
              )}

              {isConfirming && confirming.action === 'decline' && (
                <div className="mt-3 rounded-xl bg-white border border-slate-200 p-3 space-y-2.5">
                  <label htmlFor={`decline-${req.id}`} className="block text-xs font-semibold text-slate-700">
                    Reason for the rider
                  </label>
                  <textarea
                    id={`decline-${req.id}`}
                    rows={2}
                    maxLength={300}
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="e.g. We couldn't confirm it's you. Please visit the shop with a valid ID."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(null);
                        setDeclineReason('');
                      }}
                      disabled={busy}
                      className="h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => decide(req, 'decline')}
                      disabled={busy}
                      className="h-9 px-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Decline request
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

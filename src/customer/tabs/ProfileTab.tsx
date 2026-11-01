import { useCallback, useEffect, useState } from 'react';
import { UserProfile } from '../../types/dashboard';
import { Key, Shield, User, Mail, Phone, MessageSquare, Clock, Loader2 } from '../../components/icons';
import { supabase } from '../../lib/supabase';
import {
  cancelPhoneRequest,
  fetchMyPhoneRequests,
  formatPhoneForDisplay,
  nextPhoneChangeDate,
  type PhoneChangeRequest,
} from '../../lib/phoneChangeService';
import ChangePhoneModal from '../modals/ChangePhoneModal';

interface ProfileTabProps {
  userProfile: UserProfile | null;
  onOpenPasswordModal: () => void;
  userId?: string | null;
  /** The owner approved a new number: show it right away */
  onPhoneUpdated?: (phone: string) => void;
}

export default function ProfileTab({
  userProfile,
  onOpenPasswordModal,
  userId,
  onPhoneUpdated,
}: ProfileTabProps) {
  // Mobile number changes go through the shop (migration 20)
  const [phoneRequests, setPhoneRequests] = useState<PhoneChangeRequest[]>([]);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [phoneNotice, setPhoneNotice] = useState<string | null>(null);

  const loadPhoneRequests = useCallback(async () => {
    if (!userId) return;
    setPhoneRequests(await fetchMyPhoneRequests(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchMyPhoneRequests(userId).then((rows) => {
      if (active) setPhoneRequests(rows);
    });
    // The owner's decision shows up live
    const channel = supabase
      .channel(`phone-requests-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'phone_change_requests', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Partial<PhoneChangeRequest> | undefined;
          if (row?.status === 'APPROVED' && row.new_phone) onPhoneUpdated?.(row.new_phone);
          fetchMyPhoneRequests(userId).then((rows) => {
            if (active) setPhoneRequests(rows);
          });
        }
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, onPhoneUpdated]);

  const pendingRequest = phoneRequests.find((r) => r.status === 'PENDING');
  const latestDecided = phoneRequests.find((r) => r.status === 'APPROVED' || r.status === 'DECLINED');
  const nextChangeDate = nextPhoneChangeDate(phoneRequests);

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;
    setCancelling(true);
    const result = await cancelPhoneRequest(pendingRequest.id);
    setCancelling(false);
    setPhoneNotice(result.success ? 'Request cancelled.' : result.error || 'Could not cancel the request.');
    loadPhoneRequests();
  };
  const initials = userProfile?.full_name
    ? userProfile.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* 1. Personal & Account Information Card (Bento Style) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-7 card-elevated space-y-6">
        {/* Header with Integrated Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-[-0.02em] leading-snug break-words">
                {userProfile?.full_name || 'Rider Customer'}
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate">
                {userProfile?.email || 'N/A'}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Verified Motorcycle Owner (Rider)</span>
          </div>
        </div>

        {/* Credentials Form Grid */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-slate-800">
            Contact Credentials & Garage Profile
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.full_name || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-base sm:text-xs font-medium cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address</span>
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.email || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-base sm:text-xs font-medium cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Contact Number</span>
              </label>
              {/* Number + Change: only the shop changes it, after the rider asks */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-base sm:text-xs font-medium tabular-nums truncate">
                  {formatPhoneForDisplay(userProfile?.phone_number)}
                </div>
                {userId && !pendingRequest && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneNotice(null);
                      setIsPhoneModalOpen(true);
                    }}
                    disabled={Boolean(nextChangeDate)}
                    title={nextChangeDate ? 'You can change your number once every 30 days' : undefined}
                    className="shrink-0 h-10 sm:h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm sm:text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Change
                  </button>
                )}
              </div>

              {pendingRequest ? (
                <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 hidden sm:block" />
                  <div className="min-w-0 flex-1 text-xs leading-relaxed">
                    <p className="font-semibold text-amber-900">Waiting for the shop to approve</p>
                    <p className="text-amber-800 tabular-nums break-words">
                      {formatPhoneForDisplay(pendingRequest.old_phone)} → {formatPhoneForDisplay(pendingRequest.new_phone)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    disabled={cancelling}
                    className="self-start sm:self-auto shrink-0 h-9 px-3.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100/60 text-xs font-semibold text-amber-900 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Cancel request
                  </button>
                </div>
              ) : nextChangeDate ? (
                <p className="text-[11px] text-slate-500">
                  Number changed recently. You can request another change on{' '}
                  {nextChangeDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}.
                </p>
              ) : latestDecided?.status === 'DECLINED' ? (
                <p className="text-[11px] text-rose-600">
                  Your last request was declined{latestDecided.decline_reason ? `: ${latestDecided.decline_reason}` : '.'}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">To change it, send a request. The shop checks it’s you first.</p>
              )}
              {phoneNotice && <p className="text-[11px] text-slate-500">{phoneNotice}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Security & Password Settings Card */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 card-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Account Security & Password
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your login authentication. Passwords are encrypted via Supabase Auth.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPasswordModal}
          className="inline-flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/80 text-xs font-semibold px-5 py-2.5 rounded-full transition shadow-xs shrink-0 cursor-pointer"
        >
          <Key className="w-3.5 h-3.5 text-orange-500" />
          <span>Change Password</span>
        </button>
      </div>

      {/* 3. Workshop Helpdesk Card */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 card-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Workshop Helpdesk & Mechanic Support
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Have questions regarding your repair progress or motorcycle parts? Reach our on-duty technicians anytime via the floating chat button.
            </p>
          </div>
        </div>
      </div>

      {/* Mounted only while open, so every visit starts with an empty form */}
      {userId && isPhoneModalOpen && (
        <ChangePhoneModal
          isOpen={isPhoneModalOpen}
          onClose={() => setIsPhoneModalOpen(false)}
          userId={userId}
          currentPhone={userProfile?.phone_number}
          onSent={() => {
            setPhoneNotice('Request sent. The shop will check it is you, then change your number.');
            loadPhoneRequests();
          }}
        />
      )}
    </div>
  );
}

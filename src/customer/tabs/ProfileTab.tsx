import { UserProfile } from '../../types/dashboard';
import { Key, Shield, User, Mail, Phone, MessageSquare } from 'lucide-react';

interface ProfileTabProps {
  userProfile: UserProfile | null;
  onOpenPasswordModal: () => void;
}

export default function ProfileTab({
  userProfile,
  onOpenPasswordModal,
}: ProfileTabProps) {
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
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-7 shadow-xs space-y-6">
        {/* Header with Integrated Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
              {initials}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {userProfile?.full_name || 'Rider Customer'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
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
              <input
                type="text"
                disabled
                value={userProfile?.phone_number || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-base sm:text-xs font-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Security & Password Settings Card */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
    </div>
  );
}

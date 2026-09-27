import { UserProfile } from '../../types/dashboard';
import { Key, Shield, User, Mail, Phone } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Personal & Account Information Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Header with Integrated Identity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {userProfile?.full_name || 'Rider Customer'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {userProfile?.email || 'N/A'}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Motorcycle Owner (Rider)</span>
          </div>
        </div>

        {/* Credentials Form Grid */}
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Contact Credentials
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.full_name || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs font-medium cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address</span>
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.email || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs font-medium cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-medium text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Contact</span>
              </label>
              <input
                type="text"
                disabled
                value={userProfile?.phone_number || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs font-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Security & Password Settings Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
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

        {/* Ang tanging button para sa password */}
        <button
          type="button"
          onClick={onOpenPasswordModal}
          className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-xs shrink-0"
        >
          <Key className="w-3.5 h-3.5 text-slate-500" />
          <span>Change Password</span>
        </button>
      </div>
    </div>
  );
}

import { useState, type FormEvent, type ReactNode } from 'react';
import { workshopSupabase } from '../../lib/supabase';
import { passwordChecks } from '../../utils/validators';
import type { ThemePreference } from '../../utils/theme';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { toast } from '../utils/toast';
import { UserRole } from '../types/internal';
import { ArrowUpRight, Check, Eye, EyeOff, Loader2, Monitor, Moon, Sun } from '../../components/icons';

interface InternalSettingsTabProps {
  currentRole: UserRole;
  currentUserName: string;
  email: string;
  themePreference: ThemePreference;
  onChangeTheme: (preference: ThemePreference) => void;
}

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const INPUT =
  'w-full bg-slate-50 border border-slate-200 rounded-2xl pl-3.5 pr-11 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition';

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

/** The signed-in person's own settings. Team, Services and Bays have their own pages. */
export default function InternalSettingsTab({
  currentRole,
  currentUserName,
  email,
  themePreference,
  onChangeTheme,
}: InternalSettingsTabProps) {
  const isOwner = currentRole === 'admin';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checks = passwordChecks(newPassword);
  const isValid = checks.every((c) => c.valid);
  const doesMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isValid) {
      setErrorMsg('The new password does not meet all the rules yet.');
      return;
    }
    if (!doesMatch) {
      setErrorMsg('The two passwords do not match.');
      return;
    }

    setSaving(true);
    const { error } = await workshopSupabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }

    recordAuditLog({
      ticketCode: 'PROFILE',
      action: 'PASSWORD_CHANGED',
      actor: currentUserName,
      details: `${currentUserName} changed their own password.`,
    });
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    toast.success('Your password was changed.');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Section title="Your account" subtitle={isOwner ? 'The account you are signed in with.' : 'To change these, ask the shop owner.'}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-bold text-lg flex items-center justify-center shrink-0">
            {currentUserName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 break-words">{currentUserName}</p>
            <p className="text-sm text-slate-500 break-all">{email}</p>
            <p className="text-sm text-slate-500">{isOwner ? 'Shop owner' : 'Staff'}</p>
          </div>
        </div>
      </Section>

      <Section title="Password" subtitle="You stay signed in on this device after changing it.">
        <form onSubmit={handleChangePassword} className="space-y-3">
          {errorMsg && <p className="px-3.5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 text-sm">{errorMsg}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="settings-new-password" className="text-sm font-semibold text-slate-800 block">
                New password
              </label>
              <div className="relative">
                <input
                  id="settings-new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="settings-confirm-password" className="text-sm font-semibold text-slate-800 block">
                Type it again
              </label>
              <input
                id="settings-confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className={INPUT}
              />
            </div>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
            {checks.map((check) => (
              <li
                key={check.id}
                className={`flex items-center gap-1.5 text-xs ${check.valid ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}
              >
                <Check className={`w-3.5 h-3.5 shrink-0 ${check.valid ? '' : 'opacity-40'}`} />
                {check.label}
              </li>
            ))}
          </ul>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !newPassword || !confirmPassword}
              className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Appearance" subtitle="For the console on this device.">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-slate-100 max-w-sm" role="radiogroup" aria-label="Appearance">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = themePreference === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onChangeTheme(option.id)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition cursor-pointer ${
                  isActive ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Customer website" subtitle="The public page riders see. It opens in a new tab, and you stay signed in here.">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
        >
          View website
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </a>
      </Section>
    </div>
  );
}

import { useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { workshopSupabase } from '../../lib/supabase';
import { passwordChecks } from '../../utils/validators';
import type { ThemePreference } from '../../utils/theme';
import { ScrollLock } from '../../hooks/useLockBodyScroll';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { toast } from '../utils/toast';
import { UserRole } from '../types/internal';
import WebsiteContentModal from '../modals/WebsiteContentModal';
import { ArrowUpRight, Check, Edit, Eye, EyeOff, Globe, KeyRound, Loader2, Monitor, Moon, Sun } from '../../components/icons';

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

const CARD = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';

const OUTLINE_BTN =
  'w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer';

/** One setting: icon, what it is, and its control on the right */
function SettingRow({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Sun;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <li className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{hint}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}

function ChangePasswordModal({ currentUserName, onClose }: { currentUserName: string; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checks = passwordChecks(newPassword);
  const isValid = checks.every((c) => c.valid);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isValid) {
      setErrorMsg('The new password does not meet all the rules yet.');
      return;
    }
    if (newPassword !== confirmPassword) {
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
    toast.success('Your password was changed.');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <ScrollLock />
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[1.75rem] max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
      >
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Change password</h3>
          <p className="text-sm text-slate-500">You stay signed in on this device.</p>
        </div>

        {errorMsg && <p className="px-3.5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 text-sm">{errorMsg}</p>}

        <div className="space-y-1.5">
          <label htmlFor="settings-new-password" className="text-sm font-semibold text-slate-800 block">
            New password
          </label>
          <div className="relative">
            <input
              id="settings-new-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
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

        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
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

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !newPassword || !confirmPassword}
            className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body
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
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isWebsiteOpen, setIsWebsiteOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[20rem_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
      {/* Who is signed in */}
      <section className={`${CARD} p-5 sm:p-6 flex xl:flex-col items-center xl:text-center gap-4`}>
        <span className="w-14 h-14 xl:w-24 xl:h-24 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-bold text-xl xl:text-4xl flex items-center justify-center shrink-0">
          {currentUserName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 xl:w-full space-y-1">
          <h2 className="font-display text-lg xl:text-xl font-bold tracking-tight text-slate-900 break-words">{currentUserName}</h2>
          <p className="text-sm text-slate-500 break-all">{email}</p>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
            {isOwner ? 'Owner' : 'Staff'}
          </span>
          {!isOwner && <p className="pt-1 text-xs text-slate-400">To change your name or email, ask the shop owner.</p>}
        </div>
      </section>

      <ul className={`${CARD} divide-y divide-slate-100 overflow-hidden`}>
        <SettingRow icon={KeyRound} title="Password" hint="Change the password you sign in with.">
          <button type="button" onClick={() => setIsPasswordOpen(true)} className={OUTLINE_BTN}>
            Change
          </button>
        </SettingRow>

        <SettingRow icon={Sun} title="Appearance" hint="For this console on this device.">
          <div className="grid grid-cols-3 gap-0.5 p-1 rounded-full bg-slate-100" role="radiogroup" aria-label="Appearance">
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
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition cursor-pointer ${
                    isActive ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </SettingRow>

        {isOwner && (
          <SettingRow icon={Edit} title="Website content" hint="Shop details, home headline and service cards.">
            <button type="button" onClick={() => setIsWebsiteOpen(true)} className={OUTLINE_BTN}>
              Edit
            </button>
          </SettingRow>
        )}

        <SettingRow icon={Globe} title="Customer website" hint="See the public page riders visit.">
          <a href="/" target="_blank" rel="noopener noreferrer" className={OUTLINE_BTN}>
            View website
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </a>
        </SettingRow>
      </ul>

      {isWebsiteOpen && <WebsiteContentModal currentUserName={currentUserName} onClose={() => setIsWebsiteOpen(false)} />}
      {isPasswordOpen && <ChangePasswordModal currentUserName={currentUserName} onClose={() => setIsPasswordOpen(false)} />}
    </div>
  );
}

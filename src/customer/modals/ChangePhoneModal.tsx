import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Loader2, Phone, ShieldCheck, X } from '../../components/icons';
import { ScrollLock } from '../../hooks/useLockBodyScroll';
import { toPHMobileInput, validatePHMobile } from '../../utils/validators';
import { formatPhoneForDisplay, requestPhoneChange } from '../../lib/phoneChangeService';

interface ChangePhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentPhone?: string | null;
  /** Called after the request was sent */
  onSent: () => void;
}

const REASON_MAX = 300;

/** Rider asks the shop to change their mobile number; the owner verifies and changes it. */
export default function ChangePhoneModal({ isOpen, onClose, userId, currentPhone, onSent }: ChangePhoneModalProps) {
  const [phone, setPhone] = useState(''); // 10 digits after +63
  const [reason, setReason] = useState('');
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Escape closes it (not while sending)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, sending, onClose]);

  if (!isOpen) return null;

  const phoneError = validatePHMobile(phone);
  const reasonError = reason.trim().length < 3 ? 'Tell the shop why you are changing your number.' : null;
  const showPhoneError = triedSubmit ? phoneError : null;
  const showReasonError = triedSubmit ? reasonError : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (phoneError || reasonError) {
      setTriedSubmit(true);
      document.getElementById(phoneError ? 'cpm-phone' : 'cpm-reason')?.focus();
      return;
    }
    setSending(true);
    const result = await requestPhoneChange(userId, phone, reason);
    setSending(false);
    if (!result.success) {
      setServerError(result.error || 'Could not send your request.');
      return;
    }
    onSent();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={() => !sending && onClose()}
    >
      <ScrollLock />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="cpm-title"
        noValidate
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white border border-slate-200/80 rounded-t-[1.75rem] sm:rounded-[1.75rem] shadow-2xl max-h-[92dvh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 id="cpm-title" className="font-display text-lg font-bold tracking-tight text-slate-900 leading-tight">
                Change mobile number
              </h3>
              <p className="text-sm text-slate-500">The shop approves every change.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-200/70 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">Current number</span>
            <span className="text-sm font-semibold text-slate-800 tabular-nums">{formatPhoneForDisplay(currentPhone)}</span>
          </div>

          <div>
            <label htmlFor="cpm-phone" className="block text-sm font-semibold text-slate-700 mb-1.5">
              New mobile number <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-1.5 inset-y-1.5 flex items-center px-3 rounded-xl bg-white border border-slate-200/80 text-sm font-semibold text-slate-700 pointer-events-none select-none">
                +63
              </span>
              <input
                id="cpm-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(toPHMobileInput(e.target.value))}
                aria-invalid={Boolean(showPhoneError)}
                placeholder="917 123 4567"
                className={`w-full bg-slate-50 border rounded-2xl pl-[4.5rem] pr-4 py-3 text-base sm:text-[15px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition tabular-nums tracking-wide ${
                  showPhoneError
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                    : 'border-slate-200 focus:border-orange-500 focus:ring-orange-500/10'
                }`}
              />
            </div>
            {showPhoneError && (
              <p className="mt-1.5 flex items-start gap-1 text-xs text-rose-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {showPhoneError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cpm-reason" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Reason <span className="text-orange-500">*</span>
            </label>
            <textarea
              id="cpm-reason"
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={Boolean(showReasonError)}
              placeholder="e.g. Lost my SIM, switched to a new network"
              className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 text-base sm:text-[15px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition resize-none ${
                showReasonError
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-200 focus:border-orange-500 focus:ring-orange-500/10'
              }`}
            />
            <div className="mt-1 flex items-start justify-between gap-2">
              {showReasonError ? (
                <p className="flex items-start gap-1 text-xs text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  {showReasonError}
                </p>
              ) : (
                <span />
              )}
              <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                {reason.length}/{REASON_MAX}
              </span>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
            To keep your account safe, the shop checks it’s really you (for example by calling your current number) before
            changing it. You can change your number once every 30 days.
          </p>

          {serverError && (
            <div role="alert" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="h-11 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {sending ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

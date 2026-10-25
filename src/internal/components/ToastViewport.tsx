import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from '../../components/icons';
import { TOAST_EVENT, ToastMessage } from '../utils/toast';

const AUTO_DISMISS_MS = { success: 3500, info: 4500, error: 7000 };

const STYLES = {
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2, iconClass: 'text-emerald-600' },
  error: { box: 'border-rose-200 bg-rose-50 text-rose-900', icon: AlertCircle, iconClass: 'text-rose-600' },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: Info, iconClass: 'text-sky-600' },
};

/**
 * Renders toast notifications raised with toast.success/error/info.
 */
export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const handleToast = (event: Event) => {
      const t = (event as CustomEvent<ToastMessage>).detail;
      setToasts((prev) => [...prev.slice(-3), t]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
        timers.delete(timer);
      }, AUTO_DISMISS_MS[t.type]);
      timers.add(timer);
    };
    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 sm:w-96"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const style = STYLES[t.type];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 p-3 rounded-xl border shadow-lg text-xs animate-in fade-in slide-in-from-bottom-2 ${style.box}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.iconClass}`} />
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

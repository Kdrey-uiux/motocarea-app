import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from '../icons';

interface ConfirmLogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

/**
 * iOS-style action sheet, centered on every screen size:
 * One question, the destructive action in red text, and Cancel on its own row.
 */
export default function ConfirmLogoutModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: ConfirmLogoutModalProps) {
  // Escape closes it (not while signing out)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onClose]);

  // The page behind stays still while the sheet is open
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      [html.style.overflow, body.style.overflow] = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm touch-none overscroll-none flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !loading && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[20rem] sm:max-w-[24rem] space-y-2 animate-in zoom-in-95 fade-in duration-300 ease-out"
      >
        {/* The question + the action */}
        <div className="bg-white border border-slate-200/80 rounded-[1.4rem] overflow-hidden card-elevated shadow-2xl">
          <p id="logout-title" className="px-5 py-5 text-center text-[15px] font-medium text-slate-700">
            Are you sure you want to sign out?
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="w-full h-14 border-t border-slate-200/80 text-[17px] font-semibold text-rose-600 hover:bg-rose-50/60 active:bg-slate-100 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing out…
              </>
            ) : (
              'Sign out'
            )}
          </button>
        </div>

        {/* Cancel stands apart, in bold, like iOS */}
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="w-full h-14 rounded-[1.4rem] bg-white border border-slate-200/80 card-elevated text-[17px] font-semibold text-slate-900 shadow-2xl hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

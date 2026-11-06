import { useEffect, useRef, useState } from 'react';
import {
  X,
  FileText,
  Lock,
  CheckCircle2,
  Scale,
  ArrowRight
} from 'lucide-react';
import { LEGAL_UPDATED, PrivacyContent, TermsContent } from './LegalContent';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

export interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
  onAccept?: () => void;
  hasAgreed?: boolean;
}

export default function LegalTermsModal({
  isOpen,
  onClose,
  initialTab = 'terms',
  onAccept,
  hasAgreed = false,
}: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);
  // "I agree" unlocks only after both tabs were scrolled to the end (or fit without scrolling)
  const [readTabs, setReadTabs] = useState({ terms: false, privacy: false });
  const bodyRef = useRef<HTMLDivElement>(null);
  const mustRead = Boolean(onAccept) && !hasAgreed;
  const bothRead = readTabs.terms && readTabs.privacy;
  const otherTab = activeTab === 'terms' ? 'privacy' : 'terms';

  const checkReadEnd = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setReadTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
    }
  };

  // Each tab starts at the top; short content counts as read right away
  useEffect(() => {
    if (!isOpen) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = 0;
    const frame = requestAnimationFrame(() => {
      const box = bodyRef.current;
      if (box && box.scrollHeight <= box.clientHeight + 24) {
        setReadTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-5 animate-in fade-in duration-200 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      // The landing page's smooth scroll (Lenis) leaves the mouse wheel to this modal
      data-lenis-prevent
    >
      <ScrollLock />
      <div className="bg-white text-slate-800 w-full max-w-3xl rounded-t-[1.75rem] sm:rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] sm:max-h-[88vh]">
        
        {/* =========================================================================
            HEADER: Title, Subtitle, Legal Reference & Close Button
            ========================================================================= */}
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 id="legal-modal-title" className="font-display text-lg font-bold tracking-tight text-slate-900">
                Terms & privacy
              </h2>
              <p className="text-sm text-slate-500 truncate">Updated {LEGAL_UPDATED}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            TABS: Terms of Service vs Privacy Policy Switcher
            ========================================================================= */}
        <div className="mx-5 sm:mx-6 mb-3 p-1 rounded-full bg-slate-100 flex sm:inline-flex sm:self-start items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'terms' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'privacy' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy</span>
          </button>

        </div>

        {/* =========================================================================
            SCROLLABLE CONTENT BODY (Eye-Friendly Calm Slate Styling)
            ========================================================================= */}
        <div
          ref={bodyRef}
          onScroll={checkReadEnd}
          className="px-5 sm:px-7 py-5 sm:py-6 overflow-y-auto flex-1 min-h-0 border-t border-slate-200/80 text-slate-600 text-[15px] sm:text-sm leading-relaxed"
        >
          
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="animate-in fade-in duration-150">
              <TermsContent />
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY (DATA PRIVACY ACT OF 2012, RA 10173) */}
          {activeTab === 'privacy' && (
            <div className="animate-in fade-in duration-150">
              <PrivacyContent />
            </div>
          )}
        </div>

        {/* =========================================================================
            FOOTER CONTROLS: "Close Window" & "I Have Read & Agree to All Terms"
            ========================================================================= */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${hasAgreed || (mustRead && bothRead) ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span>
              {hasAgreed
                ? 'You have previously accepted these terms.'
                : !mustRead
                  ? 'Please review all terms carefully before agreeing.'
                  : bothRead
                    ? 'You have read both. You can agree now.'
                    : `Read to the end of Terms ${readTabs.terms ? '✓' : ''} and Privacy ${readTabs.privacy ? '✓' : ''} to agree.`}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition cursor-pointer"
            >
              Close
            </button>

            {onAccept &&
              (mustRead && !bothRead && readTabs[activeTab] && !readTabs[otherTab] ? (
                // This tab is done: take them to the other one
                <button
                  type="button"
                  onClick={() => setActiveTab(otherTab)}
                  className="flex-[2] sm:flex-none px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 cursor-pointer"
                >
                  <span>Next: {otherTab === 'privacy' ? 'Privacy' : 'Terms'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={mustRead && !bothRead}
                  title={mustRead && !bothRead ? 'Scroll to the end to continue' : undefined}
                  className="flex-[2] sm:flex-none px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-orange-500"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{mustRead && !bothRead ? 'Scroll to read' : 'I agree'}</span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MotoCareLogo from '../components/brand/MotoCareLogo';
import { LEGAL_UPDATED, PrivacyContent, TermsContent } from '../components/legal/LegalContent';

/** Public Terms and Privacy pages, with links anyone (and Google's app review) can open directly */
export default function Legal({ page }: { page: 'terms' | 'privacy' }) {
  const title = page === 'terms' ? 'Terms of Service' : 'Privacy Policy';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | MotoCare`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition ${
      isActive ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <header className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <Link to="/" aria-label="MotoCare home">
          <MotoCareLogo className="h-11 w-auto text-slate-900" />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-6">
        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">Updated {LEGAL_UPDATED}</p>
          <nav className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100" aria-label="Legal pages">
            <NavLink to="/terms" className={tabClass}>
              Terms
            </NavLink>
            <NavLink to="/privacy" className={tabClass}>
              Privacy
            </NavLink>
          </nav>
        </div>

        <div className="text-slate-600 text-[15px] sm:text-sm leading-relaxed">
          {page === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
      </main>
    </div>
  );
}

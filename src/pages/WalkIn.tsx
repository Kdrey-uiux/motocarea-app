import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Store,
  ClipboardList,
  Gauge,
  Banknote,
  UserPlus,
} from 'lucide-react';
import MotoCareLogo from '../components/brand/MotoCareLogo';

/**
 * Landing page for walk-in customers: no account and no online booking,
 * only the ticket number the shop wrote down for them (e.g. MC-W-4821).
 */

// Keeps letters, digits and dashes, and drops a typed or pasted "MC-" prefix
function cleanTicketInput(raw: string): string {
  let val = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (val.startsWith('MC-')) val = val.slice(3);
  return val.slice(0, 10);
}

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Check in at the counter',
    text: 'Our staff record your motorcycle and give you a ticket number like MC-W-4821.',
  },
  {
    icon: Gauge,
    title: 'Follow the repair here',
    text: 'Enter your ticket number and the date on your slip to see the current stage, from intake to ready for release.',
  },
  {
    icon: Banknote,
    title: 'Pick up and pay',
    text: 'When your motorcycle is ready, show your ticket number at the counter and pay in cash.',
  },
];

export default function WalkIn() {
  const navigate = useNavigate();
  const [ticketInput, setTicketInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = ticketInput.replace(/^-+|-+$/g, '');
    if (code) navigate(`/track/MC-${code}`);
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 py-2 text-xs font-semibold text-slate-600 hover:text-orange-600 transition whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span><span className="hidden sm:inline">Back to </span>Home</span>
          </Link>
          <MotoCareLogo className="h-10 sm:h-11 w-auto text-slate-900" />
          <Link
            to="/login"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3.5 py-2 rounded-full border border-orange-200/80 transition whitespace-nowrap"
          >
            Log In
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-xl mx-auto space-y-8">
          {/* Welcome + ticket lookup */}
          <section className="text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold shadow-2xs">
              <Store className="w-3.5 h-3.5 text-orange-500" />
              <span>Walk-in Customer</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight text-balance">
                Welcome to <span className="text-orange-500">MotoCare</span>
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                No online booking? No problem. Enter the ticket number our staff gave you to follow your
                motorcycle's repair. No account needed.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200/90 p-1.5 sm:p-2 rounded-2xl sm:rounded-full flex flex-col sm:flex-row gap-2 shadow-xs focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition"
            >
              <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 sm:py-0">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 font-bold font-mono text-xs sm:text-sm select-none shrink-0">
                  MC-
                </div>
                <input
                  type="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={10}
                  value={ticketInput}
                  onChange={(e) => setTicketInput(cleanTicketInput(e.target.value))}
                  placeholder="W-4821"
                  aria-label="Ticket number"
                  className="w-full min-w-0 bg-transparent text-slate-900 placeholder-slate-300 text-sm focus:outline-none font-mono font-bold tracking-wider"
                />
              </div>
              <button
                type="submit"
                disabled={!ticketInput.replace(/-/g, '')}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-full transition flex items-center justify-center gap-2 active:scale-95 shadow-sm shadow-orange-500/20 cursor-pointer whitespace-nowrap"
              >
                <span>Track My Repair</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[11px] text-slate-500">
              Your ticket number is on the slip from the counter, for example <span className="font-mono font-bold text-slate-700">MC-W-4821</span>.
              Lost it? Ask our staff at the counter.
            </p>
          </section>

          {/* How walk-in service works */}
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">How walk-in service works</h2>
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0">
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      {i + 1}. {step.title}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Next time, book online */}
          <section className="text-center space-y-3">
            <p className="text-xs text-slate-500">
              Want to skip the line next time? Create a free account to book online and keep your service history.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-full shadow-2xs transition"
            >
              <UserPlus className="w-4 h-4 text-orange-500" />
              <span>Create an Account</span>
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Wrench, Home as HomeIcon, Search } from 'lucide-react';

/** Shown for any link that doesn't match a page */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white">
            <Wrench className="w-4 h-4" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-slate-900">
            Moto<span className="text-orange-500">Care</span>
          </span>
        </Link>

        <div className="space-y-2">
          <p className="font-display text-6xl sm:text-7xl font-extrabold tracking-tight text-orange-500">404</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
          <p className="text-slate-500">
            The link may be mistyped or the page was moved. If you were looking for a repair, track it with your
            ticket number.
          </p>
        </div>

        <div className="flex flex-col min-[400px]:flex-row items-center justify-center gap-2">
          <Link
            to="/"
            className="w-full min-[400px]:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition active:scale-95"
          >
            <HomeIcon className="w-4 h-4" />
            Back to home
          </Link>
          <Link
            to="/track"
            className="w-full min-[400px]:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
          >
            <Search className="w-4 h-4" />
            Track my repair
          </Link>
        </div>
      </div>
    </main>
  );
}

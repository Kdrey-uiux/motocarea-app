import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import MotoCareLogo from './brand/MotoCareLogo';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches a page that crashes while rendering, or a page's code that fails to download
 * (common right after a new Vercel deploy), and shows a reload button instead of a blank screen.
 */
export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    const isOldVersion = /dynamically imported module|Failed to fetch|Loading chunk|Importing a module script/i.test(
      error.message
    );

    return (
      <main className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-5">
          <MotoCareLogo className="h-14 w-auto text-slate-900 mx-auto" />
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {isOffline ? "You're offline" : 'Something went wrong'}
            </h1>
            <p className="text-slate-500">
              {isOffline
                ? 'Check your internet connection, then reload the page.'
                : isOldVersion
                  ? 'MotoCare was just updated. Reload the page to get the latest version.'
                  : 'This page ran into a problem. Reloading usually fixes it. Your bookings and tickets are safe.'}
            </p>
          </div>
          <div className="flex flex-col min-[400px]:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-[400px]:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload page
            </button>
            <a
              href="/"
              className="w-full min-[400px]:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
            >
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }
}

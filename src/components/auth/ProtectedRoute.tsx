import { useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Wrench, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setIsAuthenticated(!!session);
          setLoading(false);
        }
      } catch (err) {
        console.error('Session verification error:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          setLoading(false);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsAuthenticated(!!session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/80 flex flex-col items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
        <div className="flex flex-col items-center space-y-4">
          {/* Animated MotoCare Emblem */}
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
              <Wrench className="w-6 h-6 animate-pulse" />
            </div>
            <div className="absolute -inset-1.5 rounded-3xl bg-orange-500/15 blur-sm -z-10 animate-pulse" />
          </div>

          {/* Brand Title & Loading Subtext */}
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
              <span>MotoCare</span>
              <span className="w-1 h-1 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold text-slate-500">Rider Portal</span>
            </h3>
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 pt-0.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
              <span>Verifying rider session...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

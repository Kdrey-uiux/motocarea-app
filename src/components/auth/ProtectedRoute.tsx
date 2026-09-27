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
      <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-3 shadow-xs animate-pulse">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Verifying rider session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

import { useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { verifyCustomerSession } from '../../lib/customerAuth';
import { Wrench } from 'lucide-react';

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
        // Verified with Supabase: deleted logins and admin/staff accounts cannot open the customer dashboard
        const result = await verifyCustomerSession();
        if (isMounted) {
          setIsAuthenticated(result.status === 'customer');
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

    const handlePageShow = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.replace('/login');
        }
      } catch {
        window.location.replace('/login');
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsAuthenticated(!!session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/80 flex flex-col items-center justify-center p-4 font-sans select-none animate-in fade-in duration-150">
        <div className="relative flex items-center justify-center">
          {/* Active Spinning Ring */}
          <div className="w-16 h-16 rounded-full border-3 border-orange-200 border-t-orange-500 animate-spin" />
          {/* Centered MotoCare Icon */}
          <div className="absolute w-9 h-9 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
            <Wrench className="w-4 h-4 animate-pulse" />
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

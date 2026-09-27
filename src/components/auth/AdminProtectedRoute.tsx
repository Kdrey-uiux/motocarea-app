import { useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Wrench, Loader2 } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyPersonnelAuth() {
      try {
        // 1. Suriin kung may active test override sa local storage
        const devOverride = localStorage.getItem('motocare_workshop_auth_override');
        if (devOverride === 'staff' || devOverride === 'admin') {
          if (isMounted) {
            setIsAuthorized(true);
            setLoading(false);
          }
          return;
        }

        // 2. Suriin ang Supabase Auth Session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (isMounted) {
            setIsAuthorized(false);
            setLoading(false);
          }
          return;
        }

        // 3. Suriin ang Role sa profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        const role = profile?.role?.toLowerCase();
        const allowedRoles = ['staff', 'admin', 'manager', 'owner', 'super_admin'];

        const hasAccess = Boolean(
          allowedRoles.includes(role || '') || 
          session.user.email?.includes('admin') || 
          session.user.email?.includes('staff')
        );

        if (isMounted) {
          setIsAuthorized(hasAccess);
          setLoading(false);
        }
      } catch (err) {
        console.error('Personnel verification error:', err);
        if (isMounted) {
          setIsAuthorized(false);
          setLoading(false);
        }
      }
    }

    verifyPersonnelAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      verifyPersonnelAuth();
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
          <span>Verifying workshop personnel clearance...</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

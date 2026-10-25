import { useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { verifyCustomerSession } from '../../lib/customerAuth';
import LoadingScreen from '../brand/LoadingScreen';

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

    // Logging out drops access at once; a new or refreshed login is re-verified as a customer
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (!session) {
        setIsAuthenticated(false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        checkAuth();
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
      <LoadingScreen />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

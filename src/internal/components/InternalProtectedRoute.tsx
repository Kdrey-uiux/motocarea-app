import { useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getInternalSession } from '../utils/internalAuth';

interface InternalProtectedRouteProps {
  children: ReactNode;
}

/**
 * Enterprise Route Guard for /internal
 * 1. Checks tab-isolated session synchronously before rendering any UI.
 * 2. Listens to browser BFCache 'pageshow' events: If user presses the Back (<)
 *    button after logout, immediately forces a hard redirect to /internal/login.
 */
export default function InternalProtectedRoute({ children }: InternalProtectedRouteProps) {
  const session = getInternalSession();

  // BFCache / Back-Forward Harang: Bounces any cached restoration if logged out
  useEffect(() => {
    const handlePageShow = () => {
      const activeSession = getInternalSession();
      if (!activeSession || activeSession.isActive === false) {
        window.location.replace('/internal/login');
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Strict session check: If no valid active personnel session, do NOT render child console
  if (!session || session.isActive === false) {
    return <Navigate to="/internal/login" replace />;
  }

  return <>{children}</>;
}

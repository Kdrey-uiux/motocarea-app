import { Navigate } from 'react-router-dom';

/**
 * Ghost Route: Automatically bounces any request to legacy /admin back to Home (/)
 * leaving zero public footprint of internal administrative consoles.
 */
export default function AdminRedirect() {
  return <Navigate to="/" replace />;
}

import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './AdminDashboard';

function ProtectedOperations({ children }: { children: React.ReactNode }) {
  const isAuth = Boolean(localStorage.getItem('motocare_workshop_auth_override'));
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route
        path="/*"
        element={
          <ProtectedOperations>
            <AdminDashboard />
          </ProtectedOperations>
        }
      />
    </Routes>
  );
}

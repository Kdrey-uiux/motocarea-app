import React, { useState } from 'react';
import { SuperAdminProfile } from './types/superadmin';
import {
  getStoredSuperAdminSession,
  clearStoredSuperAdminSession,
} from './utils/superAdminManager';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { SuperAdminDashboard } from './SuperAdminDashboard';

export function App() {
  const [session, setSession] = useState<SuperAdminProfile | null>(() =>
    getStoredSuperAdminSession()
  );

  const handleLogout = () => {
    clearStoredSuperAdminSession();
    setSession(null);
  };

  if (!session) {
    return <SuperAdminLogin onLoginSuccess={setSession} />;
  }

  return <SuperAdminDashboard profile={session} onLogout={handleLogout} />;
}

export default App;

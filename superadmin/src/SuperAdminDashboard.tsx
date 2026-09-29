import React, { useState } from 'react';
import { SuperAdminProfile, SuperAdminTab, WorkshopAdminAccount } from './types/superadmin';
import { getAdminAccounts } from './utils/superAdminManager';
import { SuperAdminHeader } from './components/SuperAdminHeader';
import { SuperAdminSidebar } from './components/SuperAdminSidebar';
import { SuperAdminAnalyticsTab } from './tabs/SuperAdminAnalyticsTab';
import { SuperAdminAdminsTab } from './tabs/SuperAdminAdminsTab';
import { SuperAdminAuditTab } from './tabs/SuperAdminAuditTab';
import { SuperAdminSettingsTab } from './tabs/SuperAdminSettingsTab';

interface SuperAdminDashboardProps {
  profile: SuperAdminProfile;
  onLogout: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ profile, onLogout }) => {
  const [currentTab, setCurrentTab] = useState<SuperAdminTab>('analytics');
  const [admins, setAdmins] = useState<WorkshopAdminAccount[]>(() => getAdminAccounts());

  const handleRefreshAdmins = () => {
    setAdmins(getAdminAccounts());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <SuperAdminHeader profile={profile} onLogout={onLogout} />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        <SuperAdminSidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          adminCount={admins.filter((a) => a.status === 'active').length}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {currentTab === 'analytics' && <SuperAdminAnalyticsTab />}

          {currentTab === 'admins' && (
            <SuperAdminAdminsTab
              admins={admins}
              onAdminsUpdated={handleRefreshAdmins}
              ownerName={profile.fullName}
            />
          )}

          {currentTab === 'audit' && <SuperAdminAuditTab />}

          {currentTab === 'settings' && <SuperAdminSettingsTab ownerName={profile.fullName} />}
        </main>
      </div>
    </div>
  );
};

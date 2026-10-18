import { useEffect, useState } from 'react';
import { fetchDatabaseStaffMembers } from './databaseStaffManager';

/**
 * Mechanics shown in the job pickers are the active staff accounts from Team.
 * Adding, renaming or deactivating someone in Team updates the pickers.
 */
export function useMechanics(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let isMounted = true;
    const load = () => {
      fetchDatabaseStaffMembers().then((staff) => {
        if (!isMounted) return;
        setNames(
          staff
            .filter((s) => s.isActive && s.role === 'staff')
            .map((s) => s.fullName.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
        );
      });
    };
    load();
    window.addEventListener('motocare_staff_updated', load);
    return () => {
      isMounted = false;
      window.removeEventListener('motocare_staff_updated', load);
    };
  }, []);
  return names;
}

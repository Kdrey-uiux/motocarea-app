import { InternalTab } from '../types/internal';

/** Human-readable page titles for the workshop console (sidebar + header) */
export const INTERNAL_TAB_TITLES: Record<InternalTab, string> = {
  actions: 'Action Center',
  queue: 'Workshop Queue',
  bays: 'Service Bays',
  billing: 'Counter Release',
  messages: 'Customer Messages',
  fleet: 'Vehicles',
  services: 'Services & Prices',
  dashboard: 'Owner Dashboard',
  staff: 'Team',
  audit: 'Activity Logs',
};

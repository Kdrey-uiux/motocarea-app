import { InternalTab } from '../types/internal';

/** Page title + one-line description shown in the console header (and the browser tab) */
export const INTERNAL_TAB_INFO: Record<InternalTab, { title: string; subtitle: string }> = {
  actions: { title: 'Action Center', subtitle: 'Everything customers did that needs a response.' },
  queue: { title: 'Workshop Queue', subtitle: 'Motorcycles in the shop, upcoming appointments, and finished jobs.' },
  bays: { title: 'Service Bays', subtitle: 'Which bays are free, in use, or under maintenance.' },
  billing: { title: 'Counter Release', subtitle: 'Hand finished motorcycles back to their owners.' },
  messages: { title: 'Customer Messages', subtitle: 'Chat with customers about their bookings and repairs.' },
  reviews: { title: 'Customer Reviews', subtitle: 'Choose which reviews show on the website, and reply as MotoCare.' },
  fleet: { title: 'Vehicles', subtitle: 'Customer motorcycles and the motorcycle model catalog.' },
  services: { title: 'Services & Prices', subtitle: 'Service packages and estimated prices customers can book.' },
  dashboard: { title: 'Owner Dashboard', subtitle: 'Overview of today’s workshop activity.' },
  staff: { title: 'Team', subtitle: 'Mechanics and staff accounts.' },
  audit: { title: 'Activity Logs', subtitle: 'Who did what, and when.' },
};

export const INTERNAL_TAB_TITLES: Record<InternalTab, string> = Object.fromEntries(
  Object.entries(INTERNAL_TAB_INFO).map(([tab, info]) => [tab, info.title])
) as Record<InternalTab, string>;

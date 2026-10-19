import { InternalTab } from '../types/internal';

/** Page title + one-line description shown in the console header (and the browser tab) */
export const INTERNAL_TAB_INFO: Record<InternalTab, { title: string; subtitle: string }> = {
  queue: { title: 'Workshop Queue', subtitle: 'Motorcycles in the shop, upcoming appointments, and finished jobs.' },
  bays: { title: 'Service Bays', subtitle: 'Which bays are free, in use, or under maintenance.' },
  messages: { title: 'Customer Messages', subtitle: 'Chat with customers about their bookings and repairs.' },
  reviews: { title: 'Customer Reviews', subtitle: 'Choose which reviews show on the website, and reply as MotoCare.' },
  fleet: { title: 'Vehicles', subtitle: 'Customer motorcycles and the motorcycle model catalog.' },
  services: { title: 'Services', subtitle: 'Service packages customers can book.' },
  dashboard: { title: 'Dashboard', subtitle: 'Overview of today’s workshop activity.' },
  staff: { title: 'Team', subtitle: 'Owner and staff accounts.' },
  audit: { title: 'Activity Logs', subtitle: 'Who did what, and when.' },
};

export const INTERNAL_TAB_TITLES: Record<InternalTab, string> = Object.fromEntries(
  Object.entries(INTERNAL_TAB_INFO).map(([tab, info]) => [tab, info.title])
) as Record<InternalTab, string>;

/** URL path for each console page, e.g. /internal/queue */
export const INTERNAL_TAB_SLUGS: Record<InternalTab, string> = {
  dashboard: 'dashboard',
  queue: 'queue',
  bays: 'bays',
  messages: 'messages',
  reviews: 'reviews',
  fleet: 'vehicles',
  services: 'services',
  staff: 'team',
  audit: 'activity-logs',
};

export function internalTabPath(tab: InternalTab): string {
  return `/internal/${INTERNAL_TAB_SLUGS[tab]}`;
}

/** The console page for a URL slug, or null when the slug is unknown */
export function internalTabFromSlug(slug: string): InternalTab | null {
  const match = (Object.keys(INTERNAL_TAB_SLUGS) as InternalTab[]).find((tab) => INTERNAL_TAB_SLUGS[tab] === slug);
  return match ?? null;
}

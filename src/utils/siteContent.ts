import { useSyncExternalStore } from 'react';
import {
  readSharedSetting,
  saveSharedSetting,
  setSharedSettingCache,
  SHARED_SETTINGS,
} from '../lib/sharedSettings';

/**
 * Website text the shop owner can change (Settings -> Website content).
 * Stored in app_settings ('site_content', migration 22) and shown live on every device.
 * Until the owner saves something, the original text below is used.
 */
export interface SiteServiceCard {
  title: string;
  description: string;
}

export interface SiteContent {
  address: string;
  phone: string;
  /** Empty hides the email everywhere */
  email: string;
  openDays: string;
  openHours: string;
  closedDays: string;
  heroLocation: string;
  heroHeadline: string;
  heroDescription: string;
  /** The 8 cards on the landing page; each keeps its own icon */
  services: SiteServiceCard[];
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  address: 'Cay Ban Ban St, Parada, Santa Maria, 3022 Bulacan',
  phone: '+63 985 245 5897',
  email: '',
  openDays: 'Monday – Saturday',
  openHours: '8:00 AM – 6:00 PM',
  closedDays: 'Sunday',
  heroLocation: 'Santa Maria, Bulacan',
  heroHeadline: 'Your Motorcycle Deserves Expert Care',
  heroDescription: 'Book a service online, follow every repair stage live, and ride out knowing exactly what was done.',
  services: [
    { title: 'Oil Change & Inspection', description: 'Synthetic oil replacement, magnetic plug cleaning, strainer check, and a safety inspection.' },
    { title: 'Brake System Service', description: 'Brake pad replacement, caliper overhaul, rotor inspection, and DOT 4 fluid bleeding.' },
    { title: 'Comprehensive PMS', description: 'Full preventive maintenance, valve clearance check, spark plug check, and chassis bolt torquing.' },
    { title: 'FI & Throttle Body', description: 'Scanner diagnostics, fault code clearing, injector cleaning, and throttle body recalibration.' },
    { title: 'Custom Mods & Upgrades', description: 'Exhaust fitting, suspension upgrades, crash guards, handlebar setup, and accessories.' },
    { title: 'Electrical & Diagnostics', description: 'Battery load testing, stator and regulator check, wiring repair, and starter circuit tests.' },
    { title: 'Tire & Wheel Service', description: 'Scratch-free tire mounting, wheel balancing, rim truing, and puncture repairs.' },
    { title: 'CVT & Transmission Care', description: 'Drive belt inspection, pulley and roller cleaning, clutch bell deglazing, and regreasing.' },
  ],
};

/** Longest text each field accepts, so the page layout holds */
export const SITE_LIMITS = {
  address: 120,
  phone: 20,
  email: 80,
  openDays: 40,
  openHours: 40,
  closedDays: 40,
  heroLocation: 40,
  heroHeadline: 50,
  heroDescription: 160,
  serviceTitle: 28,
  serviceDescription: 110,
  /** One word in the big headline can't be wider than a phone screen */
  headlineWord: 12,
} as const;

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Saved content over the original, so a missing or damaged field can't break the page */
function normalize(saved: unknown): SiteContent {
  const d = DEFAULT_SITE_CONTENT;
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};
  const savedCards = Array.isArray(s.services) ? (s.services as unknown[]) : [];
  return {
    address: text(s.address, d.address) || d.address,
    phone: text(s.phone, d.phone) || d.phone,
    email: text(s.email, d.email),
    openDays: text(s.openDays, d.openDays) || d.openDays,
    openHours: text(s.openHours, d.openHours) || d.openHours,
    closedDays: text(s.closedDays, d.closedDays),
    heroLocation: text(s.heroLocation, d.heroLocation) || d.heroLocation,
    heroHeadline: text(s.heroHeadline, d.heroHeadline) || d.heroHeadline,
    heroDescription: text(s.heroDescription, d.heroDescription) || d.heroDescription,
    services: d.services.map((card, i) => {
      const c = (savedCards[i] && typeof savedCards[i] === 'object' ? savedCards[i] : {}) as Record<string, unknown>;
      return {
        title: text(c.title, card.title) || card.title,
        description: text(c.description, card.description) || card.description,
      };
    }),
  };
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SHARED_SETTINGS.siteContent.event, onChange);
  return () => window.removeEventListener(SHARED_SETTINGS.siteContent.event, onChange);
}

// useSyncExternalStore needs the same object back until the content really changes
let cachedKey: string | null = null;
let cachedContent: SiteContent = DEFAULT_SITE_CONTENT;

export function getSiteContent(): SiteContent {
  const saved = readSharedSetting<unknown>(SHARED_SETTINGS.siteContent, null);
  const key = JSON.stringify(saved);
  if (key !== cachedKey) {
    cachedKey = key;
    cachedContent = saved === null ? DEFAULT_SITE_CONTENT : normalize(saved);
  }
  return cachedContent;
}

/** Website content that updates live when the owner saves */
export function useSiteContent(): SiteContent {
  return useSyncExternalStore(subscribe, getSiteContent, () => DEFAULT_SITE_CONTENT);
}

/** Saves the content (owner only; the database refuses anyone else) */
export async function saveSiteContent(
  content: SiteContent,
  actorName?: string
): Promise<{ success: boolean; error?: string }> {
  const previous = readSharedSetting<unknown>(SHARED_SETTINGS.siteContent, null);
  const result = await saveSharedSetting(SHARED_SETTINGS.siteContent, content, actorName);
  if (!result.success) setSharedSettingCache(SHARED_SETTINGS.siteContent, previous);
  return result;
}

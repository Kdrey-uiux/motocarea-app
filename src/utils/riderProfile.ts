import { phMobileDigits } from './validators';

/**
 * Version of the Terms of Service / Privacy Policy a rider agrees to.
 * Saved with their consent (profiles.terms_version, migration 19); bump it when the
 * legal text changes so riders are asked to agree again.
 */
export const TERMS_VERSION = '2026-10';

export interface RiderProfileFields {
  full_name?: string | null;
  phone_number?: string | null;
  terms_accepted_at?: string | null;
}

/**
 * A rider can use the dashboard once the shop can reach them and they agreed to the Terms:
 * a real name, a PH mobile number, and consent on file. Google sign-ups start without the
 * last two, so they finish on the Complete your profile page first.
 * (The database checks the same before a booking: rider_profile_complete, migration 19.)
 */
export function isRiderProfileComplete(profile: RiderProfileFields | null | undefined): boolean {
  if (!profile) return false;
  const name = (profile.full_name || '').trim();
  return (
    name.length >= 2 &&
    name !== 'Rider Customer' &&
    Boolean(phMobileDigits(profile.phone_number || '')) &&
    Boolean(profile.terms_accepted_at)
  );
}

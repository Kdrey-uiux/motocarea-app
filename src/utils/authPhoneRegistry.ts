const REGISTRY_STORAGE_KEY = 'motocare_auth_phone_directory';
const SYNC_CHANNEL = 'motocare_auth_sync';

/**
 * Extracts the 10-digit Philippine mobile number base (e.g. 9171234567).
 * Works from 10-digit (9171234567), 11-digit (09171234567), or 12-digit (+639171234567).
 */
export function extract10DigitPhone(raw: string): string {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('639') && cleaned.length >= 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('09') && cleaned.length >= 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned.slice(0, 10);
}

/**
 * Checks if an input string is formatted as a phone number rather than an email address.
 */
export function isPhoneFormat(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.includes('@')) return false;
  const digitsOnly = trimmed.replace(/[\s-+]/g, '');
  return /^\d{10,12}$/.test(digitsOnly);
}

/**
 * Retrieves the full phone-to-email mapping directory from persistent storage.
 */
export function getPhoneDirectory(): Record<string, string> {
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Registers and persists the association between a mobile number (10-digit or 11-digit) and an email address.
 * Automatically saves all variations (9171234567, 09171234567, +639171234567) for friction-free login.
 */
export function registerPhoneMapping(phone: string, email: string): void {
  try {
    const base10 = extract10DigitPhone(phone);
    const cleanEmail = email.trim().toLowerCase();
    if (!base10 || base10.length !== 10 || !cleanEmail) return;

    const directory = getPhoneDirectory();
    // Index all common lookup formats
    directory[base10] = cleanEmail; // 9171234567
    directory['0' + base10] = cleanEmail; // 09171234567
    directory['+63' + base10] = cleanEmail; // +639171234567

    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(directory));

    // Broadcast update across open tabs and windows
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel(SYNC_CHANNEL);
        channel.postMessage({
          action: 'PHONE_DIRECTORY_UPDATED',
          phone: base10,
          email: cleanEmail,
        });
        channel.close();
      } catch {
        // Fallback silently
      }
    }
  } catch (err) {
    console.warn('Failed to persist phone-to-email mapping:', err);
  }
}

/**
 * Resolves an email address from any format of a registered mobile number.
 * Returns null if not found.
 */
export function resolveEmailFromPhone(phone: string): string | null {
  const base10 = extract10DigitPhone(phone);
  const directory = getPhoneDirectory();
  return (
    directory[base10] ||
    directory['0' + base10] ||
    directory['+63' + base10] ||
    null
  );
}

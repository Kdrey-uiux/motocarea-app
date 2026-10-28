/**
 * Valid model years generation (1980 - present)
 */
export const MODEL_YEARS = Array.from({ length: 47 }, (_, i) => (2026 - i).toString());

/**
 * Philippine LTO Plate & MV File Validation
 * Supports:
 * - Modern 2 Letters + 4/5 digits (e.g. ND 45821)
 * - Old 3 Letters + 3/4 digits (e.g. ABC 1234)
 * - Old motorcycle 4 digits + 2 letters, or 3 digits + 3 letters (e.g. 1234 AB, 123 ABC)
 * - MV File Number (e.g. 1301-00000123456)
 */
export const isValidLTOPlate = (plate: string): boolean => {
  const cleaned = plate.trim().toUpperCase();
  const modern = /^[A-Z]{2}\s?\d{4,5}$/;
  const old = /^[A-Z]{3}\s?\d{3,4}$/;
  const oldMotorcycle = /^(\d{4}\s?[A-Z]{2}|\d{3}\s?[A-Z]{3})$/;
  const mvFile = /^\d{4}[-\s]?\d{6,12}$/;

  return modern.test(cleaned) || old.test(cleaned) || oldMotorcycle.test(cleaned) || mvFile.test(cleaned);
};

/** Common keyboard mashing / spam patterns (same rule as rider sign-up) */
export const KEYBOARD_MASH_REGEX = /(?:asdf|wasd|qwer|zxcv|hjkl|dfgh|jkl;|poiu|poa|qwe|zxc|asd|fgh|jkl|lkj|mnb|poi)/i;

/* Realistic first / last names for rider accounts (sign-up and Complete your profile) */
// Whitelist of valid 2-letter surnames in the Philippines (mostly Chinese-Filipino roots)
const VALID_2_LETTER_SURNAMES = new Set([
  'sy', 'uy', 'po', 'yu', 'co', 'go', 'ng', 'ho', 'lo', 'do', 'wu', 'li', 'lu', 'su', 'ku'
]);

// Whitelist of valid 2-letter first names
const VALID_2_LETTER_FIRST_NAMES = new Set([
  'jo', 'al', 'ed', 'ty', 'bo', 'cy', 'vy', 'lu', 'li', 'an', 'aj', 'cj', 'dj', 'rj', 'pj', 'tj', 'mj', 'bj', 'jj', 'kc'
]);

// 1. Realistic First Name Validation
export function validateFirstName(nameStr: string): { isValid: boolean; error: string | null } {
  const trimmed = nameStr.trim();
  if (!trimmed) {
    return { isValid: false, error: 'First name is required.' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Must be at least 2 characters.' };
  }
  if (trimmed.length > 40) {
    return { isValid: false, error: 'Must be 40 characters or less.' };
  }
  // Only letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s'-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Letters and spaces only (no numbers or symbols).' };
  }
  // Check 2-letter first names
  if (trimmed.length === 2 && !VALID_2_LETTER_FIRST_NAMES.has(trimmed.toLowerCase())) {
    return { isValid: false, error: 'Please enter a valid first name (e.g. Juan, Maria, Mark).' };
  }
  // Block keyboard mashing patterns (like "poa", "asdf", "wasd")
  if (KEYBOARD_MASH_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a realistic first name (no keyboard letters).' };
  }
  // Block repeating identical characters (e.g. "aaa", "xxx")
  if (/(.)\1{2,}/i.test(trimmed)) {
    return { isValid: false, error: 'Name cannot contain repeated identical letters.' };
  }
  // Must contain at least one vowel and one consonant
  if (!/[aeiouyAEIOUY]/.test(trimmed) || !/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]/i.test(trimmed)) {
    return { isValid: false, error: 'Please enter a realistic first name.' };
  }
  // Block 4+ consecutive consonants or 3+ consecutive vowels
  if (/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{4,}/i.test(trimmed) || /[aeiouyAEIOUY]{3,}/i.test(trimmed)) {
    return { isValid: false, error: 'Invalid name pattern detected. Please enter a real name.' };
  }
  return { isValid: true, error: null };
}

// 2. Realistic Last Name Validation (rejection of "sa", "poa", etc.)
export function validateLastName(nameStr: string): { isValid: boolean; error: string | null } {
  const trimmed = nameStr.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Last name is required.' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Must be at least 2 characters.' };
  }
  if (trimmed.length > 40) {
    return { isValid: false, error: 'Must be 40 characters or less.' };
  }
  // Only letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s'-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Letters and spaces only (no numbers or symbols).' };
  }
  // 2-letter surnames MUST be in the recognized Philippine list (Sy, Uy, Po, Yu, Co, etc.)
  if (trimmed.length === 2 && !VALID_2_LETTER_SURNAMES.has(trimmed.toLowerCase())) {
    return { isValid: false, error: 'Please enter a valid last name (e.g. Dela Cruz, Santos, Garcia, Sy).' };
  }
  // Block keyboard mashing patterns
  if (KEYBOARD_MASH_REGEX.test(trimmed)) {
    return { isValid: false, error: 'Please enter a realistic last name (no keyboard letters).' };
  }
  // Block repeating identical characters
  if (/(.)\1{2,}/i.test(trimmed)) {
    return { isValid: false, error: 'Last name cannot contain repeated identical letters.' };
  }
  // Must contain at least one vowel and one consonant (unless valid 2-letter like "Ng")
  if (trimmed.toLowerCase() !== 'ng') {
    if (!/[aeiouyAEIOUY]/.test(trimmed) || !/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]/i.test(trimmed)) {
      return { isValid: false, error: 'Please enter a realistic last name.' };
    }
  }
  // Block 4+ consecutive consonants or 3+ consecutive vowels
  if (/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{4,}/i.test(trimmed) || /[aeiouyAEIOUY]{3,}/i.test(trimmed)) {
    return { isValid: false, error: 'Invalid name pattern detected. Please enter a real name.' };
  }
  return { isValid: true, error: null };
}

/** Error text for a field, or null when it's fine */
export type FieldError = string | null;

/**
 * A person's name typed by staff at the counter (first name only is OK).
 * Letters (incl. ñ and accents), spaces, dots, hyphens and apostrophes; no keyboard mashing.
 */
export function validatePersonName(raw: string): FieldError {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return 'Enter the customer’s name.';
  if (name.length < 2) return 'Name is too short.';
  if (name.length > 60) return 'Keep the name under 60 characters.';
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(name)) return 'Use letters only (no numbers or symbols).';
  if (/(\p{L})\1{2,}/iu.test(name)) return 'Check the spelling (repeated letters).';
  if (KEYBOARD_MASH_REGEX.test(name)) return 'Enter a real name (not random keys).';
  // Every word needs a vowel, except initials like "J." and short surnames like "Ng"
  const looksReal = name
    .split(' ')
    .every((w) => w.endsWith('.') || w.toLowerCase() === 'ng' || /[aeiouyáéíóú]/i.test(w));
  if (!looksReal || /[bcdfghjklmnpqrstvwxz]{5,}/i.test(name)) return 'Enter a real name.';
  return null;
}

/**
 * Philippine mobile numbers in any common form: 0917 123 4567, 917 123 4567, +63 917 123 4567.
 * Returns the 10 digits after +63 (9XXXXXXXXX), or null when it isn't a PH mobile number.
 */
export function phMobileDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits) ? digits : null;
}

/** For a +63 field that holds the 10 digits after +63 (9XXXXXXXXX) */
export function validatePHMobile(raw: string): FieldError {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 'Enter a mobile number.';
  if (phMobileDigits(raw)) return null;
  const local = digits.startsWith('63') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits;
  if (!local.startsWith('9')) return 'Must start with 9, e.g. 917 123 4567.';
  if (local.length < 10) return `Incomplete number (${local.length} of 10 digits).`;
  return 'Too many digits. Use 10 digits after +63.';
}

/**
 * Typing or pasting into a +63 field: keeps digits only, drops a leading 0 or 63,
 * and stops at 10 digits ("0917-123-4567" -> "9171234567").
 */
export function toPHMobileInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length > 10) digits = digits.slice(2);
  digits = digits.replace(/^0+/, '');
  return digits.slice(0, 10);
}

/** Shown and saved as "+63 917 123 4567" */
export function formatPHMobile(digits10: string): string {
  return `+63 ${digits10.slice(0, 3)} ${digits10.slice(3, 6)} ${digits10.slice(6)}`;
}

export function validatePlate(raw: string): FieldError {
  const plate = raw.trim();
  if (!plate) return 'Enter the plate number.';
  if (!isValidLTOPlate(plate)) return 'Not a valid plate. Examples: NDE 1234, AB 12345, or an MV file no.';
  return null;
}

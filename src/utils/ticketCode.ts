/**
 * Hard-to-guess reference codes: MC-7KQ4P9 (online booking), MC-W-7KQ4P9 (walk-in),
 * HR-7KQ4P9 (hardcopy request).
 *
 * 6 characters from a 30-character alphabet = ~729 million combinations, picked with
 * crypto.getRandomValues (not Math.random). The alphabet drops look-alikes (0/O, 1/I/L)
 * so codes are easy to read off a slip, and drops W so "MC-W…" always means walk-in.
 * Older codes (MC-1234, MC-W-4821, HR-123456) still work for tracking.
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVXYZ';
export const CODE_LENGTH = 6;

function randomPart(length = CODE_LENGTH): string {
  const n = CODE_ALPHABET.length;
  // Reject bytes above the largest multiple of n so every character is equally likely
  const limit = 256 - (256 % n);
  let out = '';
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit) out += CODE_ALPHABET[b % n];
      if (out.length === length) break;
    }
  }
  return out;
}

export const newTicketCode = () => `MC-${randomPart()}`;
export const newWalkInCode = () => `MC-W-${randomPart()}`;
export const newHardcopyId = () => `HR-${randomPart()}`;

/**
 * Turns what a person typed ("7kq4p9", "MC-7KQ4P9", "w-7kq4p9", "W4821") into a ticket code.
 */
export function normalizeTicketCode(input: string): string {
  let cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('MC-')) cleaned = cleaned.slice(3);
  // W is not in the alphabet, so a leading W is always a walk-in ticket
  if (cleaned.startsWith('W')) return `MC-W-${cleaned.slice(1).replace(/[^A-Z0-9]/g, '')}`;
  return `MC-${cleaned.replace(/[^A-Z0-9]/g, '')}`;
}

/**
 * MotoCare Customer Review & Post-Service Feedback Utility
 * Portable parser and formatter for customer star ratings and feedback.
 */

export interface TicketReview {
  rating: number; // 1 to 5
  comment: string;
  reviewed_at: string;
  reviewer_name?: string;
  bike_model?: string;
}

/**
 * Parses and extracts customer review from ticket notes if available.
 */
export function parseTicketReview(notes?: string | null): TicketReview | null {
  if (!notes) return null;
  const match = notes.match(/\[REVIEW:({.*?})\]/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    if (typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 5) {
      return data as TicketReview;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns clean user-facing notes without the internal [REVIEW:...] metadata tag.
 */
export function cleanCustomerNotes(notes?: string | null): string {
  if (!notes) return '';
  return notes.replace(/\[REVIEW:({.*?})\]/g, '').trim();
}

/**
 * Appends or replaces the structured review tag in the ticket's notes string.
 */
export function attachTicketReview(originalNotes: string = '', review: TicketReview): string {
  const clean = cleanCustomerNotes(originalNotes);
  const tag = `[REVIEW:${JSON.stringify(review)}]`;
  return clean ? `${clean}\n${tag}` : tag;
}

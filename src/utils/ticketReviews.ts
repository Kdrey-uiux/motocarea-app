import { db } from '../lib/supabase';

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

/**
 * Privacy-safe public name: first name + last initial (e.g. "Kurt Andrei Alerta" -> "Kurt A.").
 */
export function formatPublicReviewerName(fullName?: string | null): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Verified Rider';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

/**
 * Saves a customer's review: writes the [REVIEW] tag into the ticket notes (used by the
 * workshop console) and upserts the public-safe copy shown on the landing page.
 */
export async function submitTicketReview(
  ticket: {
    id: string;
    notes?: string | null;
    user_id?: string | null;
    service_type?: string | null;
  },
  review: TicketReview
): Promise<{ updatedNotes: string }> {
  const updatedNotes = attachTicketReview(ticket.notes || '', review);

  const { error: ticketError } = await db()
    .from('service_tickets')
    .update({ notes: updatedNotes })
    .eq('id', ticket.id);
  if (ticketError) throw ticketError;

  // The public landing-page copy is secondary: never fail the customer's review because of it.
  // Missed copies can be re-synced from the notes with 09_backfill_customer_reviews.sql.
  const { error: reviewError } = await db().from('customer_reviews').upsert(
    {
      ticket_id: ticket.id,
      user_id: ticket.user_id || null,
      rating: review.rating,
      comment: review.comment || null,
      display_name: formatPublicReviewerName(review.reviewer_name),
      bike_model: review.bike_model || null,
      service_type: ticket.service_type || null,
    },
    { onConflict: 'ticket_id' }
  );
  if (reviewError) {
    console.warn('Review saved, but the public landing-page copy failed:', reviewError.message);
  }

  return { updatedNotes };
}

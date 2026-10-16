import { getInternalAuthedClient } from './internalAuth';
import { recordAuditLog } from './databaseAuditLogger';

/**
 * Admin/staff moderation of customer reviews (table: customer_reviews).
 * Uses the signed-in workshop session because hidden reviews are only visible to
 * workshop users under RLS (migration 10_review_moderation.sql).
 */
export interface ModeratedReview {
  id: string;
  ticket_id: string;
  rating: number;
  comment: string | null;
  display_name: string;
  bike_model: string | null;
  service_type: string | null;
  is_published: boolean;
  shop_reply: string | null;
  replied_by: string | null;
  replied_at: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
}

export type ReviewModerationStatus = 'pending' | 'published' | 'hidden';

export function getReviewStatus(review: ModeratedReview): ReviewModerationStatus {
  if (review.is_published) return 'published';
  return review.moderated_at ? 'hidden' : 'pending';
}

const SESSION_EXPIRED = 'Your workshop session has expired. Please sign out and sign in again.';

export async function fetchAllReviews(): Promise<{ reviews: ModeratedReview[]; error?: string }> {
  const client = await getInternalAuthedClient();
  if (!client) return { reviews: [], error: SESSION_EXPIRED };

  const { data, error } = await client
    .from('customer_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { reviews: [], error: error.message };
  return { reviews: (data || []) as ModeratedReview[] };
}

async function updateReview(
  id: string,
  changes: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const client = await getInternalAuthedClient();
  if (!client) return { success: false, error: SESSION_EXPIRED };

  const { data, error } = await client.from('customer_reviews').update(changes).eq('id', id).select('id');
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'Permission denied. Make sure migration 10_review_moderation.sql has been run and your account is admin/staff.',
    };
  }
  return { success: true };
}

export async function setReviewPublished(
  review: ModeratedReview,
  publish: boolean,
  actor: string,
  ticketCode: string
): Promise<{ success: boolean; error?: string }> {
  const result = await updateReview(review.id, {
    is_published: publish,
    moderated_by: actor,
    moderated_at: new Date().toISOString(),
  });

  if (result.success) {
    await recordAuditLog({
      ticketCode,
      action: publish ? 'REVIEW_PUBLISHED' : 'REVIEW_HIDDEN',
      actor,
      details: `${publish ? 'Published' : 'Hid'} ${review.rating}-star review by ${review.display_name} ${
        publish ? 'on' : 'from'
      } the public website.`,
      previousValue: getReviewStatus(review),
      newValue: publish ? 'published' : 'hidden',
    });
  }
  return result;
}

export async function saveShopReply(
  review: ModeratedReview,
  reply: string,
  actor: string,
  ticketCode: string
): Promise<{ success: boolean; error?: string }> {
  const cleanReply = reply.trim();
  const result = await updateReview(review.id, {
    shop_reply: cleanReply || null,
    replied_by: cleanReply ? actor : null,
    replied_at: cleanReply ? new Date().toISOString() : null,
  });

  if (result.success) {
    await recordAuditLog({
      ticketCode,
      action: cleanReply ? 'REVIEW_REPLIED' : 'REVIEW_REPLY_REMOVED',
      actor,
      details: cleanReply
        ? `Replied to ${review.display_name}'s review: "${cleanReply}"`
        : `Removed the shop reply on ${review.display_name}'s review.`,
      previousValue: review.shop_reply || 'None',
      newValue: cleanReply || 'None',
    });
  }
  return result;
}

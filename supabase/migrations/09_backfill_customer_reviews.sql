-- =========================================================================
-- 09: BACKFILL CUSTOMER REVIEWS — kopyahin ang lumang reviews mula sa notes
-- MotoCare Workshop Management System
-- Reviews submitted before 08_customer_reviews.sql existed live only in the
-- [REVIEW:{...}] tag of service_tickets.notes. This copies them into
-- customer_reviews so they appear on the landing page.
-- Safe to re-run: tickets that already have a row are skipped.
-- =========================================================================

INSERT INTO public.customer_reviews (
  ticket_id, user_id, rating, comment, display_name, bike_model, service_type, created_at
)
SELECT
  t.id,
  t.user_id,
  (r.review->>'rating')::smallint,
  NULLIF(trim(r.review->>'comment'), ''),
  -- Privacy-safe public name: first name + last initial (same rule as formatPublicReviewerName)
  CASE
    WHEN n.parts IS NULL THEN 'Verified Rider'
    WHEN array_length(n.parts, 1) = 1 THEN n.parts[1]
    ELSE n.parts[1] || ' ' || upper(left(n.parts[array_length(n.parts, 1)], 1)) || '.'
  END,
  NULLIF(r.review->>'bike_model', ''),
  t.service_type,
  COALESCE((r.review->>'reviewed_at')::timestamptz, t.updated_at)
FROM public.service_tickets t
CROSS JOIN LATERAL (
  SELECT substring(t.notes FROM '\[REVIEW:(\{.*?\})\]')::jsonb AS review
) r
CROSS JOIN LATERAL (
  SELECT regexp_split_to_array(NULLIF(trim(r.review->>'reviewer_name'), ''), '\s+') AS parts
) n
WHERE t.notes LIKE '%[REVIEW:%'
  AND r.review IS NOT NULL
  AND (r.review->>'rating')::int BETWEEN 1 AND 5
ON CONFLICT (ticket_id) DO NOTHING
RETURNING ticket_id, rating, display_name, comment;

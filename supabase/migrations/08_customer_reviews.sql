-- =========================================================================
-- 08: CUSTOMER REVIEWS — public-safe reviews na ipinapakita sa landing page
-- MotoCare Workshop Management System
-- Holds only what is safe to show publicly (short display name, rating, comment,
-- bike, service) so the landing page never needs to read service_tickets.notes.
-- The [REVIEW:{...}] tag in service_tickets.notes is still written for the
-- existing workshop console views.
-- =========================================================================

CREATE TABLE public.customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  display_name TEXT NOT NULL DEFAULT 'Verified Rider',
  bike_model TEXT,
  service_type TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_reviews_published ON public.customer_reviews (is_published, created_at DESC);

CREATE TRIGGER trigger_customer_reviews_updated_at
BEFORE UPDATE ON public.customer_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aggregate rating for the landing page (respects the table's RLS: published reviews only)
CREATE VIEW public.customer_review_stats WITH (security_invoker = true) AS
SELECT
  COUNT(*)::int AS review_count,
  COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating
FROM public.customer_reviews
WHERE is_published = true;

-- RLS: anyone (including the public landing page) can read PUBLISHED reviews only.
-- Admin can hide a review with: UPDATE public.customer_reviews SET is_published = false WHERE id = '...';
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published reviews" ON public.customer_reviews FOR SELECT USING (is_published = true);
-- TODO: restrict writes to the ticket's owner right after the reset (security item #3).
CREATE POLICY "Temp: allow insert customer_reviews" ON public.customer_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Temp: allow update customer_reviews" ON public.customer_reviews FOR UPDATE USING (true) WITH CHECK (true);

-- Realtime: landing page shows new reviews live
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_reviews;

NOTIFY pgrst, 'reload schema';

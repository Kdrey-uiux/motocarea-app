-- =========================================================================
-- 10: REVIEW MODERATION — itago, i-approve, at sagutin ang customer reviews
-- MotoCare Workshop Management System
-- - 1–2 star reviews start hidden ("Needs Approval") until admin/staff approve them
-- - Admin/staff can see every review (incl. hidden) and publish, hide, or reply
-- - Moderation states: Published = is_published
--                      Needs Approval = NOT is_published AND moderated_at IS NULL
--                      Hidden = NOT is_published AND moderated_at IS NOT NULL
-- Safe to re-run.
-- =========================================================================

ALTER TABLE public.customer_reviews
  ADD COLUMN IF NOT EXISTS shop_reply TEXT,
  ADD COLUMN IF NOT EXISTS replied_by TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- Low ratings wait for approval (also when a customer lowers an existing rating)
CREATE OR REPLACE FUNCTION public.hold_low_rating_reviews()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating <= 2 AND (TG_OP = 'INSERT' OR NEW.rating IS DISTINCT FROM OLD.rating) THEN
    NEW.is_published := false;
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hold_low_rating_reviews ON public.customer_reviews;
CREATE TRIGGER trigger_hold_low_rating_reviews
BEFORE INSERT OR UPDATE OF rating ON public.customer_reviews
FOR EACH ROW EXECUTE FUNCTION public.hold_low_rating_reviews();

-- Move existing unmoderated low ratings into "Needs Approval"
UPDATE public.customer_reviews
SET is_published = false
WHERE rating <= 2 AND moderated_at IS NULL;

-- Helper: is the current signed-in user workshop staff or admin?
CREATE OR REPLACE FUNCTION public.is_workshop_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Workshop users see and moderate every review; the public still sees published ones only
DROP POLICY IF EXISTS "Workshop read all reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Workshop moderate reviews" ON public.customer_reviews;
CREATE POLICY "Workshop read all reviews" ON public.customer_reviews
  FOR SELECT TO authenticated USING (public.is_workshop_user());
CREATE POLICY "Workshop moderate reviews" ON public.customer_reviews
  FOR UPDATE TO authenticated USING (public.is_workshop_user()) WITH CHECK (public.is_workshop_user());

NOTIFY pgrst, 'reload schema';

-- Result check: the low-rating reviews should now be waiting for approval
SELECT display_name, rating, is_published, left(comment, 40) AS comment
FROM public.customer_reviews
ORDER BY rating, created_at DESC;

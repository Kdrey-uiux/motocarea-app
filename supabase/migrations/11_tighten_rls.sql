-- =========================================================================
-- 11: TIGHTEN RLS — palitan ang "Temp: allow all" policies ng totoong rules
-- MotoCare Workshop Management System
--
-- Who can do what after this migration:
--   Public (not signed in) : published reviews, review stats, app settings, motorcycle models,
--                            ticket tracking via track_ticket(), booking counts via get_booking_counts()
--   Customer               : only their own profile, motorcycles, tickets, messages, reviews
--   Staff / Admin          : everything in the workshop (is_workshop_user())
--   Admin only             : change other people's profiles (roles, deactivate staff)
--
-- Extra safety (triggers):
--   - Customers can't give themselves a staff/admin role or reactivate themselves
--   - Customers can't move their own ticket forward (stage, bay, mechanic, release, ...)
--   - Online bookings respect the 6-per-day limit and Sunday closing on the server too
--   - Customers can't publish their own hidden review
--
-- Requires the app version that uses db() (staff console signs in with its own client).
-- Safe to re-run. SQL Editor / service role requests are never blocked by the triggers.
-- =========================================================================

-- -------------------------------------------------------------------------
-- Helpers
-- -------------------------------------------------------------------------

-- Is the current signed-in user active workshop staff or admin? (also defined in migration 10)
CREATE OR REPLACE FUNCTION public.is_workshop_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff') AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Is the current signed-in user an active admin (shop owner)?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- True for requests coming from the app (anon / signed-in users), false for the SQL Editor
-- and the service role, so manual fixes in Supabase are never blocked by the guards below.
CREATE OR REPLACE FUNCTION public.is_app_request()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', '') IN ('anon', 'authenticated');
$$ LANGUAGE sql STABLE;

-- -------------------------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temp: allow read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Temp: allow insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Temp: allow update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: read own or workshop" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own or admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own or admin" ON public.profiles;

CREATE POLICY "Profiles: read own or workshop" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Profiles: insert own or admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "Profiles: update own or admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Only the admin can set roles or (de)activate accounts
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_app_request() AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'customer';
      NEW.is_active := true;
    ELSE
      NEW.role := OLD.role;
      NEW.is_active := OLD.is_active;
      NEW.position := OLD.position;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trigger_protect_profile_privileges
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- -------------------------------------------------------------------------
-- MOTORCYCLES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temp: allow all on motorcycles" ON public.motorcycles;
DROP POLICY IF EXISTS "Motorcycles: read own or workshop" ON public.motorcycles;
DROP POLICY IF EXISTS "Motorcycles: insert own or workshop" ON public.motorcycles;
DROP POLICY IF EXISTS "Motorcycles: update own or workshop" ON public.motorcycles;
DROP POLICY IF EXISTS "Motorcycles: delete workshop" ON public.motorcycles;

CREATE POLICY "Motorcycles: read own or workshop" ON public.motorcycles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Motorcycles: insert own or workshop" ON public.motorcycles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Motorcycles: update own or workshop" ON public.motorcycles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_workshop_user())
  WITH CHECK (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Motorcycles: delete workshop" ON public.motorcycles
  FOR DELETE TO authenticated
  USING (public.is_workshop_user());

-- -------------------------------------------------------------------------
-- SERVICE TICKETS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temp: allow all on service_tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Tickets: read own or workshop" ON public.service_tickets;
DROP POLICY IF EXISTS "Tickets: insert own or workshop" ON public.service_tickets;
DROP POLICY IF EXISTS "Tickets: update own or workshop" ON public.service_tickets;
DROP POLICY IF EXISTS "Tickets: delete workshop" ON public.service_tickets;

CREATE POLICY "Tickets: read own or workshop" ON public.service_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Tickets: insert own or workshop" ON public.service_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Tickets: update own or workshop" ON public.service_tickets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_workshop_user())
  WITH CHECK (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Tickets: delete workshop" ON public.service_tickets
  FOR DELETE TO authenticated
  USING (public.is_workshop_user());

-- Customers may only: book (Stage 1), cancel before work starts, reschedule, let a booking
-- lapse to MISSED, and attach a review. Everything else is the workshop's job.
CREATE OR REPLACE FUNCTION public.guard_customer_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  booked_count INTEGER;
BEGIN
  IF NOT public.is_app_request() OR public.is_workshop_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.stage := 1;
    NEW.status := 'IN_PROGRESS';
    NEW.is_walk_in := false;
    NEW.assigned_bay := NULL;
    NEW.assigned_mechanic := NULL;
    NEW.payment_status := 'UNPAID';
    NEW.paid_at := NULL;
    NEW.released_by := NULL;
    NEW.cancelled_by := NULL;
  ELSE
    -- Workshop-owned fields never change from the customer side
    NEW.user_id := OLD.user_id;
    NEW.motorcycle_id := OLD.motorcycle_id;
    NEW.service_type := OLD.service_type;
    NEW.is_walk_in := OLD.is_walk_in;
    NEW.assigned_bay := OLD.assigned_bay;
    NEW.assigned_mechanic := OLD.assigned_mechanic;
    NEW.estimated_pickup := OLD.estimated_pickup;
    NEW.total_estimate := OLD.total_estimate;
    NEW.parts_cost := OLD.parts_cost;
    NEW.labor_cost := OLD.labor_cost;
    NEW.discount_amount := OLD.discount_amount;
    NEW.discount_type := OLD.discount_type;
    NEW.total_amount := OLD.total_amount;
    NEW.billing_breakdown := OLD.billing_breakdown;
    NEW.payment_method := OLD.payment_method;
    NEW.payment_status := OLD.payment_status;
    NEW.paid_at := OLD.paid_at;
    NEW.released_by := OLD.released_by;
    NEW.cancelled_by := OLD.cancelled_by;

    IF NEW.stage > OLD.stage THEN
      RAISE EXCEPTION 'Only the workshop can move a job to the next stage.';
    END IF;
    IF OLD.stage > 1 AND (NEW.stage IS DISTINCT FROM OLD.stage OR NEW.dropoff_date IS DISTINCT FROM OLD.dropoff_date) THEN
      RAISE EXCEPTION 'This motorcycle is already being serviced. Please message the shop to change the booking.';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status IN ('COMPLETED', 'READY_FOR_PICKUP', 'CANCELLED_BY_ADMIN') THEN
        RAISE EXCEPTION 'This ticket can no longer be changed online. Please message the shop.';
      END IF;
      IF NEW.status NOT IN ('CANCELLED', 'MISSED', 'IN_PROGRESS') THEN
        RAISE EXCEPTION 'That status change is reserved for the workshop.';
      END IF;
      IF NEW.status = 'CANCELLED' AND OLD.stage > 1 THEN
        RAISE EXCEPTION 'Work has already started on this motorcycle. Please message the shop to cancel.';
      END IF;
    END IF;
  END IF;

  -- Booking rules on the server: no past dates, closed on Sundays, 6 bookings per day
  IF NEW.dropoff_date IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.dropoff_date IS DISTINCT FROM OLD.dropoff_date) THEN
    IF NEW.dropoff_date < (now() AT TIME ZONE 'Asia/Manila')::date THEN
      RAISE EXCEPTION 'Please pick today or a future date.';
    END IF;
    IF EXTRACT(DOW FROM NEW.dropoff_date) = 0 THEN
      RAISE EXCEPTION 'MotoCare is closed on Sundays. Please pick a date from Monday to Saturday.';
    END IF;

    -- One booking at a time per date so two riders can't take the last slot together
    PERFORM pg_advisory_xact_lock(hashtext('motocare_booking_' || NEW.dropoff_date::text));
    SELECT COUNT(*) INTO booked_count
    FROM public.service_tickets
    WHERE dropoff_date = NEW.dropoff_date
      AND status NOT IN ('CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW')
      AND id IS DISTINCT FROM NEW.id;
    IF booked_count >= 6 THEN
      RAISE EXCEPTION 'This date is fully booked (6 of 6). Please pick another date.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_guard_customer_ticket_changes ON public.service_tickets;
CREATE TRIGGER trigger_guard_customer_ticket_changes
BEFORE INSERT OR UPDATE ON public.service_tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_ticket_changes();

-- Public booking calendar: how many bookings each upcoming day has (no rider details)
CREATE OR REPLACE FUNCTION public.get_booking_counts()
RETURNS TABLE (dropoff_date DATE, booking_count INTEGER) AS $$
  SELECT t.dropoff_date, COUNT(*)::int
  FROM public.service_tickets t
  WHERE t.dropoff_date >= (now() AT TIME ZONE 'Asia/Manila')::date - 1
    AND t.status NOT IN ('CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW')
  GROUP BY t.dropoff_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_booking_counts() TO anon, authenticated;

-- Public /track page: one ticket by code, public-safe fields only (plate number partly hidden)
CREATE OR REPLACE FUNCTION public.track_ticket(p_code TEXT)
RETURNS JSON AS $$
  SELECT json_build_object(
    'id', t.id,
    'ticket_code', t.ticket_code,
    'service_type', t.service_type,
    'stage', t.stage,
    'assigned_bay', t.assigned_bay,
    'assigned_mechanic', t.assigned_mechanic,
    'estimated_pickup', t.estimated_pickup,
    'total_estimate', t.total_estimate,
    'status', t.status,
    'dropoff_date', t.dropoff_date,
    'created_at', t.created_at,
    'motorcycles', CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object(
      'model', m.model,
      'plate_number', CASE
        WHEN length(m.plate_number) <= 3 THEN m.plate_number
        ELSE left(m.plate_number, 3) || repeat('•', length(m.plate_number) - 3)
      END
    ) END
  )
  FROM public.service_tickets t
  LEFT JOIN public.motorcycles m ON m.id = t.motorcycle_id
  WHERE t.ticket_code = upper(trim(p_code))
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.track_ticket(TEXT) TO anon, authenticated;

-- -------------------------------------------------------------------------
-- MESSAGES (user_id = the customer who owns the conversation)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temp: allow all on messages" ON public.messages;
DROP POLICY IF EXISTS "Messages: read own or workshop" ON public.messages;
DROP POLICY IF EXISTS "Messages: insert own or workshop" ON public.messages;
DROP POLICY IF EXISTS "Messages: update workshop" ON public.messages;
DROP POLICY IF EXISTS "Messages: delete workshop" ON public.messages;

CREATE POLICY "Messages: read own or workshop" ON public.messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Messages: insert own or workshop" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_workshop_user());

CREATE POLICY "Messages: update workshop" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_workshop_user())
  WITH CHECK (public.is_workshop_user());

CREATE POLICY "Messages: delete workshop" ON public.messages
  FOR DELETE TO authenticated
  USING (public.is_workshop_user());

-- -------------------------------------------------------------------------
-- AUDIT LOGS (workshop only; never edited or deleted)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temp: allow read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Temp: allow insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit: read workshop" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit: insert workshop" ON public.audit_logs;

CREATE POLICY "Audit: read workshop" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_workshop_user());

CREATE POLICY "Audit: insert workshop" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workshop_user());

-- -------------------------------------------------------------------------
-- APP SETTINGS (everyone reads; workshop writes)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temp: allow insert app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Temp: allow update app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Settings: insert workshop" ON public.app_settings;
DROP POLICY IF EXISTS "Settings: update workshop" ON public.app_settings;

CREATE POLICY "Settings: insert workshop" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workshop_user());

CREATE POLICY "Settings: update workshop" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_workshop_user())
  WITH CHECK (public.is_workshop_user());

-- -------------------------------------------------------------------------
-- CUSTOMER REVIEWS (public reads published; customers write their own)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Temp: allow insert customer_reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Temp: allow update customer_reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Reviews: customer read own" ON public.customer_reviews;
DROP POLICY IF EXISTS "Reviews: customer insert own" ON public.customer_reviews;
DROP POLICY IF EXISTS "Reviews: customer update own" ON public.customer_reviews;

CREATE POLICY "Reviews: customer read own" ON public.customer_reviews
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Reviews: customer insert own" ON public.customer_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workshop_user()
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.service_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Reviews: customer update own" ON public.customer_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Customers can edit their rating/comment but never their review's moderation state.
-- Named "trigger_a_..." so it runs before the low-rating hold trigger from migration 10.
CREATE OR REPLACE FUNCTION public.protect_review_moderation()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_app_request() AND NOT public.is_workshop_user() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.moderated_at := NULL;
      NEW.moderated_by := NULL;
      NEW.shop_reply := NULL;
      NEW.replied_by := NULL;
      NEW.replied_at := NULL;
    ELSE
      NEW.is_published := OLD.is_published;
      NEW.moderated_at := OLD.moderated_at;
      NEW.moderated_by := OLD.moderated_by;
      NEW.shop_reply := OLD.shop_reply;
      NEW.replied_by := OLD.replied_by;
      NEW.replied_at := OLD.replied_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_a_protect_review_moderation ON public.customer_reviews;
CREATE TRIGGER trigger_a_protect_review_moderation
BEFORE INSERT OR UPDATE ON public.customer_reviews
FOR EACH ROW EXECUTE FUNCTION public.protect_review_moderation();

NOTIFY pgrst, 'reload schema';

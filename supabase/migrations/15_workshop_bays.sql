-- =========================================================================
-- 15: WORKSHOP BAYS — ang may-ari ang nagtatakda kung ilang bay ang meron
-- MotoCare Workshop Management System
--
-- What this does:
--   1. Stores the number of service bays in app_settings (key 'workshop_bays', value {"count": 3}).
--      Starts at 3. The owner adds or removes bays from the staff console (Bays page).
--   2. Daily online booking limit = number of bays (1 bay = 1 booking per day).
--      The booking guard now reads the bay count instead of a fixed 6.
--   3. Only the owner (admin) can change the bay count, and it must be 1 to 12.
--
-- Safe to re-run. Run in the Supabase SQL Editor after migrations 00–14.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Default: 3 bays (keeps any value the owner already saved)
-- -------------------------------------------------------------------------
INSERT INTO public.app_settings (key, value, updated_by)
VALUES ('workshop_bays', '{"count": 3}'::jsonb, 'migration 15')
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------------------------
-- 2. Current bay count (1–12; 3 if missing or invalid)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workshop_bay_count()
RETURNS INTEGER AS $$
  SELECT LEAST(12, GREATEST(1, COALESCE(
    (SELECT CASE WHEN (value->>'count') ~ '^[0-9]+$' THEN (value->>'count')::int END
       FROM public.app_settings WHERE key = 'workshop_bays'),
    3
  )));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.workshop_bay_count() TO anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. Only the owner can change the bay count, and only to a whole number 1–12
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_workshop_bays_setting()
RETURNS TRIGGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  IF NEW.key <> 'workshop_bays' THEN
    RETURN NEW;
  END IF;

  IF public.is_app_request() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the shop owner can change the number of bays.';
  END IF;

  IF NOT (NEW.value ? 'count') OR (NEW.value->>'count') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'The bay count must be a whole number.';
  END IF;
  new_count := (NEW.value->>'count')::int;
  IF new_count < 1 OR new_count > 12 THEN
    RAISE EXCEPTION 'The workshop needs between 1 and 12 bays.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_protect_workshop_bays_setting ON public.app_settings;
CREATE TRIGGER trigger_protect_workshop_bays_setting
BEFORE INSERT OR UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.protect_workshop_bays_setting();

-- -------------------------------------------------------------------------
-- 4. Booking guard (same as migration 11), now limited by the bay count
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  booked_count INTEGER;
  daily_limit INTEGER;
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

  -- Booking rules on the server: no past dates, closed on Sundays, one booking per bay per day
  IF NEW.dropoff_date IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.dropoff_date IS DISTINCT FROM OLD.dropoff_date) THEN
    IF NEW.dropoff_date < (now() AT TIME ZONE 'Asia/Manila')::date THEN
      RAISE EXCEPTION 'Please pick today or a future date.';
    END IF;
    IF EXTRACT(DOW FROM NEW.dropoff_date) = 0 THEN
      RAISE EXCEPTION 'MotoCare is closed on Sundays. Please pick a date from Monday to Saturday.';
    END IF;

    daily_limit := public.workshop_bay_count();

    -- One booking at a time per date so two riders can't take the last slot together
    PERFORM pg_advisory_xact_lock(hashtext('motocare_booking_' || NEW.dropoff_date::text));
    SELECT COUNT(*) INTO booked_count
    FROM public.service_tickets
    WHERE dropoff_date = NEW.dropoff_date
      AND status NOT IN ('CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW')
      AND id IS DISTINCT FROM NEW.id;
    IF booked_count >= daily_limit THEN
      RAISE EXCEPTION 'This date is fully booked (% of %). Please pick another date.', booked_count, daily_limit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';

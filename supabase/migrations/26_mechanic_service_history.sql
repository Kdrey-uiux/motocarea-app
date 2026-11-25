-- =========================================================================
-- 26: MECHANIC SERVICE HISTORY — backjob link + lock the mechanic after release
-- MotoCare Workshop Management System
--
--   1. service_tickets.backjob_of_ticket_id: staff mark a job as a motorcycle that
--      came back from an earlier released job ("backjob"). It must point to a released
--      job of the same motorcycle (same motorcycle record or same plate number).
--      Riders can never set it (rider ticket guard, below).
--   2. After a job is released (COMPLETED), only the owner can change its mechanic,
--      so the mechanic's service history stays as proof of who did the work.
--
-- Adds one nullable column; nothing else in the tables changes.
-- Safe to re-run. Run in the Supabase SQL Editor after migration 25.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Backjob link
-- -------------------------------------------------------------------------
ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS backjob_of_ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_tickets_backjob_of ON public.service_tickets (backjob_of_ticket_id)
  WHERE backjob_of_ticket_id IS NOT NULL;

-- The link must point to a released job of the same motorcycle
CREATE OR REPLACE FUNCTION public.guard_backjob_link()
RETURNS TRIGGER AS $$
DECLARE
  orig RECORD;
  new_plate TEXT;
  orig_plate TEXT;
BEGIN
  IF NEW.backjob_of_ticket_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.backjob_of_ticket_id IS NOT DISTINCT FROM OLD.backjob_of_ticket_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.backjob_of_ticket_id = NEW.id THEN
    RAISE EXCEPTION 'A job cannot be a backjob of itself.';
  END IF;

  SELECT id, status, motorcycle_id INTO orig
  FROM public.service_tickets WHERE id = NEW.backjob_of_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The earlier job was not found.';
  END IF;
  IF orig.status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Only a released job can be marked as the earlier job of a backjob.';
  END IF;

  IF orig.motorcycle_id IS DISTINCT FROM NEW.motorcycle_id THEN
    -- Walk-ins get a new motorcycle record each visit, so the plate number also counts
    SELECT upper(regexp_replace(COALESCE(plate_number, ''), '[^A-Za-z0-9]', '', 'g')) INTO new_plate
    FROM public.motorcycles WHERE id = NEW.motorcycle_id;
    SELECT upper(regexp_replace(COALESCE(plate_number, ''), '[^A-Za-z0-9]', '', 'g')) INTO orig_plate
    FROM public.motorcycles WHERE id = orig.motorcycle_id;
    IF COALESCE(new_plate, '') = '' OR new_plate IS DISTINCT FROM orig_plate THEN
      RAISE EXCEPTION 'A backjob must be the same motorcycle as the earlier job.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_guard_backjob_link ON public.service_tickets;
CREATE TRIGGER trigger_guard_backjob_link
BEFORE INSERT OR UPDATE ON public.service_tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_backjob_link();

-- -------------------------------------------------------------------------
-- 2. A released job keeps its mechanic (owner can still correct it)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_released_mechanic()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_app_request()
     AND NOT public.is_admin()
     AND OLD.status = 'COMPLETED'
     AND NEW.assigned_mechanic IS DISTINCT FROM OLD.assigned_mechanic THEN
    RAISE EXCEPTION 'This job is already released. Only the shop owner can change its mechanic.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_guard_released_mechanic ON public.service_tickets;
CREATE TRIGGER trigger_guard_released_mechanic
BEFORE UPDATE ON public.service_tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_released_mechanic();

-- -------------------------------------------------------------------------
-- 3. Rider ticket guard (from migration 25): riders can't set the backjob link
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  booked_count INTEGER;
  daily_limit INTEGER;
  rider_active INTEGER;
  max_active_per_rider CONSTANT INTEGER := 3;
  -- A missed booking that the rider is rescheduling (becomes a booking again)
  is_revived BOOLEAN := false;
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
    NEW.backjob_of_ticket_id := NULL;
    NEW.created_at := now();

    -- The shop must be able to reach the rider
    IF NOT public.rider_profile_complete(auth.uid()) THEN
      RAISE EXCEPTION 'Please complete your profile (mobile number) before booking.';
    END IF;

    -- Same random format the app makes (src/utils/ticketCode.ts): MC- + 6 of 23456789ABCDEFGHJKMNPQRSTUVXYZ
    IF NEW.ticket_code !~ '^MC-[23456789ABCDEFGHJKMNPQRSTUVXYZ]{6}$' THEN
      RAISE EXCEPTION 'Invalid ticket code.';
    END IF;

    IF NEW.motorcycle_id IS NULL THEN
      RAISE EXCEPTION 'Please pick the motorcycle for this booking.';
    END IF;
    IF NEW.dropoff_date IS NULL THEN
      RAISE EXCEPTION 'Please pick a drop-off date.';
    END IF;

    -- The motorcycle must be one of the rider's own
    IF NOT EXISTS (
      SELECT 1 FROM public.motorcycles WHERE id = NEW.motorcycle_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Please pick one of your own motorcycles.';
    END IF;

    -- A new online booking always waits for the shop to accept it
    IF public.notes_tags(NEW.notes, 'BOOKING:') IS DISTINCT FROM ARRAY['[BOOKING:PENDING_CONFIRMATION]']
       OR cardinality(public.notes_tags(NEW.notes, 'CHECKED_IN')) > 0
       OR cardinality(public.notes_tags(NEW.notes, 'LATE_CHECKIN_OVERRIDE')) > 0
       OR cardinality(public.notes_tags(NEW.notes, 'GRACE_EXTENDED')) > 0
       OR cardinality(public.notes_tags(NEW.notes, 'MISSED_EXPIRATION')) > 0 THEN
      RAISE EXCEPTION 'A new booking must wait for the shop to confirm it.';
    END IF;
  ELSE
    -- Workshop-owned fields never change from the customer side
    NEW.ticket_code := OLD.ticket_code;
    NEW.created_at := OLD.created_at;
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
    NEW.backjob_of_ticket_id := OLD.backjob_of_ticket_id;

    IF NEW.stage > OLD.stage THEN
      RAISE EXCEPTION 'Only the workshop can move a job to the next stage.';
    END IF;
    IF OLD.stage > 1 AND (NEW.stage IS DISTINCT FROM OLD.stage OR NEW.dropoff_date IS DISTINCT FROM OLD.dropoff_date) THEN
      RAISE EXCEPTION 'This motorcycle is already being serviced. Please message the shop to change the booking.';
    END IF;
    IF NEW.dropoff_date IS NULL AND OLD.dropoff_date IS NOT NULL THEN
      RAISE EXCEPTION 'Please pick a drop-off date.';
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
      -- Only a missed booking comes back (reschedule). A cancelled one needs a new booking.
      IF NEW.status = 'IN_PROGRESS' THEN
        IF OLD.status IS DISTINCT FROM 'MISSED' THEN
          RAISE EXCEPTION 'This booking can no longer be brought back. Please make a new booking.';
        END IF;
        is_revived := true;
      END IF;
    END IF;

    -- Shop-only tags in the notes (migration 17)
    IF NEW.notes IS DISTINCT FROM OLD.notes THEN
      IF public.notes_tags(NEW.notes, 'BOOKING:') IS DISTINCT FROM public.notes_tags(OLD.notes, 'BOOKING:') THEN
        RAISE EXCEPTION 'Only the workshop can confirm or change a booking.';
      END IF;
      IF public.notes_tags(NEW.notes, 'GRACE_EXTENDED') IS DISTINCT FROM public.notes_tags(OLD.notes, 'GRACE_EXTENDED') THEN
        RAISE EXCEPTION 'Only the workshop can extend the drop-off time.';
      END IF;
      IF NOT (public.notes_tags(NEW.notes, 'CHECKED_IN') <@ public.notes_tags(OLD.notes, 'CHECKED_IN'))
         OR NOT (public.notes_tags(NEW.notes, 'LATE_CHECKIN_OVERRIDE') <@ public.notes_tags(OLD.notes, 'LATE_CHECKIN_OVERRIDE')) THEN
        RAISE EXCEPTION 'Only the workshop can check in a motorcycle.';
      END IF;
      IF NEW.status IS DISTINCT FROM 'MISSED'
         AND NOT (public.notes_tags(NEW.notes, 'MISSED_EXPIRATION') <@ public.notes_tags(OLD.notes, 'MISSED_EXPIRATION')) THEN
        RAISE EXCEPTION 'That note is reserved for the workshop.';
      END IF;
    END IF;
  END IF;

  -- One active booking per motorcycle, and a limit per rider (new booking or a missed one coming back)
  IF TG_OP = 'INSERT' OR is_revived THEN
    -- Always take the rider lock before the date lock below, so two requests never wait on each other
    PERFORM pg_advisory_xact_lock(hashtext('motocare_rider_' || NEW.user_id::text));

    IF NEW.motorcycle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.service_tickets
      WHERE motorcycle_id = NEW.motorcycle_id
        AND status NOT IN ('COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW')
        AND id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'This motorcycle already has an active booking. You can reschedule that one instead.';
    END IF;

    SELECT COUNT(*) INTO rider_active
    FROM public.service_tickets
    WHERE user_id = NEW.user_id
      AND status NOT IN ('COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW')
      AND id IS DISTINCT FROM NEW.id;
    IF rider_active >= max_active_per_rider THEN
      RAISE EXCEPTION 'You already have % active bookings. Please wait until one is finished or cancel one first.', rider_active;
    END IF;
  END IF;

  -- Booking rules on the server: no past dates, closed on Sundays, one booking per bay per day
  IF NEW.dropoff_date IS NOT NULL
     AND (TG_OP = 'INSERT' OR is_revived OR NEW.dropoff_date IS DISTINCT FROM OLD.dropoff_date) THEN
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

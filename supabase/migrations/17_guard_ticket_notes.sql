-- =========================================================================
-- 17: GUARD TICKET NOTES — hindi na mapepeke ng rider ang booking tags sa notes
-- MotoCare Workshop Management System
--
-- Why:
--   Part of the booking state lives in service_tickets.notes as tags, e.g.
--   [BOOKING:PENDING_CONFIRMATION] -> [BOOKING:PENDING_DROPOFF] when the shop accepts.
--   Migration 11 locks stage, bay, prices, etc. from the rider side, but not notes, so a
--   rider could edit the notes of their own ticket (browser tools) and turn
--   PENDING_CONFIRMATION into PENDING_DROPOFF, or add a check-in / grace tag.
--
-- What the rider side may still do (everything the app does today):
--   - New booking: exactly one [BOOKING:PENDING_CONFIRMATION] tag, no other shop tags
--   - Reschedule: drop [CHECKED_IN...] / [LATE_CHECKIN_OVERRIDE...] markers, add notes text
--   - Missed scan: add [MISSED_EXPIRATION...] together with status MISSED
--   - Review: add or replace their [REVIEW:...] tag
-- What it may not do:
--   - add, remove, or change a [BOOKING:...] or [GRACE_EXTENDED...] tag
--   - add a [CHECKED_IN...] or [LATE_CHECKIN_OVERRIDE...] tag
--   - add [MISSED_EXPIRATION...] without the status becoming MISSED
-- Staff and owner are not affected (the guard skips workshop users, as before).
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 16.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Helper: every "[PREFIX...]" tag in a notes text, sorted (empty array if none)
--    notes_tags('a [BOOKING:PENDING_DROPOFF] b', 'BOOKING:') = {"[BOOKING:PENDING_DROPOFF]"}
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notes_tags(p_notes TEXT, p_prefix TEXT)
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(m[1] ORDER BY m[1]), '{}'::text[])
  FROM regexp_matches(COALESCE(p_notes, ''), '(\[' || p_prefix || '[^\]]*\])', 'g') AS m;
$$ LANGUAGE sql IMMUTABLE SET search_path = public;

-- -------------------------------------------------------------------------
-- 2. Booking guard (same as migration 15) + the notes rules above
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

    -- Shop-only tags in the notes
    IF NEW.notes IS DISTINCT FROM OLD.notes THEN
      IF public.notes_tags(NEW.notes, 'BOOKING:') IS DISTINCT FROM public.notes_tags(OLD.notes, 'BOOKING:') THEN
        RAISE EXCEPTION 'Only the workshop can confirm or change a booking.';
      END IF;
      IF public.notes_tags(NEW.notes, 'GRACE_EXTENDED') IS DISTINCT FROM public.notes_tags(OLD.notes, 'GRACE_EXTENDED') THEN
        RAISE EXCEPTION 'Only the workshop can extend the drop-off time.';
      END IF;
      -- Check-in markers may be dropped (reschedule) but never added
      IF NOT (public.notes_tags(NEW.notes, 'CHECKED_IN') <@ public.notes_tags(OLD.notes, 'CHECKED_IN'))
         OR NOT (public.notes_tags(NEW.notes, 'LATE_CHECKIN_OVERRIDE') <@ public.notes_tags(OLD.notes, 'LATE_CHECKIN_OVERRIDE')) THEN
        RAISE EXCEPTION 'Only the workshop can check in a motorcycle.';
      END IF;
      -- The missed marker only comes with the MISSED status
      IF NEW.status IS DISTINCT FROM 'MISSED'
         AND NOT (public.notes_tags(NEW.notes, 'MISSED_EXPIRATION') <@ public.notes_tags(OLD.notes, 'MISSED_EXPIRATION')) THEN
        RAISE EXCEPTION 'That note is reserved for the workshop.';
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

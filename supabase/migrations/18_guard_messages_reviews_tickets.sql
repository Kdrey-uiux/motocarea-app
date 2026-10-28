-- =========================================================================
-- 18: GUARD MESSAGES, REVIEWS, TICKETS — mga butas na nakita sa security check
-- MotoCare Workshop Management System
--
-- Fixes (rider side only; staff, owner and the SQL Editor are not affected):
--   1. MESSAGES: a rider can't post as the shop or fake a hardcopy update.
--      - Rider messages are always sender_role 'customer', under the rider's own name.
--      - The app's own system notices that the rider dashboard posts (missed booking,
--        drop-off reminder, reschedule confirmed) keep the shop label, as today.
--      - [HARDCOPY_STATUS_UPDATE] (ready / claimed) can only come from staff or owner.
--   2. REVIEWS: only for the rider's own COMPLETED service. The public name, motorcycle
--      and service on the landing page come from the database, not from the rider.
--   3. TICKETS: a new booking must use the rider's own motorcycle and a proper random
--      code (MC-XXXXXX); the ticket code and booking time can't be changed afterwards.
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 17.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. MESSAGES
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_app_request() OR public.is_workshop_user() THEN
    RETURN NEW;
  END IF;

  IF NEW.message LIKE '[HARDCOPY\_STATUS\_UPDATE]%' THEN
    RAISE EXCEPTION 'Only the shop can update a hardcopy request.';
  END IF;

  IF NEW.message LIKE '[MISSED\_BOOKING\_NOTICE]%'
     OR NEW.message LIKE '[BOOKING\_REMINDER]%'
     OR NEW.message LIKE '[RESCHEDULE\_CONFIRMED]%' THEN
    -- System notice the app writes into the rider's own inbox
    NEW.sender_role := 'admin';
  ELSE
    -- Everything else the rider sends is a customer message, under their own name
    NEW.sender_role := 'customer';
    NEW.sender_name := (SELECT full_name FROM public.profiles WHERE id = auth.uid());
    NEW.is_read := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_guard_customer_messages ON public.messages;
CREATE TRIGGER trigger_guard_customer_messages
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_messages();

-- -------------------------------------------------------------------------
-- 2. REVIEWS
-- -------------------------------------------------------------------------
-- Public-safe name: first name + last initial ("Kurt Andrei Alerta" -> "Kurt A.")
CREATE OR REPLACE FUNCTION public.public_reviewer_name(p_full_name TEXT)
RETURNS TEXT AS $$
DECLARE
  parts TEXT[];
BEGIN
  parts := regexp_split_to_array(trim(COALESCE(p_full_name, '')), '\s+');
  IF parts IS NULL OR cardinality(parts) = 0 OR parts[1] = '' THEN
    RETURN 'Verified Rider';
  END IF;
  IF cardinality(parts) = 1 THEN
    RETURN parts[1];
  END IF;
  RETURN parts[1] || ' ' || upper(left(parts[cardinality(parts)], 1)) || '.';
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.guard_customer_reviews()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  IF NOT public.is_app_request() OR public.is_workshop_user() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.ticket_id := OLD.ticket_id;
  END IF;

  SELECT t.user_id, t.status, t.service_type, m.model AS bike_model
    INTO v_ticket
  FROM public.service_tickets t
  LEFT JOIN public.motorcycles m ON m.id = t.motorcycle_id
  WHERE t.id = NEW.ticket_id;

  IF NOT FOUND OR v_ticket.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You can only review your own service.';
  END IF;
  IF v_ticket.status <> 'COMPLETED' THEN
    RAISE EXCEPTION 'You can review a service once it is completed.';
  END IF;

  NEW.user_id := auth.uid();
  NEW.display_name := public.public_reviewer_name((SELECT full_name FROM public.profiles WHERE id = auth.uid()));
  NEW.bike_model := v_ticket.bike_model;
  NEW.service_type := v_ticket.service_type;
  IF length(COALESCE(NEW.comment, '')) > 1000 THEN
    NEW.comment := left(NEW.comment, 1000);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- "trigger_a0_" sorts before the moderation (trigger_a_) and low-rating hold triggers
DROP TRIGGER IF EXISTS trigger_a0_guard_customer_reviews ON public.customer_reviews;
CREATE TRIGGER trigger_a0_guard_customer_reviews
BEFORE INSERT OR UPDATE ON public.customer_reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_reviews();

-- -------------------------------------------------------------------------
-- 3. TICKETS: booking guard (same as migration 17) + motorcycle, code and time rules
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
    NEW.created_at := now();

    -- Same random format the app makes (src/utils/ticketCode.ts): MC- + 6 of 23456789ABCDEFGHJKMNPQRSTUVXYZ
    IF NEW.ticket_code !~ '^MC-[23456789ABCDEFGHJKMNPQRSTUVXYZ]{6}$' THEN
      RAISE EXCEPTION 'Invalid ticket code.';
    END IF;

    -- The motorcycle must be one of the rider's own
    IF NEW.motorcycle_id IS NOT NULL AND NOT EXISTS (
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

-- =========================================================================
-- 25: SECURITY TIGHTENING — mga butas na nakita sa full review (2026-11-24)
-- MotoCare Workshop Management System
--
--   1. Bookings: a rider can't bring back a cancelled or no-show booking. Only a missed
--      booking can come back, through a reschedule, and it goes through the date and
--      bay checks again.
--   2. Bookings: one active booking per motorcycle and at most 3 per rider, enforced
--      here and not only in the browser. A rider booking must have a drop-off date.
--   3. app_settings: people who are not signed in (and riders) read only what the
--      public pages need (site_content, service_catalog, workshop_bays). Staff
--      notes such as resolved chats and mechanic names are for the workshop only.
--   4. Owner-only actions in the database too: only the owner deletes rows, reads the
--      Activity Logs, and cancels a ticket that was already confirmed. Staff still
--      decline pending booking requests.
--   5. Rider profile email always follows their sign-in email (emails go there).
--   6. Chat: rider messages up to 4000 characters, at most 10 a minute.
--
-- Only functions, triggers and policies change. No table columns change.
-- Safe to re-run. Run in the Supabase SQL Editor after migration 24.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1 + 2. Rider ticket guard (from migration 19, with the new booking rules)
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

-- -------------------------------------------------------------------------
-- 3. app_settings: public reads only what the public pages need
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Settings: public read" ON public.app_settings;
DROP POLICY IF EXISTS "Settings: workshop read" ON public.app_settings;

CREATE POLICY "Settings: public read" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('site_content', 'service_catalog', 'workshop_bays'));

CREATE POLICY "Settings: workshop read" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.is_workshop_user());

-- -------------------------------------------------------------------------
-- 4. Owner-only actions
-- -------------------------------------------------------------------------
-- Deleting rows (the app never deletes these; the owner can still fix data)
DROP POLICY IF EXISTS "Tickets: delete workshop" ON public.service_tickets;
DROP POLICY IF EXISTS "Tickets: delete owner" ON public.service_tickets;
CREATE POLICY "Tickets: delete owner" ON public.service_tickets
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Messages: delete workshop" ON public.messages;
DROP POLICY IF EXISTS "Messages: delete owner" ON public.messages;
CREATE POLICY "Messages: delete owner" ON public.messages
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Motorcycles: delete workshop" ON public.motorcycles;
DROP POLICY IF EXISTS "Motorcycles: delete owner" ON public.motorcycles;
CREATE POLICY "Motorcycles: delete owner" ON public.motorcycles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Activity Logs are an owner screen; staff still write entries for what they do
DROP POLICY IF EXISTS "Audit: read workshop" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit: read owner" ON public.audit_logs;
CREATE POLICY "Audit: read owner" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Staff decline pending booking requests; cancelling a confirmed ticket is the owner's call
CREATE OR REPLACE FUNCTION public.guard_staff_ticket_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_app_request()
     AND public.is_workshop_user()
     AND NOT public.is_admin()
     AND NEW.status IN ('CANCELLED', 'CANCELLED_BY_ADMIN')
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT (
       OLD.status = 'PENDING_CONFIRMATION'
       OR strpos(COALESCE(OLD.notes, ''), '[BOOKING:PENDING_CONFIRMATION]') > 0
     ) THEN
    RAISE EXCEPTION 'Only the shop owner can cancel a confirmed ticket.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_guard_staff_ticket_cancel ON public.service_tickets;
CREATE TRIGGER trigger_guard_staff_ticket_cancel
BEFORE UPDATE ON public.service_tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_staff_ticket_cancel();

-- -------------------------------------------------------------------------
-- 5. Profile guard (from migration 20) + rider email follows the sign-in email
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_app_request() AND NOT public.is_admin() THEN
    -- Booking emails go to this address, so it is always the verified sign-in email
    NEW.email := COALESCE((SELECT u.email FROM auth.users u WHERE u.id = NEW.id), NEW.email);

    IF TG_OP = 'INSERT' THEN
      NEW.role := 'customer';
      NEW.is_active := true;
    ELSE
      NEW.role := OLD.role;
      NEW.is_active := OLD.is_active;
      NEW.position := OLD.position;
      -- Setting a missing number is fine (Complete your profile); changing one goes through a request
      IF public.canonical_ph_mobile(OLD.phone_number) IS NOT NULL THEN
        NEW.phone_number := OLD.phone_number;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- -------------------------------------------------------------------------
-- 6. Chat guard (from migration 23) + length and speed limits for riders
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_app_request() OR public.is_workshop_user() THEN
    RETURN NEW;
  END IF;

  -- Written by trigger_auto_reply_to_rider while the rider's message is being saved.
  -- A rider's own insert always runs at depth 1, so it can't get in this way.
  IF pg_trigger_depth() > 1
     AND (NEW.message LIKE '[AUTO\_REPLY]%' OR NEW.message LIKE '[AUTO\_RECEIVED]%') THEN
    NEW.sender_role := 'admin';
    RETURN NEW;
  END IF;

  IF NEW.message LIKE '[AUTO\_REPLY]%' OR NEW.message LIKE '[AUTO\_RECEIVED]%' THEN
    RAISE EXCEPTION 'Only the shop can send automatic replies.';
  END IF;

  IF NEW.message LIKE '[HARDCOPY\_STATUS\_UPDATE]%' THEN
    RAISE EXCEPTION 'Only the shop can update a hardcopy request.';
  END IF;

  -- The chat box allows 2000 characters; the rest is room for app notices such as a hardcopy request
  IF length(COALESCE(NEW.message, '')) > 4000 THEN
    RAISE EXCEPTION 'This message is too long. Please make it shorter.';
  END IF;

  -- Only the rider's own messages count, not the shop's replies
  IF (
    SELECT COUNT(*) FROM public.messages
    WHERE user_id = auth.uid()
      AND sender_role = 'customer'
      AND created_at > now() - INTERVAL '1 minute'
  ) >= 10 THEN
    RAISE EXCEPTION 'You are sending messages too fast. Please wait a minute and try again.';
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

NOTIFY pgrst, 'reload schema';

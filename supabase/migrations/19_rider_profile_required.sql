-- =========================================================================
-- 19: RIDER PROFILE REQUIRED — pangalan, mobile number at pagpayag sa Terms
-- MotoCare Workshop Management System
--
-- Why:
--   "Continue with Google" makes the account straight away with the Google name and no
--   mobile number ('N/A'), and skips the Terms checkbox of the normal sign-up. The app now
--   asks for these on a "Complete your profile" page before the dashboard.
--
-- What this does:
--   1. profiles.terms_accepted_at / terms_version: when the rider agreed to the Terms and
--      Privacy Policy, and which version (proof of consent, Data Privacy Act).
--   2. Normal email sign-up saves that consent when the account is made
--      (the app sends terms_version with the sign-up).
--   3. A rider can't book online until their profile has a PH mobile number and their
--      consent is on file (so the shop can always reach them).
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 18.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Consent columns
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- -------------------------------------------------------------------------
-- 2. New accounts: copy the consent sent with the email sign-up
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, role, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Rider Customer'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', 'N/A'),
    'customer',
    CASE WHEN NEW.raw_user_meta_data ? 'terms_version' THEN now() END,
    NEW.raw_user_meta_data->>'terms_version'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -------------------------------------------------------------------------
-- 3. Is this rider's profile complete enough to book? (PH mobile + consent)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rider_profile_complete(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
      AND regexp_replace(COALESCE(phone_number, ''), '[^0-9]', '', 'g') ~ '^(63|0)?9[0-9]{9}$'
      AND terms_accepted_at IS NOT NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- -------------------------------------------------------------------------
-- 4. Booking guard (same as migration 18) + complete profile before booking
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

    -- The shop must be able to reach the rider
    IF NOT public.rider_profile_complete(auth.uid()) THEN
      RAISE EXCEPTION 'Please complete your profile (mobile number) before booking.';
    END IF;

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

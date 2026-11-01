-- =========================================================================
-- 20: PHONE CHANGE REQUESTS — hihiling ang rider, ang owner ang magve-verify at magpapalit
-- MotoCare Workshop Management System
--
-- How it works:
--   1. A rider asks to change their mobile number (new number + reason).
--   2. The owner checks it's really them (call the old number, chat, or in person), then
--      Approve (the owner's function changes the number) or Decline (with a reason).
--   3. The rider gets a chat message either way; the change goes to the Activity Logs.
--
-- Rules:
--   - One pending request per rider; 30 days between approved changes.
--   - The new number must be a PH mobile number and different from the current one.
--   - After a rider has a real mobile number, only the owner can change it (riders can still
--     set it once, on the Complete your profile page, while it's missing).
--   - Only the owner (admin) sees and decides requests; staff don't.
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 19.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Table
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_phone TEXT,
  new_phone TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  decline_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_phone_change_requests_user ON public.phone_change_requests (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_change_requests_status ON public.phone_change_requests (status, requested_at DESC);
-- One open request per rider
CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_change_requests_one_pending
  ON public.phone_change_requests (user_id) WHERE status = 'PENDING';

ALTER TABLE public.phone_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Phone requests: read own or owner" ON public.phone_change_requests;
DROP POLICY IF EXISTS "Phone requests: rider asks" ON public.phone_change_requests;
DROP POLICY IF EXISTS "Phone requests: rider cancels own" ON public.phone_change_requests;

CREATE POLICY "Phone requests: read own or owner" ON public.phone_change_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Phone requests: rider asks" ON public.phone_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Phone requests: rider cancels own" ON public.phone_change_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- 2. Helper: any PH mobile form -> "+639XXXXXXXXX" (NULL if it isn't one)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.canonical_ph_mobile(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  digits TEXT := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
  IF digits ~ '^63[0-9]{10}$' THEN
    digits := substr(digits, 3);
  ELSIF digits ~ '^0[0-9]{10}$' THEN
    digits := substr(digits, 2);
  END IF;
  IF digits ~ '^9[0-9]{9}$' THEN
    RETURN '+63' || digits;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- -------------------------------------------------------------------------
-- 3. Rider side rules (asking and cancelling)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_phone_change_requests()
RETURNS TRIGGER AS $$
DECLARE
  v_current TEXT;
  v_last_approved TIMESTAMPTZ;
BEGIN
  IF NOT public.is_app_request() OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- A rider can only cancel their own open request; nothing else changes
    IF OLD.status <> 'PENDING' OR NEW.status <> 'CANCELLED' THEN
      RAISE EXCEPTION 'You can only cancel a request that is still waiting.';
    END IF;
    NEW.user_id := OLD.user_id;
    NEW.old_phone := OLD.old_phone;
    NEW.new_phone := OLD.new_phone;
    NEW.reason := OLD.reason;
    NEW.requested_at := OLD.requested_at;
    NEW.decided_by := NULL;
    NEW.decided_at := now();
    NEW.decline_reason := NULL;
    RETURN NEW;
  END IF;

  -- INSERT
  NEW.user_id := auth.uid();
  NEW.status := 'PENDING';
  NEW.requested_at := now();
  NEW.decided_by := NULL;
  NEW.decided_at := NULL;
  NEW.decline_reason := NULL;

  SELECT phone_number INTO v_current FROM public.profiles WHERE id = auth.uid();
  NEW.old_phone := v_current;

  NEW.new_phone := public.canonical_ph_mobile(NEW.new_phone);
  IF NEW.new_phone IS NULL THEN
    RAISE EXCEPTION 'Please enter a valid PH mobile number (e.g. 0917 123 4567).';
  END IF;
  IF NEW.new_phone = public.canonical_ph_mobile(v_current) THEN
    RAISE EXCEPTION 'That is already your mobile number.';
  END IF;

  NEW.reason := btrim(COALESCE(NEW.reason, ''));
  IF length(NEW.reason) < 3 THEN
    RAISE EXCEPTION 'Please tell the shop why you are changing your number.';
  END IF;
  IF length(NEW.reason) > 300 THEN
    NEW.reason := left(NEW.reason, 300);
  END IF;

  IF EXISTS (SELECT 1 FROM public.phone_change_requests WHERE user_id = auth.uid() AND status = 'PENDING') THEN
    RAISE EXCEPTION 'You already have a request waiting for the shop.';
  END IF;

  SELECT max(decided_at) INTO v_last_approved
  FROM public.phone_change_requests
  WHERE user_id = auth.uid() AND status = 'APPROVED';
  IF v_last_approved IS NOT NULL AND v_last_approved > now() - interval '30 days' THEN
    RAISE EXCEPTION 'You can request another change on %.',
      to_char((v_last_approved + interval '30 days') AT TIME ZONE 'Asia/Manila', 'FMMon FMDD, YYYY');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_guard_phone_change_requests ON public.phone_change_requests;
CREATE TRIGGER trigger_guard_phone_change_requests
BEFORE INSERT OR UPDATE ON public.phone_change_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_phone_change_requests();

-- -------------------------------------------------------------------------
-- 4. Profiles: once a rider has a real number, only the owner changes it
--    (same as migration 11, plus the phone rule)
-- -------------------------------------------------------------------------
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
      -- Setting a missing number is fine (Complete your profile); changing one goes through a request
      IF public.canonical_ph_mobile(OLD.phone_number) IS NOT NULL THEN
        NEW.phone_number := OLD.phone_number;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -------------------------------------------------------------------------
-- 5. Owner decisions (one step each: change + close request + tell rider + log)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_phone_change(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_req public.phone_change_requests%ROWTYPE;
  v_owner TEXT;
  v_rider TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the shop owner can approve a number change.';
  END IF;

  SELECT * INTO v_req FROM public.phone_change_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;
  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'This request was already handled.';
  END IF;

  SELECT COALESCE(full_name, 'Shop Owner') INTO v_owner FROM public.profiles WHERE id = auth.uid();
  SELECT COALESCE(full_name, 'Rider') INTO v_rider FROM public.profiles WHERE id = v_req.user_id;

  UPDATE public.profiles SET phone_number = v_req.new_phone WHERE id = v_req.user_id;

  UPDATE public.phone_change_requests
  SET status = 'APPROVED', decided_by = v_owner, decided_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.messages (user_id, sender_role, sender_name, message)
  VALUES (
    v_req.user_id, 'admin', 'MotoCare',
    'Your mobile number has been changed to ' || v_req.new_phone || '. Thank you for keeping your details up to date!'
  );

  INSERT INTO public.audit_logs (ticket_code, action, actor, details, previous_value, new_value)
  VALUES (
    'PROFILE', 'PHONE_CHANGE_APPROVED', v_owner,
    'Changed the mobile number of ' || v_rider || '. Reason: ' || v_req.reason,
    COALESCE(v_req.old_phone, 'None'), v_req.new_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.decline_phone_change(p_request_id UUID, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
  v_req public.phone_change_requests%ROWTYPE;
  v_owner TEXT;
  v_rider TEXT;
  v_reason TEXT := left(btrim(COALESCE(p_reason, '')), 300);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the shop owner can decline a number change.';
  END IF;
  IF length(v_reason) < 3 THEN
    RAISE EXCEPTION 'Please give the rider a reason.';
  END IF;

  SELECT * INTO v_req FROM public.phone_change_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found.';
  END IF;
  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'This request was already handled.';
  END IF;

  SELECT COALESCE(full_name, 'Shop Owner') INTO v_owner FROM public.profiles WHERE id = auth.uid();
  SELECT COALESCE(full_name, 'Rider') INTO v_rider FROM public.profiles WHERE id = v_req.user_id;

  UPDATE public.phone_change_requests
  SET status = 'DECLINED', decided_by = v_owner, decided_at = now(), decline_reason = v_reason
  WHERE id = p_request_id;

  INSERT INTO public.messages (user_id, sender_role, sender_name, message)
  VALUES (
    v_req.user_id, 'admin', 'MotoCare',
    'Your request to change your mobile number to ' || v_req.new_phone || ' was declined: ' || v_reason
  );

  INSERT INTO public.audit_logs (ticket_code, action, actor, details, previous_value, new_value)
  VALUES (
    'PROFILE', 'PHONE_CHANGE_DECLINED', v_owner,
    'Declined the mobile number change of ' || v_rider || '. Reason: ' || v_reason,
    COALESCE(v_req.old_phone, 'None'), v_req.new_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.approve_phone_change(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_phone_change(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_phone_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_phone_change(UUID, TEXT) TO authenticated;

-- -------------------------------------------------------------------------
-- 6. Live updates (new requests reach the owner, decisions reach the rider)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'phone_change_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_change_requests;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

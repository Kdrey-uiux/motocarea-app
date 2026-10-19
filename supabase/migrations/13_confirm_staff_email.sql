-- =========================================================================
-- 13: CONFIRM STAFF EMAIL — staff accounts can log in right after the owner creates them
-- MotoCare Workshop Management System
--
-- Staff accounts are created with the same signup as riders, so with "Confirm email" ON
-- they could not log in until someone clicked a link sent to the staff email (often a
-- work address with no inbox). This lets the shop owner mark a NEW STAFF account as
-- confirmed. Customer accounts are not affected: riders still verify their email.
--
-- Safe to re-run.
-- =========================================================================

-- Same helper as migration 11 (repeated so this file also works on its own)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Called by the app right after the owner creates a staff account
CREATE OR REPLACE FUNCTION public.confirm_staff_email(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the shop owner can confirm staff accounts.';
  END IF;

  -- Never touch customer or admin accounts
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'staff') THEN
    RAISE EXCEPTION 'This account is not a staff account.';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION public.confirm_staff_email(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_staff_email(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

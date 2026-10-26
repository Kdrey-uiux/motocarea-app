-- =========================================================================
-- 16: FIXED THREE BAYS — Bay 01 hanggang 03 ay permanente
-- MotoCare Workshop Management System
--
-- What this does:
--   The shop always has its 3 fixed bays. The owner can add bays (up to 12) and remove
--   only the added ones, so the bay count is now 3–12 (migration 15 allowed 1–12).
--   1. The bay count reads as at least 3.
--   2. Saving a bay count below 3 is refused.
--   3. A saved count below 3 (if any) is raised to 3.
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 15.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Current bay count (3–12; 3 if missing or invalid)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workshop_bay_count()
RETURNS INTEGER AS $$
  SELECT LEAST(12, GREATEST(3, COALESCE(
    (SELECT CASE WHEN (value->>'count') ~ '^[0-9]+$' THEN (value->>'count')::int END
       FROM public.app_settings WHERE key = 'workshop_bays'),
    3
  )));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.workshop_bay_count() TO anon, authenticated;

-- -------------------------------------------------------------------------
-- 2. Only the owner can change the bay count, and only to a whole number 3–12
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
  IF new_count < 3 THEN
    RAISE EXCEPTION 'Bays 01 to 03 are fixed and can''t be removed.';
  END IF;
  IF new_count > 12 THEN
    RAISE EXCEPTION 'The workshop can have up to 12 bays.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -------------------------------------------------------------------------
-- 3. Raise a saved count below 3 (the trigger above allows this direct update)
-- -------------------------------------------------------------------------
UPDATE public.app_settings
SET value = '{"count": 3}'::jsonb, updated_by = 'migration 16'
WHERE key = 'workshop_bays'
  AND (value->>'count') ~ '^[0-9]+$'
  AND (value->>'count')::int < 3;

NOTIFY pgrst, 'reload schema';

-- =========================================================================
-- 21: NOTIFY SECRET — ang database lang ang pwedeng tumawag sa email function
-- MotoCare Workshop Management System
--
-- The notify-customer Edge Function now refuses calls without the header
-- x-motocare-secret. The database keeps that secret in Supabase Vault (encrypted) under the
-- name 'notify_customer_secret' and sends it from the ticket email trigger and the daily
-- reminder job.
--
-- BEFORE running this file, save the secret in the Vault once (SQL Editor, separate query;
-- never commit the real value):
--     select vault.create_secret('<your long random secret>', 'notify_customer_secret');
-- AFTER running it: add the same value as NOTIFY_SECRET in Edge Functions > Secrets and
-- redeploy notify-customer. Until then the function still accepts calls (it ignores the
-- extra header), so no email is lost in between.
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 20.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Headers for calls to the function (secret read from the Vault)
--    Only the database itself uses this; app users can't call it (it holds the secret).
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_customer_headers()
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'Content-Type', 'application/json',
    'x-motocare-secret', COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_customer_secret' LIMIT 1),
      ''
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, vault;

REVOKE ALL ON FUNCTION public.notify_customer_headers() FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 2. Ticket email trigger (same as migration 14) + the secret header
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.queue_ticket_email()
RETURNS TRIGGER AS $$
DECLARE
  v_kind TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'READY_FOR_PICKUP' AND OLD.status IS DISTINCT FROM 'READY_FOR_PICKUP' THEN
    v_kind := 'ready';
  ELSIF (
      OLD.status = 'PENDING_CONFIRMATION'
      OR coalesce(OLD.notes, '') LIKE '%[BOOKING:PENDING_CONFIRMATION]%'
    )
    AND NEW.status NOT IN ('PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW')
    AND coalesce(NEW.notes, '') NOT LIKE '%[BOOKING:PENDING_CONFIRMATION]%' THEN
    v_kind := 'confirmed';
  ELSE
    RETURN NEW;
  END IF;

  -- Async HTTP call: never blocks or fails the ticket update itself
  PERFORM net.http_post(
    url := 'https://cqkwlyqajtajkvctgdeu.supabase.co/functions/v1/notify-customer',
    headers := public.notify_customer_headers(),
    body := jsonb_build_object('kind', v_kind, 'ticket_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- -------------------------------------------------------------------------
-- 3. Daily reminders, 6:00 PM Philippine time (same as migration 14) + the secret header
-- -------------------------------------------------------------------------
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'motocare-booking-reminders';
SELECT cron.schedule(
  'motocare-booking-reminders',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqkwlyqajtajkvctgdeu.supabase.co/functions/v1/notify-customer',
    headers := public.notify_customer_headers(),
    body := '{"kind": "reminders"}'::jsonb
  );
  $$
);

NOTIFY pgrst, 'reload schema';

-- =========================================================================
-- 14: EMAIL NOTIFICATIONS — booking confirmed, ready for pickup, day-before reminder
-- MotoCare Workshop Management System
--
-- The database calls the `notify-customer` Edge Function (supabase/functions/notify-customer):
--   - a trigger, when a booking is accepted or a motorcycle becomes READY_FOR_PICKUP
--   - pg_cron, every day at 6:00 PM (Philippine time), for tomorrow's drop-off reminders
-- Only tickets linked to a rider account get emails (walk-ins have no email on file).
--
-- Before running this: deploy the Edge Function and set its secrets (see the function file).
-- Run after 13_confirm_staff_email.sql. Safe to re-run.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- One row per email sent, so the same event never emails a customer twice.
-- ref = the drop-off date for reminders (a rescheduled booking gets a new reminder), '' otherwise.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('confirmed', 'ready', 'reminder')),
  ref TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, kind, ref)
);

-- Only the Edge Function (service role) reads or writes this table
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Fires after a ticket update and asks the Edge Function to send the matching email
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
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('kind', v_kind, 'ticket_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trigger_service_tickets_email ON public.service_tickets;
CREATE TRIGGER trigger_service_tickets_email
AFTER UPDATE OF status, notes ON public.service_tickets
FOR EACH ROW EXECUTE FUNCTION public.queue_ticket_email();

-- Daily at 10:00 UTC = 6:00 PM in the Philippines: reminders for tomorrow's drop-offs
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'motocare-booking-reminders';
SELECT cron.schedule(
  'motocare-booking-reminders',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://cqkwlyqajtajkvctgdeu.supabase.co/functions/v1/notify-customer',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"kind": "reminders"}'::jsonb
  );
  $$
);

NOTIFY pgrst, 'reload schema';

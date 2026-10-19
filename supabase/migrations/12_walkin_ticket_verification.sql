-- =========================================================================
-- 12: WALK-IN TICKET VERIFICATION — public tracking asks walk-ins to prove the ticket
-- MotoCare Workshop Management System
--
-- Public /track page:
--   - Ticket linked to a rider account  -> status is shown right away (same as before)
--   - Walk-in ticket (no rider account) -> visitor must also enter the date the shop
--                                          created the ticket (Philippine time) before
--                                          any ticket details are returned
--
-- Run after 11_tighten_rls.sql. Safe to re-run.
-- =========================================================================

-- Tells the tracking page which kind of ticket a code is, without returning any details:
--   'account' = linked to a rider account, 'walkin' = no account, NULL = no such ticket
CREATE OR REPLACE FUNCTION public.ticket_lookup_kind(p_code TEXT)
RETURNS TEXT AS $$
  SELECT CASE WHEN t.user_id IS NULL THEN 'walkin' ELSE 'account' END
  FROM public.service_tickets t
  WHERE t.ticket_code = upper(trim(p_code))
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ticket_lookup_kind(TEXT) TO anon, authenticated;

-- Replaces the one-argument track_ticket() from migration 11 (two versions would make
-- the app's call ambiguous). Walk-in tickets are only returned when p_created_on matches.
DROP FUNCTION IF EXISTS public.track_ticket(TEXT);

CREATE OR REPLACE FUNCTION public.track_ticket(p_code TEXT, p_created_on DATE DEFAULT NULL)
RETURNS JSON AS $$
  SELECT json_build_object(
    'id', t.id,
    'ticket_code', t.ticket_code,
    'service_type', t.service_type,
    'stage', t.stage,
    'assigned_bay', t.assigned_bay,
    'assigned_mechanic', t.assigned_mechanic,
    'estimated_pickup', t.estimated_pickup,
    'total_estimate', t.total_estimate,
    'status', t.status,
    'dropoff_date', t.dropoff_date,
    'created_at', t.created_at,
    'motorcycles', CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object(
      'model', m.model,
      'plate_number', CASE
        WHEN length(m.plate_number) <= 3 THEN m.plate_number
        ELSE left(m.plate_number, 3) || repeat('•', length(m.plate_number) - 3)
      END
    ) END
  )
  FROM public.service_tickets t
  LEFT JOIN public.motorcycles m ON m.id = t.motorcycle_id
  WHERE t.ticket_code = upper(trim(p_code))
    AND (
      t.user_id IS NOT NULL
      OR (t.created_at AT TIME ZONE 'Asia/Manila')::date = p_created_on
    )
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.track_ticket(TEXT, DATE) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

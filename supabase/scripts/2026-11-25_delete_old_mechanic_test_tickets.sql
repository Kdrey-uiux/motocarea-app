-- =========================================================================
-- ONE-TIME DATA CLEANUP (not a migration) — 2026-11-25
-- Binubura ang mga TEST ticket na ang mechanic ay na-type bago nagkaroon
-- ng Mechanics list: Boss A, Andoy, joel, Mark Renz, Martin (7 tickets).
--
-- Kasabay na nabubura (ON DELETE CASCADE): review at email record ng ticket.
-- Hindi nabubura: Activity Logs, accounts, motorcycles, chats.
-- HINDI NA MAIBABALIK. Pareho ang database ng local at live.
--
-- PAANO GAMITIN (Supabase > SQL Editor):
--   1. I-run muna ang STEP 1 lang (i-highlight ang SELECT, saka Run).
--      Tingnan kung tama ang listahan: 7 ticket.
--   2. Kapag tama, i-run ang STEP 2 (i-highlight ang buong DO block, saka Run).
--      Kung hindi eksaktong 7 ang makita, walang mabubura at may error na lalabas.
-- =========================================================================

-- STEP 1: PREVIEW (walang binabago)
SELECT
  ticket_code,
  status,
  stage,
  assigned_mechanic,
  assigned_bay,
  service_type,
  (created_at AT TIME ZONE 'Asia/Manila')::date AS created_on
FROM public.service_tickets
WHERE lower(btrim(regexp_replace(COALESCE(assigned_mechanic, ''), '\s+', ' ', 'g')))
      IN ('boss a', 'andoy', 'joel', 'mark renz', 'martin')
ORDER BY created_at;


-- STEP 2: DELETE (7 tickets lang; kung iba ang bilang, walang mabubura)
DO $$
DECLARE
  expected CONSTANT INTEGER := 7;
  found INTEGER;
  codes TEXT;
BEGIN
  SELECT COUNT(*), string_agg(ticket_code, ', ' ORDER BY created_at)
  INTO found, codes
  FROM public.service_tickets
  WHERE lower(btrim(regexp_replace(COALESCE(assigned_mechanic, ''), '\s+', ' ', 'g')))
        IN ('boss a', 'andoy', 'joel', 'mark renz', 'martin');

  IF found <> expected THEN
    RAISE EXCEPTION 'Expected % test tickets but found %. Nothing was deleted. Check STEP 1 first.', expected, found;
  END IF;

  DELETE FROM public.service_tickets
  WHERE lower(btrim(regexp_replace(COALESCE(assigned_mechanic, ''), '\s+', ' ', 'g')))
        IN ('boss a', 'andoy', 'joel', 'mark renz', 'martin');

  -- Para may bakas sa Activity Logs kung kailan at ano ang binura
  INSERT INTO public.audit_logs (ticket_code, action, actor, details, previous_value, new_value)
  VALUES (
    'SYSTEM',
    'TEST_DATA_DELETED',
    'Shop owner (SQL Editor)',
    'Deleted ' || found || ' test tickets with old typed mechanic names: ' || codes || '.',
    found || ' tickets',
    'Deleted'
  );

  RAISE NOTICE 'Deleted % test tickets: %', found, codes;
END $$;

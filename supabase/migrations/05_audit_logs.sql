-- =========================================================================
-- 05: AUDIT LOGS — cross-device history ng mga aksyon ng staff at admin
-- MotoCare Workshop Management System
-- id is TEXT because the app generates ids like 'aud-1760000000000-ab12'
-- =========================================================================

CREATE TABLE public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ticket_code TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  details TEXT,
  previous_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs ("timestamp" DESC);
CREATE INDEX idx_audit_logs_ticket_code ON public.audit_logs (ticket_code);

-- RLS: read + insert only (audit history should never be edited or deleted).
-- TODO: tighten to staff/admin only right after the reset (security item #3).
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temp: allow read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Temp: allow insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Realtime: audit tab updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;

NOTIFY pgrst, 'reload schema';

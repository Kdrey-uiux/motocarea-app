-- =========================================================================
-- 07: APP SETTINGS — workshop-wide settings na shared sa lahat ng device
-- MotoCare Workshop Management System
-- Keys used by the app (see src/lib/sharedSettings.ts):
--   service_catalog         services & prices shown to customers
--   bay_maintenance         { "<bayId>": true } bays under maintenance
--   resolved_conversations  [customer user ids] chats marked resolved
-- =========================================================================

CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: everyone can read (customers need the service catalog); writes are permissive for now.
-- TODO: restrict writes to staff/admin right after the reset (security item #3).
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Temp: allow insert app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Temp: allow update app_settings" ON public.app_settings FOR UPDATE USING (true) WITH CHECK (true);

-- Realtime: every open screen updates when a setting changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

NOTIFY pgrst, 'reload schema';

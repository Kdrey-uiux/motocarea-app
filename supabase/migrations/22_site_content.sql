-- =========================================================================
-- 22: Website content the shop owner can edit (Settings -> Website content)
--
-- Stored in app_settings under the key 'site_content'. Everyone can read it,
-- because the public landing page shows it. Migration 11 lets any workshop
-- account write to app_settings, so this adds the owner-only rule for this key.
--
-- Run once in the Supabase SQL Editor. Safe to run again.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.protect_site_content_setting()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.key <> 'site_content' THEN
    RETURN NEW;
  END IF;

  IF public.is_app_request() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the shop owner can change the website content.';
  END IF;

  IF jsonb_typeof(NEW.value) <> 'object' THEN
    RAISE EXCEPTION 'The website content is not in the right format.';
  END IF;

  IF octet_length(NEW.value::text) > 20000 THEN
    RAISE EXCEPTION 'The website content is too long.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_protect_site_content_setting ON public.app_settings;
CREATE TRIGGER trigger_protect_site_content_setting
BEFORE INSERT OR UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.protect_site_content_setting();

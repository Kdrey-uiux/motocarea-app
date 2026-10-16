-- =========================================================================
-- 00: RESET — DEVELOPMENT ONLY
-- MotoCare Workshop Management System
-- Binubura ang LAHAT ng MotoCare tables, functions, at types sa schema na `public`
-- para makapagsimula ulit nang malinis. Hindi ginagalaw ang Supabase Auth accounts
-- (auth.users); ibabalik ang kanilang profiles sa 01_profiles.sql.
-- HUWAG I-RUN KAPAG MAY TOTOONG DATA NA.
-- =========================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS
  public.audit_logs,
  public.messages,
  public.service_tickets,
  public.motorcycles,
  public.motorcycle_models,
  public.service_catalog,
  public.profiles
CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.set_service_tickets_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.service_status CASCADE;

NOTIFY pgrst, 'reload schema';

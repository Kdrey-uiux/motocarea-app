-- =========================================================================
-- 27: SECURITY ADVISOR FIXES (Supabase linter, 2026-11-25: 0 errors, 49 warnings)
-- MotoCare Workshop Management System
--
-- Only function settings and EXECUTE permissions change. No tables, data or rules change.
--
--   1. Function Search Path Mutable (3): pin search_path on set_updated_at,
--      hold_low_rating_reviews and is_app_request.
--   2. Trigger functions callable through /rest/v1/rpc (14 functions, 28 warnings):
--      they only ever run as triggers. Postgres does not check EXECUTE when a trigger
--      fires, so removing EXECUTE from the API roles changes nothing for the app.
--   3. Helpers only used inside other database functions (workshop_bay_count,
--      rider_profile_complete): not callable from the app any more (4 warnings).
--   4. is_admin / is_workshop_user: used by Row Level Security policies, which all
--      apply to signed-in users only, so signed-in users keep EXECUTE and visitors
--      (anon) lose it (2 warnings).
--
-- Kept on purpose (these warnings stay, 11 + 1):
--   track_ticket, ticket_lookup_kind, get_booking_counts   public tracking and booking calendar
--   approve_phone_change, decline_phone_change,
--   confirm_staff_email                                    owner actions; each checks is_admin() inside
--   is_admin, is_workshop_user (signed-in)                 needed by the RLS policies
--   Leaked Password Protection                             a setting in the Auth dashboard, not SQL
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 26.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Fixed search_path
-- -------------------------------------------------------------------------
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.hold_low_rating_reviews() SET search_path = public;
ALTER FUNCTION public.is_app_request() SET search_path = public;

-- -------------------------------------------------------------------------
-- 2. Trigger functions: not part of the API
-- -------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auto_reply_to_rider() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_backjob_link() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_customer_messages() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_customer_reviews() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_customer_ticket_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_phone_change_requests() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_released_mechanic() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_staff_ticket_cancel() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileges() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_review_moderation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_site_content_setting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_workshop_bays_setting() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_ticket_email() FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. Helpers used only by other database functions (which run as the owner)
-- -------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.workshop_bay_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rider_profile_complete(UUID) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 4. RLS helpers: signed-in users only
-- -------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_workshop_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workshop_user() TO authenticated;

NOTIFY pgrst, 'reload schema';

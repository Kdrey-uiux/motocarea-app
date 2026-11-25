-- =========================================================================
-- 28: MECHANIC PHOTOS — owner uploads, riders see only their own mechanic
-- MotoCare Workshop Management System
--
--   1. Storage bucket 'mechanic-photos': PRIVATE (no public links), images only
--      (JPG, PNG, WebP), 2 MB at most. The app shrinks photos to 400 px first.
--   2. Only the owner (is_admin) uploads, replaces and removes photos.
--   3. Staff and the owner see every photo. A rider sees a photo only when that
--      mechanic is on one of the rider's OWN tickets, the mechanic still works at
--      the shop, and the owner ticked the consent box when uploading.
--   4. my_mechanic_photos(): for the signed-in rider, the photo of the mechanic on
--      each of their tickets. The mechanic list itself (app_settings
--      'workshop_mechanics') stays readable by the workshop only (migration 25).
--
-- Where the photo is recorded: in the mechanic list, each mechanic gets
--   "photoPath": "<mechanic id>/<time>.webp", "photoConsentAt": "<ISO time>"
-- No tables change.
--
-- Safe to re-run. Run in the Supabase SQL Editor after migration 27.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. The bucket
-- -------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mechanic-photos', 'mechanic-photos', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -------------------------------------------------------------------------
-- 2. Which photo belongs to which of the rider's tickets
-- -------------------------------------------------------------------------

-- "  Juan   Dela Cruz " -> "juan dela cruz" (same as mechanicKey in src/utils/workshopMechanics.ts)
CREATE OR REPLACE FUNCTION public.mechanic_name_key(n TEXT)
RETURNS TEXT AS $$
  SELECT lower(regexp_replace(btrim(COALESCE(n, '')), '\s+', ' ', 'g'));
$$ LANGUAGE sql IMMUTABLE SET search_path = public;

-- The signed-in rider's tickets with the photo of the mechanic on each one.
-- A mechanic matches by current name or a name from before a rename.
CREATE OR REPLACE FUNCTION public.my_mechanic_photos()
RETURNS TABLE (ticket_id UUID, photo_path TEXT) AS $$
  SELECT DISTINCT ON (t.id) t.id, m.value ->> 'photoPath'
  FROM public.service_tickets t
  JOIN public.app_settings s ON s.key = 'workshop_mechanics'
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(s.value -> 'mechanics') = 'array' THEN s.value -> 'mechanics' ELSE '[]'::jsonb END
  ) AS m(value)
  WHERE auth.uid() IS NOT NULL
    AND t.user_id = auth.uid()
    AND t.status NOT IN ('CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW')
    AND public.mechanic_name_key(t.assigned_mechanic) <> ''
    -- Still works at the shop (resigned mechanics show the name only)
    AND (m.value -> 'active') IS DISTINCT FROM 'false'::jsonb
    -- The owner confirmed the mechanic agreed to show the photo
    AND COALESCE(m.value ->> 'photoConsentAt', '') <> ''
    -- The photo sits in this mechanic's own folder
    AND COALESCE(m.value ->> 'photoPath', '') <> ''
    AND COALESCE(m.value ->> 'id', '') <> ''
    AND left(m.value ->> 'photoPath', length(m.value ->> 'id') + 1) = (m.value ->> 'id') || '/'
    AND (
      public.mechanic_name_key(m.value ->> 'name') = public.mechanic_name_key(t.assigned_mechanic)
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof(m.value -> 'previousNames') = 'array' THEN m.value -> 'previousNames' ELSE '[]'::jsonb END
        ) AS p(old_name)
        WHERE public.mechanic_name_key(p.old_name) = public.mechanic_name_key(t.assigned_mechanic)
      )
    )
  ORDER BY t.id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Storage rule helper: may the signed-in rider open this photo file?
CREATE OR REPLACE FUNCTION public.rider_can_view_mechanic_photo(object_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.my_mechanic_photos() p WHERE p.photo_path = object_name);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Signed-in users only (visitors never need these)
REVOKE EXECUTE ON FUNCTION public.my_mechanic_photos() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rider_can_view_mechanic_photo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_mechanic_photos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_can_view_mechanic_photo(TEXT) TO authenticated;
-- Only used inside the functions above
REVOKE EXECUTE ON FUNCTION public.mechanic_name_key(TEXT) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 3. Storage rules for the bucket
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Mechanic photos: read" ON storage.objects;
DROP POLICY IF EXISTS "Mechanic photos: owner upload" ON storage.objects;
DROP POLICY IF EXISTS "Mechanic photos: owner update" ON storage.objects;
DROP POLICY IF EXISTS "Mechanic photos: owner delete" ON storage.objects;

CREATE POLICY "Mechanic photos: read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mechanic-photos'
    AND (public.is_workshop_user() OR public.rider_can_view_mechanic_photo(name))
  );

CREATE POLICY "Mechanic photos: owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mechanic-photos' AND public.is_admin());

CREATE POLICY "Mechanic photos: owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'mechanic-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'mechanic-photos' AND public.is_admin());

CREATE POLICY "Mechanic photos: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'mechanic-photos' AND public.is_admin());

NOTIFY pgrst, 'reload schema';

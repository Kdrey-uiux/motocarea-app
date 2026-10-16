-- =========================================================================
-- 01: PROFILES — customers, staff, at admin (naka-link sa Supabase Auth)
-- MotoCare Workshop Management System
-- Roles are lowercase to match the app code: 'customer' | 'staff' | 'admin'
-- =========================================================================

-- Shared helper: keeps updated_at current on every UPDATE (also used by service_tickets)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Rider Customer',
  email TEXT,
  phone_number TEXT DEFAULT 'N/A',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  position TEXT DEFAULT 'Customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role_active ON public.profiles (role, is_active);

CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile on signup. Every new account starts as 'customer';
-- staff/admin roles are granted manually (never from user-editable signup metadata).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Rider Customer'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', 'N/A'),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for accounts that already exist in Supabase Auth
INSERT INTO public.profiles (id, full_name, email, phone_number, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Rider Customer'),
  email,
  COALESCE(raw_user_meta_data->>'phone_number', 'N/A'),
  'customer'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- RLS: permissive for now (same behavior the app currently relies on).
-- TODO: tighten right after the reset (security item #3).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temp: allow read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Temp: allow insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Temp: allow update profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

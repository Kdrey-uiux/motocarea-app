-- =========================================================================
-- MIGRATION: Motorcycle Models Catalog Table
-- MotoCare Workshop Management System
-- =========================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.motorcycle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create search indexes
CREATE INDEX IF NOT EXISTS idx_motorcycle_models_name ON public.motorcycle_models(name);
CREATE INDEX IF NOT EXISTS idx_motorcycle_models_brand ON public.motorcycle_models(brand);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.motorcycle_models ENABLE ROW LEVEL SECURITY;

-- 4. Public read policy (anyone can search the catalog)
CREATE POLICY "Allow public read access to active motorcycle models" 
  ON public.motorcycle_models 
  FOR SELECT 
  USING (is_active = true);

-- 5. Admin insert/update policy (service_role or admins can modify)
CREATE POLICY "Allow admin full access to motorcycle models"
  ON public.motorcycle_models
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'ADMIN' OR profiles.role = 'SUPER_ADMIN')
    )
  );

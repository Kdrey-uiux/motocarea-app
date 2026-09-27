import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MOTORCYCLE_CATALOG_SEEDS } from './seedMotorcycles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const values = MOTORCYCLE_CATALOG_SEEDS.map((b) => {
  const brand = b.brand.replace(/'/g, "''");
  const name = b.name.replace(/'/g, "''");
  return `  ('${brand}', '${name}')`;
}).join(',\n');

const sql = `-- =========================================================================
-- COMPLETE MIGRATION & SEED: Motorcycle Models
-- I-paste at i-run ito sa Supabase Dashboard > SQL Editor
-- Magkakaroon agad ng 185 models ang database kahit walang Node backend!
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

-- 3. Enable RLS
ALTER TABLE public.motorcycle_models ENABLE ROW LEVEL SECURITY;

-- 4. Allow public reading
DROP POLICY IF EXISTS "Allow public read access to active motorcycle models" ON public.motorcycle_models;
CREATE POLICY "Allow public read access to active motorcycle models" 
  ON public.motorcycle_models 
  FOR SELECT 
  USING (is_active = true);

-- 5. Insert all 185 popular Philippine motorcycle models
INSERT INTO public.motorcycle_models (brand, name)
VALUES
${values};
`;

const targetPath = path.resolve(__dirname, '../../../supabase/migrations/20260927_seed_motorcycle_models.sql');
fs.writeFileSync(targetPath, sql, 'utf-8');
console.log('✅ Generated:', targetPath);

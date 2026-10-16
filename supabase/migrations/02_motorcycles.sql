-- =========================================================================
-- 02: MOTORCYCLES — garahe ng customer at mga walk-in na motor
-- MotoCare Workshop Management System
-- user_id is nullable: walk-in motorcycles are registered without a customer account
-- =========================================================================

CREATE TABLE public.motorcycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  year_model TEXT DEFAULT '2024',
  odometer TEXT DEFAULT '0 km',
  status TEXT DEFAULT 'Active',
  next_service TEXT DEFAULT 'Due in 3,000 km',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_motorcycles_user_id ON public.motorcycles (user_id);
CREATE INDEX idx_motorcycles_plate_number ON public.motorcycles (plate_number);

-- RLS: permissive for now (same behavior the app currently relies on).
-- TODO: tighten right after the reset (security item #3).
ALTER TABLE public.motorcycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temp: allow all on motorcycles" ON public.motorcycles FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

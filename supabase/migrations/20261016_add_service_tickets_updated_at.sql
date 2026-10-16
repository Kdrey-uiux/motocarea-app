-- Migration: Add updated_at column to service_tickets table
-- Safe and idempotent: can be executed repeatedly without errors

-- 1. Add updated_at column if it does not exist
ALTER TABLE public.service_tickets
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Trigger function to automatically maintain updated_at on every update
CREATE OR REPLACE FUNCTION public.set_service_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop existing trigger if present and recreate
DROP TRIGGER IF EXISTS trigger_set_service_tickets_updated_at ON public.service_tickets;

CREATE TRIGGER trigger_set_service_tickets_updated_at
BEFORE UPDATE ON public.service_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_service_tickets_updated_at();

-- 4. Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_service_tickets_updated_at ON public.service_tickets (updated_at DESC);

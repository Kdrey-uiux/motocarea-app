-- =========================================================================
-- 03: SERVICE TICKETS — bookings, walk-ins, workshop queue, billing, tracking
-- MotoCare Workshop Management System
-- Stages: 1 Intake, 2 Bay Inspection, 3 Repair, 4 Quality Testing, 5 Ready for Release
-- =========================================================================

CREATE TABLE public.service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code TEXT NOT NULL UNIQUE,
  -- Nullable: walk-in tickets have no customer account. Keep workshop history if an account is deleted.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motorcycle_id UUID REFERENCES public.motorcycles(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  stage INTEGER NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN (
    'PENDING_CONFIRMATION',
    'PENDING_DROPOFF',
    'CONFIRMED_APPOINTMENT',
    'IN_PROGRESS',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'CANCELLED',
    'MISSED',
    'NO_SHOW',
    'CANCELLED_BY_ADMIN'
  )),
  -- NULL until a real bay/mechanic is assigned (the app treats any non-placeholder text as an occupied bay)
  assigned_bay TEXT,
  assigned_mechanic TEXT,
  estimated_pickup TEXT DEFAULT 'Evaluating unit...',
  total_estimate TEXT DEFAULT 'Pending Inspection',
  notes TEXT,
  dropoff_date DATE NOT NULL DEFAULT current_date,
  dropoff_window TEXT,
  is_walk_in BOOLEAN NOT NULL DEFAULT false,

  -- Stage 5 billing & release
  parts_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'NONE',
  total_amount NUMERIC DEFAULT 0,
  billing_breakdown JSONB DEFAULT '[]'::jsonb,
  payment_method TEXT DEFAULT 'CASH',
  payment_status TEXT DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED')),
  paid_at TIMESTAMPTZ,
  released_by TEXT,

  -- Soft cancellation
  cancellation_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_tickets_user_id ON public.service_tickets (user_id);
CREATE INDEX idx_service_tickets_dropoff_date ON public.service_tickets (dropoff_date);
CREATE INDEX idx_service_tickets_stage_status ON public.service_tickets (stage, status);
CREATE INDEX idx_service_tickets_payment_status ON public.service_tickets (payment_status, paid_at);
CREATE INDEX idx_service_tickets_created_at ON public.service_tickets (created_at DESC);
CREATE INDEX idx_service_tickets_updated_at ON public.service_tickets (updated_at DESC);

CREATE TRIGGER trigger_service_tickets_updated_at
BEFORE UPDATE ON public.service_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: permissive for now (same behavior the app currently relies on).
-- TODO: tighten right after the reset (security item #3).
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temp: allow all on service_tickets" ON public.service_tickets FOR ALL USING (true) WITH CHECK (true);

-- Realtime: live queue, customer dashboard, and public tracking page
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_tickets;

NOTIFY pgrst, 'reload schema';

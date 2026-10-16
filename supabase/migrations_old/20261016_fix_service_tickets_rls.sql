-- =========================================================================
-- MIGRATION: Fix Row-Level Security (RLS) on service_tickets
-- MotoCare Workshop Management System
-- Enables Staff & Admin Console to assign bays, update stages, and bill tickets
-- =========================================================================

-- 1. Ensure table has RLS enabled
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

-- 2. Clean up conflicting policies
DROP POLICY IF EXISTS "Allow staff and public full access to service_tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Allow staff full access to service_tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Allow public update on service_tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Allow update on service_tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Allow read on service_tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Allow insert on service_tickets" ON public.service_tickets;
DROP POLICY IF EXISTS "Allow delete on service_tickets" ON public.service_tickets;

-- 3. Permissive Workshop Operations Policies
-- (a) SELECT: Anyone can view active repairs (for public track page, customer portal, and workshop console)
CREATE POLICY "Allow read on service_tickets"
ON public.service_tickets
FOR SELECT
USING (true);

-- (b) INSERT: Allows customer online bookings and staff walk-in creation
CREATE POLICY "Allow insert on service_tickets"
ON public.service_tickets
FOR INSERT
WITH CHECK (true);

-- (c) UPDATE: Allows staff bay assignment, stage advancement, billing release, and customer approvals
CREATE POLICY "Allow update on service_tickets"
ON public.service_tickets
FOR UPDATE
USING (true)
WITH CHECK (true);

-- (d) DELETE: Allows authorized ticket voiding / cleanup
CREATE POLICY "Allow delete on service_tickets"
ON public.service_tickets
FOR DELETE
USING (true);

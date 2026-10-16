-- =========================================================================
-- MIGRATION: Fix Messages Table RLS and Columns for Workshop Floor Chat
-- MotoCare Workshop Management System
-- Enables Staff & Admin Console to reply to customer chat messages
-- =========================================================================

-- 1. Ensure table has RLS enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Add sender_name column if it does not exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- 3. Clean up conflicting policies
DROP POLICY IF EXISTS "Allow staff and users to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow staff and users to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all read on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all insert on messages" ON public.messages;

-- 4. Permissive Policies for Real-time Customer & Staff Chat
-- (a) SELECT: Allows customer and staff to read conversation history
CREATE POLICY "Allow all read on messages"
ON public.messages
FOR SELECT
USING (true);

-- (b) INSERT: Allows customer and staff to send chat messages
CREATE POLICY "Allow all insert on messages"
ON public.messages
FOR INSERT
WITH CHECK (true);

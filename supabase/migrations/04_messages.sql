-- =========================================================================
-- 04: MESSAGES — chat ng customer at shop, notifications, hardcopy requests
-- MotoCare Workshop Management System
-- user_id is always the CUSTOMER's id (the conversation owner), even for staff replies
-- =========================================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'staff', 'admin')),
  sender_name TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_user_id ON public.messages (user_id);
CREATE INDEX idx_messages_created_at ON public.messages (created_at);

-- RLS: permissive for now (same behavior the app currently relies on).
-- TODO: tighten right after the reset (security item #3).
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temp: allow all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Realtime: live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

NOTIFY pgrst, 'reload schema';

-- =========================================================================
-- 23: CHAT AUTO-REPLY — sagot ng system sa quick buttons ng rider chat
-- MotoCare Workshop Management System
--
-- The database writes the reply, so a rider can never post as the shop.
--   1. Quick button (exact text only, see QUICK_MESSAGES in MessagesModal.tsx):
--        Repair status / Pickup time   answered from the rider's own tickets
--        Cost estimate / Running late / Change my booking   "received", staff still answer
--   2. A typed message while the shop is closed: one notice per day.
--   Any other typed message gets no auto-reply. Staff answer it.
--
-- Stored in messages as:
--   [AUTO_REPLY] {...}      fully answered, staff don't need to reply
--   [AUTO_RECEIVED] {...}   acknowledged, the question still waits for staff
--
-- A failed auto-reply never blocks the rider's own message.
-- Safe to re-run. Run in the Supabase SQL Editor after migration 22.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Guard (from migration 18) now knows about auto-replies
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_app_request() OR public.is_workshop_user() THEN
    RETURN NEW;
  END IF;

  -- Written by trigger_auto_reply_to_rider while the rider's message is being saved.
  -- A rider's own insert always runs at depth 1, so it can't get in this way.
  IF pg_trigger_depth() > 1
     AND (NEW.message LIKE '[AUTO\_REPLY]%' OR NEW.message LIKE '[AUTO\_RECEIVED]%') THEN
    NEW.sender_role := 'admin';
    RETURN NEW;
  END IF;

  IF NEW.message LIKE '[AUTO\_REPLY]%' OR NEW.message LIKE '[AUTO\_RECEIVED]%' THEN
    RAISE EXCEPTION 'Only the shop can send automatic replies.';
  END IF;

  IF NEW.message LIKE '[HARDCOPY\_STATUS\_UPDATE]%' THEN
    RAISE EXCEPTION 'Only the shop can update a hardcopy request.';
  END IF;

  IF NEW.message LIKE '[MISSED\_BOOKING\_NOTICE]%'
     OR NEW.message LIKE '[BOOKING\_REMINDER]%'
     OR NEW.message LIKE '[RESCHEDULE\_CONFIRMED]%' THEN
    -- System notice the app writes into the rider's own inbox
    NEW.sender_role := 'admin';
  ELSE
    -- Everything else the rider sends is a customer message, under their own name
    NEW.sender_role := 'customer';
    NEW.sender_name := (SELECT full_name FROM public.profiles WHERE id = auth.uid());
    NEW.is_read := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- -------------------------------------------------------------------------
-- 2. The auto-reply
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_reply_to_rider()
RETURNS TRIGGER AS $$
DECLARE
  question TEXT := btrim(NEW.message);
  local_now TIMESTAMP := now() AT TIME ZONE 'Asia/Manila';
  today DATE := (now() AT TIME ZONE 'Asia/Manila')::date;
  topic TEXT;
  tag TEXT := '[AUTO_REPLY]';
  reply TEXT;
  site JSONB;
  open_text TEXT;
  closed_text TEXT;
  hours TEXT[];
  open_minute INT := 8 * 60;
  close_minute INT := 18 * 60;
  now_minute INT;
  t RECORD;
  bike TEXT;
  arrival TEXT;
  is_pending BOOLEAN;
  is_checked_in BOOLEAN;
  line TEXT;
  lines TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- App notices such as a hardcopy request are not chat questions
  IF question ~ '^\[[A-Z_]+\]' THEN
    RETURN NEW;
  END IF;

  topic := CASE question
    WHEN 'Hi, may I know the status of my motorcycle?' THEN 'status'
    WHEN 'Hi, what time can I pick up my motorcycle?' THEN 'pickup'
    WHEN 'Hi, may I get a cost estimate for my repair?' THEN 'cost'
    WHEN 'Hi, I may be late for my appointment. Can I still come in?' THEN 'late'
    WHEN 'Hi, I need help changing my booking.' THEN 'change'
  END;

  -- Typed message: only a once-a-day notice while the shop is closed
  IF topic IS NULL THEN
    SELECT value INTO site FROM public.app_settings WHERE key = 'site_content';
    open_text := COALESCE(NULLIF(btrim(site ->> 'openHours'), ''), '8:00 AM – 6:00 PM');
    closed_text := COALESCE(btrim(site ->> 'closedDays'), 'Sunday');

    hours := regexp_match(
      open_text,
      '(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*(?:–|—|-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)',
      'i'
    );
    IF hours IS NOT NULL THEN
      open_minute := (hours[1]::INT % 12 + CASE WHEN upper(hours[3]) = 'PM' THEN 12 ELSE 0 END) * 60
        + COALESCE(hours[2]::INT, 0);
      close_minute := (hours[4]::INT % 12 + CASE WHEN upper(hours[6]) = 'PM' THEN 12 ELSE 0 END) * 60
        + COALESCE(hours[5]::INT, 0);
    END IF;

    now_minute := EXTRACT(HOUR FROM local_now)::INT * 60 + EXTRACT(MINUTE FROM local_now)::INT;

    IF NOT (
      closed_text ILIKE '%' || to_char(local_now, 'FMDay') || '%'
      OR now_minute < open_minute
      OR now_minute >= close_minute
    ) THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.messages
      WHERE user_id = NEW.user_id
        AND sender_role = 'admin'
        AND message LIKE '[AUTO\_RECEIVED]%'
        AND message LIKE '%"topic": "after_hours"%'
        AND created_at >= (today::TIMESTAMP AT TIME ZONE 'Asia/Manila')
    ) THEN
      RETURN NEW;
    END IF;

    topic := 'after_hours';
    tag := '[AUTO_RECEIVED]';
    reply := 'Thanks for your message. The shop is closed right now. We are open ' || open_text
      || CASE WHEN closed_text <> '' THEN ', closed ' || closed_text ELSE '' END
      || '. Our staff will reply when we open.';

  ELSE
    -- The same button pressed again within a minute gets no second reply
    IF EXISTS (
      SELECT 1 FROM public.messages
      WHERE user_id = NEW.user_id
        AND sender_role = 'admin'
        AND (message LIKE '[AUTO\_REPLY]%' OR message LIKE '[AUTO\_RECEIVED]%')
        AND message LIKE '%"topic": "' || topic || '"%'
        AND created_at > now() - INTERVAL '1 minute'
    ) THEN
      RETURN NEW;
    END IF;

    IF topic = 'cost' THEN
      tag := '[AUTO_RECEIVED]';
      reply := 'We got your request for a cost estimate. Our staff will reply during shop hours.';

    ELSIF topic = 'late' THEN
      tag := '[AUTO_RECEIVED]';
      reply := 'Thanks for letting us know. Our staff will reply during shop hours.';

    ELSIF topic = 'change' THEN
      tag := '[AUTO_RECEIVED]';
      reply := 'You can reschedule or cancel from your Dashboard until work starts. '
        || 'If you need more help, our staff will reply during shop hours.';

    ELSE
      FOR t IN
        SELECT st.status, st.stage, st.notes, st.dropoff_date, st.dropoff_window, st.is_walk_in,
               st.estimated_pickup, m.model, m.plate_number
        FROM public.service_tickets st
        LEFT JOIN public.motorcycles m ON m.id = st.motorcycle_id
        WHERE st.user_id = NEW.user_id
          AND st.status NOT IN ('COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN')
          AND (st.status NOT IN ('MISSED', 'NO_SHOW') OR st.dropoff_date >= today - 7)
        ORDER BY st.dropoff_date, st.created_at
        LIMIT 3
      LOOP
        bike := COALESCE(t.model, 'Your motorcycle')
          || CASE WHEN t.plate_number IS NOT NULL THEN ' (' || t.plate_number || ')' ELSE '' END;
        is_pending := t.status = 'PENDING_CONFIRMATION'
          OR strpos(COALESCE(t.notes, ''), '[BOOKING:PENDING_CONFIRMATION]') > 0;
        is_checked_in := strpos(COALESCE(t.notes, ''), '[CHECKED_IN') > 0
          OR strpos(COALESCE(t.notes, ''), '[LATE_CHECKIN_OVERRIDE') > 0;
        arrival := COALESCE(
          t.dropoff_window,
          substring(t.notes FROM 'Arrival Window:\s*([0-9]{1,2}:[0-9]{2} [AP]M - [0-9]{1,2}:[0-9]{2} [AP]M)')
        );
        arrival := regexp_replace(regexp_replace(arrival, '^0', ''), ' - 0?', ' – ');

        IF t.status IN ('MISSED', 'NO_SHOW') THEN
          line := bike || ': This booking was missed. You can reschedule it from your Dashboard.';

        ELSIF is_pending THEN
          line := bike || ': Your booking for ' || to_char(t.dropoff_date, 'Mon FMDD')
            || ' is waiting for the shop to confirm.';

        ELSIF NOT t.is_walk_in AND NOT is_checked_in AND (
          strpos(COALESCE(t.notes, ''), '[BOOKING:PENDING_DROPOFF]') > 0 OR t.dropoff_date > today
        ) THEN
          line := bike || ': Confirmed for ' || to_char(t.dropoff_date, 'Mon FMDD')
            || COALESCE(', ' || arrival, '') || '.'
            || CASE WHEN topic = 'pickup' THEN ' It is not at the shop yet, so there is no pickup time.'
                    ELSE ' Please bring it to the shop.' END;

        ELSIF t.stage = 5 OR t.status = 'READY_FOR_PICKUP' THEN
          line := bike || ': Ready for pickup. You can claim it during shop hours.';

        ELSIF topic = 'status' THEN
          line := bike || ': At the shop. Stage ' || t.stage || ' of 5: '
            || (ARRAY['Intake', 'Inspect', 'Service', 'Test', 'Ready'])[t.stage] || '.';

        ELSIF t.estimated_pickup ~ '[0-9]' THEN
          line := bike || ': Estimated ready by ' || t.estimated_pickup || '. This can still change.';

        ELSE
          line := bike || ': There is no estimated time yet. Our staff will update you.';
          tag := '[AUTO_RECEIVED]';
        END IF;

        lines := lines || line;
      END LOOP;

      reply := CASE WHEN cardinality(lines) > 0
        THEN array_to_string(lines, E'\n')
        ELSE 'You have no active service right now. You can book one from your Dashboard.'
      END;
    END IF;
  END IF;

  -- The reply must always sort after the question saved in this same transaction
  INSERT INTO public.messages (user_id, sender_role, sender_name, message, created_at)
  VALUES (
    NEW.user_id,
    'admin',
    'MotoCare',
    tag || ' ' || jsonb_build_object('topic', topic, 'message', reply)::TEXT,
    GREATEST(clock_timestamp(), NEW.created_at + INTERVAL '1 millisecond')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'auto_reply_to_rider failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_reply_to_rider ON public.messages;
CREATE TRIGGER trigger_auto_reply_to_rider
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.sender_role = 'customer')
EXECUTE FUNCTION public.auto_reply_to_rider();

NOTIFY pgrst, 'reload schema';

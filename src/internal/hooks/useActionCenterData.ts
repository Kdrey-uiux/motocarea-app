import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { readSharedSetting, saveSharedSetting, SHARED_SETTINGS } from '../../lib/sharedSettings';
import { HardcopyRequest } from '../../lib/hardcopyService';
import { isPendingOnlineBooking } from '../utils/ticketActions';
import { fetchAllReviews, getReviewStatus, ModeratedReview } from '../utils/reviewModeration';
import { InternalTicket } from '../types/internal';

export interface WaitingConversation {
  userId: string;
  customerName: string;
  lastMessage: string;
  lastTime: string;
}

export interface PartsAnswer {
  key: string;
  ticket: InternalTicket;
  itemName: string;
  approved: boolean;
  respondedAt?: string;
}

export interface CustomerUpdate {
  key: string;
  ticket: InternalTicket;
  label: string;
}

export interface ActionCenterData {
  pendingBookings: InternalTicket[];
  chatsToAnswer: WaitingConversation[];
  partsAnswers: PartsAnswer[];
  pendingReviews: ModeratedReview[];
  readyForRelease: InternalTicket[];
  missedBookings: InternalTicket[];
  pendingHardcopies: HardcopyRequest[];
  customerUpdates: CustomerUpdate[];
  totalActions: number;
  reloadReviews: () => void;
  dismiss: (keys: string[], actor: string) => Promise<{ success: boolean; error?: string }>;
}

const MAX_DISMISSED_KEYS = 500;
// Automated notices and hardcopy payloads are stored as "[TAG] ..." messages, not customer chat
const SYSTEM_MESSAGE = /^\[[A-Z_]+\]/;
const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN'];

function countReschedules(notes?: string): number {
  return (notes?.match(/\[Rescheduled to /g) || []).length;
}

/**
 * Everything customers did that needs a response from the workshop.
 * Runs at the console level so sidebar badges stay live on every page.
 */
export function useActionCenterData(tickets: InternalTicket[], hardcopyRequests: HardcopyRequest[]): ActionCenterData {
  const [waitingChats, setWaitingChats] = useState<WaitingConversation[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ModeratedReview[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() =>
    readSharedSetting<string[]>(SHARED_SETTINGS.dismissedActions, [])
  );
  const [resolvedChats, setResolvedChats] = useState<string[]>(() =>
    readSharedSetting<string[]>(SHARED_SETTINGS.resolvedConversations, [])
  );

  // Shared "Got it" / resolved lists stay in sync across all staff devices
  useEffect(() => {
    const onDismissed = () => setDismissed(readSharedSetting<string[]>(SHARED_SETTINGS.dismissedActions, []));
    const onResolved = () =>
      setResolvedChats(readSharedSetting<string[]>(SHARED_SETTINGS.resolvedConversations, []));
    window.addEventListener(SHARED_SETTINGS.dismissedActions.event, onDismissed);
    window.addEventListener(SHARED_SETTINGS.resolvedConversations.event, onResolved);
    return () => {
      window.removeEventListener(SHARED_SETTINGS.dismissedActions.event, onDismissed);
      window.removeEventListener(SHARED_SETTINGS.resolvedConversations.event, onResolved);
    };
  }, []);

  const ticketByUser = useMemo(() => {
    const map = new Map<string, InternalTicket>();
    tickets.forEach((t) => {
      if (t.user_id && !map.has(t.user_id)) map.set(t.user_id, t);
    });
    return map;
  }, [tickets]);

  // Customers whose latest real chat message is theirs (no reply from the shop yet)
  const loadWaitingChats = useCallback(() => {
    supabase
      .from('messages')
      .select('user_id, sender_role, message, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(async ({ data, error }) => {
        if (error || !data) return;
        const latestByUser = new Map<string, (typeof data)[number]>();
        data.forEach((m) => {
          if (!m.user_id || latestByUser.has(m.user_id) || SYSTEM_MESSAGE.test(m.message || '')) return;
          latestByUser.set(m.user_id, m);
        });

        const waiting = Array.from(latestByUser.values()).filter((m) => m.sender_role === 'customer');
        const missingNames = waiting.map((m) => m.user_id).filter((id) => !ticketByUser.get(id)?.customer_name);
        const names = new Map<string, string>();
        if (missingNames.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', missingNames);
          profs?.forEach((p) => names.set(p.id, p.full_name));
        }

        setWaitingChats(
          waiting.map((m) => ({
            userId: m.user_id,
            customerName: ticketByUser.get(m.user_id)?.customer_name || names.get(m.user_id) || 'Rider Customer',
            lastMessage: m.message,
            lastTime: m.created_at,
          }))
        );
      });
  }, [ticketByUser]);

  const reloadReviews = useCallback(() => {
    fetchAllReviews().then((res) => {
      if (!res.error) setPendingReviews(res.reviews.filter((r) => getReviewStatus(r) === 'pending'));
    });
  }, []);

  useEffect(() => {
    loadWaitingChats();
    reloadReviews();

    const channel = supabase
      .channel('action_center_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadWaitingChats())
      .subscribe();
    const poll = setInterval(() => {
      loadWaitingChats();
      reloadReviews();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [loadWaitingChats, reloadReviews]);

  const isDismissed = useCallback((key: string) => dismissed.includes(key), [dismissed]);

  const pendingBookings = useMemo(
    () =>
      tickets
        .filter((t) => isPendingOnlineBooking(t) && t.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [tickets]
  );

  const chatsToAnswer = useMemo(
    () => waitingChats.filter((c) => !resolvedChats.includes(c.userId)),
    [waitingChats, resolvedChats]
  );

  const partsAnswers = useMemo(() => {
    const list: PartsAnswer[] = [];
    tickets.forEach((t) => {
      if (CLOSED_STATUSES.includes(t.status)) return;
      (t.billing_breakdown || []).forEach((item) => {
        if (!item.isAdditional || (item.approvalStatus !== 'APPROVED' && item.approvalStatus !== 'DECLINED')) return;
        const key = `parts:${t.id}:${item.id}:${item.approvalStatus}`;
        if (isDismissed(key)) return;
        list.push({
          key,
          ticket: t,
          itemName: item.name,
          approved: item.approvalStatus === 'APPROVED',
          respondedAt: item.respondedAt,
        });
      });
    });
    return list;
  }, [tickets, isDismissed]);

  const readyForRelease = useMemo(
    () => tickets.filter((t) => t.stage === 5 && !CLOSED_STATUSES.includes(t.status)),
    [tickets]
  );

  const missedBookings = useMemo(
    () => tickets.filter((t) => (t.status === 'MISSED' || t.status === 'NO_SHOW') && !isDismissed(`missed:${t.id}`)),
    [tickets, isDismissed]
  );

  const pendingHardcopies = useMemo(() => hardcopyRequests.filter((r) => r.status === 'PENDING'), [hardcopyRequests]);

  // FYI: customer-side changes the shop should know about
  const customerUpdates = useMemo(() => {
    const list: CustomerUpdate[] = [];
    tickets.forEach((t) => {
      // Customer cancellations leave cancelled_by empty (staff cancellations record the staff name)
      if (t.status === 'CANCELLED' && !t.cancelled_by && !isDismissed(`cancel:${t.id}`)) {
        list.push({ key: `cancel:${t.id}`, ticket: t, label: 'Customer cancelled this booking' });
      }
      const reschedules = countReschedules(t.notes);
      const assisted = /Reschedule Note: Assisted by [^|]*\| \[Rescheduled to [^\]]*\]\s*$/.test((t.notes || '').trim());
      if (reschedules > 0 && !assisted && !isDismissed(`resched:${t.id}:${reschedules}`)) {
        list.push({
          key: `resched:${t.id}:${reschedules}`,
          ticket: t,
          label: `Customer rescheduled to ${t.dropoff_date || 'a new date'}`,
        });
      }
    });
    return list;
  }, [tickets, isDismissed]);

  const totalActions =
    pendingBookings.length +
    chatsToAnswer.length +
    partsAnswers.length +
    pendingReviews.length +
    readyForRelease.length +
    missedBookings.length +
    pendingHardcopies.length +
    customerUpdates.length;

  const dismiss = useCallback(
    (keys: string[], actor: string) => {
      const updated = Array.from(new Set([...dismissed, ...keys])).slice(-MAX_DISMISSED_KEYS);
      setDismissed(updated);
      return saveSharedSetting(SHARED_SETTINGS.dismissedActions, updated, actor);
    },
    [dismissed]
  );

  return {
    pendingBookings,
    chatsToAnswer,
    partsAnswers,
    pendingReviews,
    readyForRelease,
    missedBookings,
    pendingHardcopies,
    customerUpdates,
    totalActions,
    reloadReviews,
    dismiss,
  };
}

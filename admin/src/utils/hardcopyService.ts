import { supabase } from '../lib/supabase';

export interface HardcopyRequest {
  id: string; // e.g. "HR-7719"
  userId: string;
  customerName: string;
  customerPhone?: string;
  bikeModel: string;
  plateNumber: string;
  purpose: string;
  notes?: string;
  status: 'PENDING' | 'READY_FOR_PICKUP' | 'CLAIMED';
  createdAt: string;
  readyAt?: string;
  claimedAt?: string;
}

const BROADCAST_CHANNEL = 'motocare_hardcopy_realtime';

/**
 * Fetch all hardcopy requests from messages table
 */
export async function fetchHardcopyRequests(): Promise<HardcopyRequest[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    const requestMap = new Map<string, HardcopyRequest>();

    data.forEach((msg) => {
      const text: string = msg.message || '';
      if (text.startsWith('[HARDCOPY_REQUEST]')) {
        try {
          const jsonStr = text.replace('[HARDCOPY_REQUEST]', '').trim();
          const req = JSON.parse(jsonStr) as HardcopyRequest;
          if (req.id) {
            requestMap.set(req.id, {
              ...req,
              userId: req.userId || msg.user_id,
              createdAt: req.createdAt || msg.created_at,
            });
          }
        } catch {
          // ignore corrupted message
        }
      } else if (text.startsWith('[HARDCOPY_STATUS_UPDATE]')) {
        try {
          const jsonStr = text.replace('[HARDCOPY_STATUS_UPDATE]', '').trim();
          const update = JSON.parse(jsonStr);
          if (update.requestId && requestMap.has(update.requestId)) {
            const existing = requestMap.get(update.requestId)!;
            requestMap.set(update.requestId, {
              ...existing,
              status: update.status || existing.status,
              readyAt: update.readyAt || existing.readyAt,
              claimedAt: update.claimedAt || existing.claimedAt,
            });
          }
        } catch {
          // ignore
        }
      }
    });

    return Array.from(requestMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching hardcopy requests in admin:', err);
    return [];
  }
}

/**
 * Admin updates hardcopy status (e.g. READY_FOR_PICKUP or CLAIMED)
 */
export async function updateHardcopyStatus(params: {
  requestId: string;
  userId: string;
  bikeModel: string;
  status: 'READY_FOR_PICKUP' | 'CLAIMED';
}): Promise<boolean> {
  try {
    const updatePayload = {
      requestId: params.requestId,
      bikeModel: params.bikeModel,
      status: params.status,
      readyAt: params.status === 'READY_FOR_PICKUP' ? new Date().toISOString() : undefined,
      claimedAt: params.status === 'CLAIMED' ? new Date().toISOString() : undefined,
    };

    const friendlyMsg =
      params.status === 'READY_FOR_PICKUP'
        ? `Official hardcopy record #${params.requestId} for ${params.bikeModel} is signed by Lead Tech and stamped! Ready for pickup at Santa Maria Front Desk.`
        : `Official hardcopy record #${params.requestId} for ${params.bikeModel} has been claimed. Thank you!`;

    // 1. Insert update structured message
    const { error } = await supabase.from('messages').insert({
      user_id: params.userId,
      sender_role: 'admin',
      message: `[HARDCOPY_STATUS_UPDATE] ${JSON.stringify(updatePayload)}`,
    });

    if (error) {
      console.error('Failed to update hardcopy status:', error);
      return false;
    }

    // Friendly message for customer
    await supabase.from('messages').insert({
      user_id: params.userId,
      sender_role: 'admin',
      message: friendlyMsg,
    });

    // 2. Broadcast realtime update
    try {
      const channel = supabase.channel(BROADCAST_CHANNEL);
      await channel.send({
        type: 'broadcast',
        event: 'HARDCOPY_STATUS_CHANGED',
        payload: updatePayload,
      });
    } catch {
      // broadcast fallback
    }

    return true;
  } catch (err) {
    console.error('Error updating hardcopy status:', err);
    return false;
  }
}

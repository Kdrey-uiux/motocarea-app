import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

router.use(requireAuth);

// 1. Kunin ang chat messages ng naka-login na rider
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({
      success: true,
      data: messages || [],
    });
  } catch (err: unknown) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 2. Mag-send ng message sa workshop helpdesk
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { message } = req.body;

    const cleanMessage = message ? String(message).trim() : '';
    if (!cleanMessage) {
      res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
      return;
    }

    const senderRole = req.userRole?.toUpperCase() === 'ADMIN' ? 'admin' : 'customer';

    const { data: newMsg, error } = await supabaseAdmin
      .from('messages')
      .insert({
        user_id: userId,
        sender_role: senderRole,
        message: cleanMessage,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      data: newMsg,
    });
  } catch (err: unknown) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;

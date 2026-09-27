import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

router.use(requireAuth);

// 1. Kunin ang profile information ng naka-login na user
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || 'Rider Customer',
        phone_number: profile?.phone_number || user.user_metadata?.phone_number || 'N/A',
        role: profile?.role || 'CUSTOMER',
      },
    });
  } catch (err: unknown) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 2. I-update ang profile information
router.put('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { full_name, phone_number } = req.body;

    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (phone_number !== undefined) updates.phone_number = phone_number.trim();

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No fields to update.' });
      return;
    }

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedProfile,
    });
  } catch (err: unknown) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;

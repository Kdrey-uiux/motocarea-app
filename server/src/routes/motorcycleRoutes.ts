import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import { AuthenticatedRequest, MotorcyclePayload } from '../types/index.js';

import { MOTORCYCLE_CATALOG_SEEDS } from '../scripts/seedMotorcycles.js';

const router = Router();

// =========================================================================
// 1. PUBLIC CATALOG: Kunin ang database listahan ng mga modelo ng motor
// =========================================================================
router.get('/catalog', async (req, res): Promise<void> => {
  try {
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';

    // Subukan kunin mula sa Supabase table: motorcycle_models
    const { data: dbModels, error } = await supabaseAdmin
      .from('motorcycle_models')
      .select('id, brand, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (!error && dbModels && dbModels.length > 0) {
      let filtered = dbModels;
      if (q) {
        filtered = dbModels.filter(
          (b) => b.name.toLowerCase().includes(q) || b.brand.toLowerCase().includes(q)
        );
      }
      res.json({
        success: true,
        source: 'database',
        count: filtered.length,
        data: filtered,
      });
      return;
    }

    // Fallback kung hindi pa napa-run ang table migration sa Supabase
    let fallbackList = MOTORCYCLE_CATALOG_SEEDS.map((b, idx) => ({
      id: `seed-${idx}`,
      brand: b.brand,
      name: b.name,
    }));

    if (q) {
      fallbackList = fallbackList.filter(
        (b) => b.name.toLowerCase().includes(q) || b.brand.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      source: 'fallback',
      count: fallbackList.length,
      data: fallbackList,
    });
  } catch (err: unknown) {
    console.error('Catalog fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch motorcycle catalog.' });
  }
});

// Require authentication para sa mga sumusunod na rider fleet endpoints
router.use(requireAuth);

// 2. Kunin ang mga motor ng naka-login na rider
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: motorcycles, error } = await supabaseAdmin
      .from('motorcycles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({
      success: true,
      count: motorcycles?.length || 0,
      data: motorcycles || [],
    });
  } catch (err: unknown) {
    console.error('Fetch motorcycles error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 2. Mag-rehistro ng bagong motor sa garahe
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { model, plate_number, year_model, odometer } = req.body as MotorcyclePayload;

    if (!model?.trim() || !plate_number?.trim()) {
      res.status(400).json({
        success: false,
        message: 'Motorcycle model and plate number are required.',
      });
      return;
    }

    const cleanPlate = plate_number.trim().toUpperCase();

    // Check kung may duplicate plate na nakarehistro sa user
    const { data: existing } = await supabaseAdmin
      .from('motorcycles')
      .select('id')
      .eq('user_id', userId)
      .eq('plate_number', cleanPlate)
      .maybeSingle();

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Plate number "${cleanPlate}" is already registered in your garage.`,
      });
      return;
    }

    const { data: newBike, error } = await supabaseAdmin
      .from('motorcycles')
      .insert({
        user_id: userId,
        model: model.trim(),
        plate_number: cleanPlate,
        year_model: year_model || new Date().getFullYear().toString(),
        odometer: odometer ? `${odometer} km` : '0 km',
        status: 'Active',
        next_service: 'Due in 3,000 km',
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Motorcycle registered successfully.',
      data: newBike,
    });
  } catch (err: unknown) {
    console.error('Register motorcycle error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 3. Magtanggal ng motor sa garahe
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Siguraduhing pag-aari ng user
    const { data: bike } = await supabaseAdmin
      .from('motorcycles')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!bike) {
      res.status(404).json({
        success: false,
        message: 'Motorcycle not found or access denied.',
      });
      return;
    }

    const { error } = await supabaseAdmin
      .from('motorcycles')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({
      success: true,
      message: 'Motorcycle removed from garage.',
    });
  } catch (err: unknown) {
    console.error('Delete motorcycle error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;

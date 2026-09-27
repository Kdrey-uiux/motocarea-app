import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/adminOnly.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Lahat ng endpoints sa router na ito ay nangangailangan ng Admin privilege
router.use(requireAuth, requireAdmin);

// 1. ADMIN: Kunin ang lahat ng workshop tickets sa pila
router.get('/tickets', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: tickets, error } = await supabaseAdmin
      .from('service_tickets')
      .select(`
        id,
        ticket_code,
        service_type,
        stage,
        assigned_bay,
        assigned_mechanic,
        estimated_pickup,
        total_estimate,
        status,
        notes,
        dropoff_date,
        created_at,
        user_id,
        motorcycles (
          id,
          model,
          plate_number,
          year_model,
          odometer
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({
      success: true,
      count: tickets?.length || 0,
      data: tickets || [],
    });
  } catch (err: unknown) {
    console.error('Admin fetch tickets error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 2. ADMIN: I-update ang status, stage, bay, o mechanic ng isang ticket
router.patch('/tickets/:ticketId/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const { status, stage, assigned_bay, assigned_mechanic, estimated_pickup } = req.body;

    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      const validStatuses = ['IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
        return;
      }
      updates.status = status;
      if (status === 'COMPLETED') {
        updates.stage = 5;
      }
    }

    if (stage !== undefined) {
      const stageNum = parseInt(stage, 10);
      if (stageNum >= 1 && stageNum <= 5) {
        updates.stage = stageNum;
      }
    }

    if (assigned_bay !== undefined) updates.assigned_bay = assigned_bay;
    if (assigned_mechanic !== undefined) updates.assigned_mechanic = assigned_mechanic;
    if (estimated_pickup !== undefined) updates.estimated_pickup = estimated_pickup;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No valid update fields provided.' });
      return;
    }

    const { data: updatedTicket, error } = await supabaseAdmin
      .from('service_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select(`
        *,
        motorcycles (
          model,
          plate_number
        )
      `)
      .single();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully.',
      data: updatedTicket,
    });
  } catch (err: unknown) {
    console.error('Admin update ticket error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 3. ADMIN: Workshop metrics summary
router.get('/metrics', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: tickets, error } = await supabaseAdmin
      .from('service_tickets')
      .select('status');

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    const list = tickets || [];
    const inProgress = list.filter((t) => t.status === 'IN_PROGRESS').length;
    const ready = list.filter((t) => t.status === 'READY_FOR_PICKUP').length;
    const completed = list.filter((t) => t.status === 'COMPLETED').length;

    res.json({
      success: true,
      data: {
        total: list.length,
        inProgress,
        ready,
        completed,
      },
    });
  } catch (err: unknown) {
    console.error('Admin metrics error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;

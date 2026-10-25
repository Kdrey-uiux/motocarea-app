import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import { AuthenticatedRequest, TicketPayload } from '../types/index.js';
import { randomInt } from 'crypto';

// No look-alikes (0/O, 1/I/L) and no W (reserved for walk-in codes): see src/utils/ticketCode.ts
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVXYZ';

const router = Router();

// 1. PUBLIC: Track Service Status by Ticket Code
router.get('/track/:ticketCode', async (req, res): Promise<void> => {
  try {
    const rawCode = req.params.ticketCode?.trim().toUpperCase();
    if (!rawCode) {
      res.status(400).json({ success: false, message: 'Ticket code is required.' });
      return;
    }

    const { data: ticket, error } = await supabaseAdmin
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
        motorcycles (
          model,
          plate_number
        )
      `)
      .eq('ticket_code', rawCode)
      .maybeSingle();

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: `No service ticket found for code "${rawCode}".`,
      });
      return;
    }

    res.json({ success: true, data: ticket });
  } catch (err: unknown) {
    console.error('Public track lookup error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 2. CUSTOMER: Kunin ang lahat ng tickets ng naka-login na rider
router.get('/my-tickets', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Kunin ang active at completed tickets
    const { data: tickets, error } = await supabaseAdmin
      .from('service_tickets')
      .select(`
        *,
        motorcycles (
          model,
          plate_number
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ success: false, message: error.message });
      return;
    }

    const activeTickets = (tickets || []).filter(
      (t) => t.status === 'IN_PROGRESS' || t.status === 'READY_FOR_PICKUP'
    );
    const completedTickets = (tickets || []).filter((t) => t.status === 'COMPLETED');

    res.json({
      success: true,
      data: {
        all: tickets || [],
        active: activeTickets,
        history: completedTickets,
      },
    });
  } catch (err: unknown) {
    console.error('Fetch my-tickets error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// 3. CUSTOMER: Mag-book ng bagong service bay
router.post('/book', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      motorcycle_id,
      service_type,
      dropoff_date,
      notes,
      total_estimate,
    } = req.body as TicketPayload;

    if (!motorcycle_id || !service_type) {
      res.status(400).json({
        success: false,
        message: 'Motorcycle ID and service type are required.',
      });
      return;
    }

    // Siguraduhing pag-aari ng user ang motor
    const { data: bike } = await supabaseAdmin
      .from('motorcycles')
      .select('id')
      .eq('id', motorcycle_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!bike) {
      res.status(403).json({
        success: false,
        message: 'Selected motorcycle is not registered to your account.',
      });
      return;
    }

    // Hard-to-guess unique Ticket Code (e.g. MC-7KQ4P9), same format as the web app
    let ticketCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      attempts++;
      ticketCode = `MC-${Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')}`;

      const { data: existing } = await supabaseAdmin
        .from('service_tickets')
        .select('id')
        .eq('ticket_code', ticketCode)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      }
    }

    const { data: newTicket, error } = await supabaseAdmin
      .from('service_tickets')
      .insert({
        user_id: userId,
        motorcycle_id,
        ticket_code: ticketCode,
        service_type,
        stage: 1,
        assigned_bay: 'Bay Assignment Pending',
        assigned_mechanic: 'Queued for Assignment',
        estimated_pickup: 'To be assessed upon arrival',
        total_estimate: total_estimate || '₱350 - ₱600',
        status: 'IN_PROGRESS',
        dropoff_date: dropoff_date || new Date().toISOString().split('T')[0],
        notes: notes ? notes.trim() : null,
      })
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

    res.status(201).json({
      success: true,
      message: 'Service appointment successfully booked!',
      data: newTicket,
    });
  } catch (err: unknown) {
    console.error('Booking error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;

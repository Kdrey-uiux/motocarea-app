// =========================================================================
// notify-customer — MotoCare email notifications (Supabase Edge Function, Deno)
//
// Called by the database (see migrations/14_email_notifications.sql), never by the app:
//   { "kind": "confirmed", "ticket_id": "..." }  online booking accepted by the shop
//   { "kind": "ready",     "ticket_id": "..." }  motorcycle is ready for pickup
//   { "kind": "reminders" }                       daily: drop-off reminder for tomorrow's bookings
//
// Each email is sent at most once (public.notification_log), and only when the ticket
// really is in that state, so calling this endpoint by hand cannot spam a customer.
//
// Secrets (Supabase Dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY      API key from resend.com
//   NOTIFY_FROM_EMAIL   e.g. "MotoCare <notifications@your-domain.com>"
//   SITE_URL            e.g. "https://motocare.vercel.app" (links in the email)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
//
// Deploy with JWT verification OFF (the database calls it without a user token):
//   supabase functions deploy notify-customer --no-verify-jwt --project-ref cqkwlyqajtajkvctgdeu
// or in the Dashboard editor: create "notify-customer", paste this file, turn off "Verify JWT".
// =========================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

type Kind = 'confirmed' | 'ready' | 'reminder';

interface TicketRow {
  id: string;
  ticket_code: string;
  user_id: string | null;
  status: string;
  stage: number;
  notes: string | null;
  dropoff_date: string | null;
  service_type: string;
  motorcycles: { model: string | null; plate_number: string | null } | null;
}

const SHOP_ADDRESS = 'Cay Ban Ban St, Parada, Santa Maria, 3022 Bulacan';
const SHOP_PHONE = '+63 985 245 5897';
const SHOP_HOURS = 'Monday to Saturday, 8:00 AM to 6:00 PM';
const CLOSED_STATUSES = ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'MISSED', 'NO_SHOW'];
const TICKET_COLUMNS =
  'id, ticket_code, user_id, status, stage, notes, dropoff_date, service_type, motorcycles(model, plate_number)';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '');

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Calendar date in the Philippines, `daysAhead` days from now (YYYY-MM-DD) */
function manilaDate(daysAhead = 0): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function formatDate(dateKey: string | null): string {
  if (!dateKey) return '';
  return new Date(`${dateKey}T00:00:00+08:00`).toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function arrivalWindow(notes: string | null): string | null {
  return notes?.match(/Arrival Window:\s*([^,\n|]+)/i)?.[1]?.trim() || null;
}

/** The state each email is about must still be true when we send it */
function isStillValid(kind: Kind, t: TicketRow): boolean {
  const notes = t.notes || '';
  switch (kind) {
    case 'ready':
      return t.status === 'READY_FOR_PICKUP';
    case 'confirmed':
      return (
        !CLOSED_STATUSES.includes(t.status) &&
        t.status !== 'PENDING_CONFIRMATION' &&
        !notes.includes('[BOOKING:PENDING_CONFIRMATION]')
      );
    case 'reminder':
      return (
        t.status === 'IN_PROGRESS' &&
        t.stage === 1 &&
        t.dropoff_date === manilaDate(1) &&
        !notes.includes('[BOOKING:PENDING_CONFIRMATION]') &&
        !notes.includes('[CHECKED_IN') &&
        !notes.includes('[LATE_CHECKIN_OVERRIDE')
      );
  }
}

function buildEmail(kind: Kind, t: TicketRow, name: string): { subject: string; html: string } {
  const bike = [t.motorcycles?.model, t.motorcycles?.plate_number && `(${t.motorcycles.plate_number})`]
    .filter(Boolean)
    .join(' ') || 'your motorcycle';
  const window = arrivalWindow(t.notes);
  const trackUrl = siteUrl ? `${siteUrl}/track/${t.ticket_code}` : '';

  const copy: Record<Kind, { subject: string; heading: string; lines: string[] }> = {
    confirmed: {
      subject: `Booking confirmed: ${t.ticket_code}`,
      heading: 'Your booking is confirmed',
      lines: [
        `We accepted your ${escapeHtml(t.service_type)} booking for ${escapeHtml(bike)}.`,
        `Drop-off: <strong>${escapeHtml(formatDate(t.dropoff_date))}</strong>${window ? `, ${escapeHtml(window)}` : ''}.`,
        'Please bring your motorcycle to the MotoCare counter on that day.',
      ],
    },
    ready: {
      subject: `Ready for pickup: ${t.ticket_code}`,
      heading: 'Your motorcycle is ready',
      lines: [
        `${escapeHtml(bike)} passed quality testing and is ready for pickup.`,
        'Payment is settled in cash at the counter when you claim it.',
      ],
    },
    reminder: {
      subject: `Reminder: drop-off tomorrow (${t.ticket_code})`,
      heading: 'See you tomorrow',
      lines: [
        `This is a reminder to bring ${escapeHtml(bike)} for ${escapeHtml(t.service_type)}.`,
        `Drop-off: <strong>${escapeHtml(formatDate(t.dropoff_date))}</strong>${window ? `, ${escapeHtml(window)}` : ''}.`,
        "Can't make it? Reschedule or cancel from your MotoCare dashboard so we can give the slot to another rider.",
      ],
    },
  };
  const c = copy[kind];

  const html = `<!doctype html>
<html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px">
    <div style="font-size:20px;font-weight:800;margin-bottom:16px">Moto<span style="color:#f97316">Care</span></div>
    <div style="background:#ffffff;border-radius:16px;padding:24px">
      <p style="margin:0 0 4px;color:#64748b;font-size:13px">Ticket ${escapeHtml(t.ticket_code)}</p>
      <h1 style="margin:0 0 16px;font-size:22px">${c.heading}</h1>
      <p style="margin:0 0 12px;font-size:15px">Hi ${escapeHtml(name)},</p>
      ${c.lines.map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${line}</p>`).join('')}
      ${trackUrl ? `<a href="${trackUrl}" style="display:inline-block;margin-top:8px;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Track your repair</a>` : ''}
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.6">
      MotoCare Motorcycle Workshop<br>${SHOP_ADDRESS}<br>${SHOP_PHONE} · ${SHOP_HOURS}
    </p>
  </div>
</body></html>`;

  return { subject: c.subject, html };
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('NOTIFY_FROM_EMAIL');
  if (!apiKey || !from) throw new Error('RESEND_API_KEY or NOTIFY_FROM_EMAIL is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Sends one email for one ticket. Returns what happened, for the response/logs. */
async function notify(kind: Kind, t: TicketRow): Promise<string> {
  if (!t.user_id) return 'skipped: walk-in (no account)';
  if (!isStillValid(kind, t)) return 'skipped: ticket is no longer in that state';

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', t.user_id)
    .maybeSingle();
  if (!profile?.email) return 'skipped: no email on file';

  // Claim the send first; the unique key stops a second email for the same event
  const ref = kind === 'reminder' ? t.dropoff_date || '' : '';
  const { data: claimed, error: claimError } = await supabase
    .from('notification_log')
    .upsert({ ticket_id: t.id, kind, ref }, { onConflict: 'ticket_id,kind,ref', ignoreDuplicates: true })
    .select('id');
  if (claimError) throw claimError;
  if (!claimed || claimed.length === 0) return 'skipped: already sent';

  try {
    const { subject, html } = buildEmail(kind, t, profile.full_name || 'Rider');
    await sendEmail(profile.email, subject, html);
    return 'sent';
  } catch (err) {
    // Let a later call try again
    await supabase.from('notification_log').delete().eq('id', claimed[0].id);
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: { kind?: string; ticket_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  try {
    if (body.kind === 'confirmed' || body.kind === 'ready') {
      if (!body.ticket_id) return json({ error: 'ticket_id is required' }, 400);
      const { data: ticket, error } = await supabase
        .from('service_tickets')
        .select(TICKET_COLUMNS)
        .eq('id', body.ticket_id)
        .maybeSingle();
      if (error) throw error;
      if (!ticket) return json({ result: 'skipped: ticket not found' });
      return json({ result: await notify(body.kind, ticket as unknown as TicketRow) });
    }

    if (body.kind === 'reminders') {
      const { data: tickets, error } = await supabase
        .from('service_tickets')
        .select(TICKET_COLUMNS)
        .eq('dropoff_date', manilaDate(1))
        .eq('status', 'IN_PROGRESS')
        .eq('stage', 1)
        .not('user_id', 'is', null);
      if (error) throw error;

      const results: Record<string, string> = {};
      for (const t of (tickets || []) as unknown as TicketRow[]) {
        try {
          results[t.ticket_code] = await notify('reminder', t);
        } catch (err) {
          results[t.ticket_code] = `failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
      return json({ date: manilaDate(1), results });
    }

    return json({ error: 'Unknown kind' }, 400);
  } catch (err) {
    console.error('notify-customer error:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

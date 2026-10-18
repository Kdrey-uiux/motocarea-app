/**
 * Automatic notices are stored in `messages` as "[TAG] {json}" (missed booking,
 * reminders, reschedules, hardcopy requests). These helpers turn them into one
 * readable line for screens that don't render the full notice card.
 */

export const SYSTEM_MESSAGE = /^\[[A-Z_]+\]/;

export function isSystemMessage(text?: string | null): boolean {
  return SYSTEM_MESSAGE.test(text || '');
}

export function summarizeMessage(text?: string | null): string {
  const raw = text || '';
  const tag = raw.match(SYSTEM_MESSAGE)?.[0];
  if (!tag) return raw;

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(raw.slice(tag.length).trim());
  } catch {
    return raw.slice(tag.length).trim() || raw;
  }
  const str = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '');
  const code = str('ticketCode') ? `#${str('ticketCode')}` : '';

  switch (tag) {
    case '[MISSED_BOOKING_NOTICE]':
      return `Auto notice: booking ${code} was missed (not checked in).`;
    case '[BOOKING_REMINDER]':
      return `Auto reminder: drop-off today for ${code} (${str('timeWindow') || 'scheduled window'}).`;
    case '[RESCHEDULE_CONFIRMED]':
      return `Auto notice: ${code} rescheduled to ${str('newDropoffDate')} (${str('newTimeWindow')}).`;
    case '[HARDCOPY_REQUEST]':
      return `Hardcopy request ${str('id')}: ${str('bikeModel')} (${str('plateNumber')}) — ${str('purpose')}`;
    case '[HARDCOPY_STATUS_UPDATE]':
      return `Hardcopy ${str('requestId')} marked ${str('status').replace(/_/g, ' ').toLowerCase()}.`;
    default:
      return str('message') || raw;
  }
}

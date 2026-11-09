/**
 * Automatic notices are stored in `messages` as "[TAG] {json}" (missed booking,
 * reminders, reschedules, hardcopy requests). These helpers turn them into one
 * readable line for screens that don't render the full notice card.
 */

export const SYSTEM_MESSAGE = /^\[[A-Z_]+\]/;

export function isSystemMessage(text?: string | null): boolean {
  return SYSTEM_MESSAGE.test(text || '');
}

const AUTO_ANSWERED = '[AUTO_REPLY]';
const AUTO_RECEIVED = '[AUTO_RECEIVED]';

/** The text of an automatic chat reply, or null when the message is something else */
export function autoReplyText(text?: string | null): string | null {
  const raw = text || '';
  const tag = raw.startsWith(AUTO_ANSWERED) ? AUTO_ANSWERED : raw.startsWith(AUTO_RECEIVED) ? AUTO_RECEIVED : null;
  if (!tag) return null;
  try {
    const data = JSON.parse(raw.slice(tag.length).trim());
    return typeof data.message === 'string' ? data.message : null;
  } catch {
    return null;
  }
}

/**
 * The rider message still waiting for the shop, or null. Pass the chat newest first.
 * A quick question the system fully answered does not count; an "[AUTO_RECEIVED]" one still does.
 */
export function findWaitingMessage<T extends { sender_role: string; message: string }>(newestFirst: T[]): T | null {
  let answeredByAuto = false;
  for (const msg of newestFirst) {
    if ((msg.message || '').startsWith(AUTO_ANSWERED)) {
      answeredByAuto = true;
    } else if (isSystemMessage(msg.message)) {
      continue;
    } else if (msg.sender_role !== 'customer') {
      return null;
    } else if (answeredByAuto) {
      answeredByAuto = false;
    } else {
      return msg;
    }
  }
  return null;
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
    case AUTO_ANSWERED:
    case AUTO_RECEIVED:
      return `Automatic reply: ${str('message')}`;
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

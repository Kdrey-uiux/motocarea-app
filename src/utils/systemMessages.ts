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

// Same as migration 23/24: the same quick button pressed again within a minute gets no second reply
const REPEAT_WINDOW_MS = 60 * 1000;

/**
 * The rider message still waiting for the shop, or null. Pass the chat newest first.
 * A quick question the system fully answered does not count, and neither does the same
 * question pressed again within a minute (the database skips that repeat).
 * An "[AUTO_RECEIVED]" question still waits for staff.
 */
export function findWaitingMessage<T extends { sender_role: string; message: string; created_at?: string }>(
  newestFirst: T[]
): T | null {
  // Rider messages with no reply yet, oldest first
  let unanswered: T[] = [];
  // The question the system just answered, and when that answer was written
  let answered: { text: string; at: number } | null = null;

  for (let i = newestFirst.length - 1; i >= 0; i--) {
    const msg = newestFirst[i];
    const text = (msg.message || '').trim();

    if (text.startsWith(AUTO_ANSWERED)) {
      // The automatic answer belongs to the question right before it
      const question = unanswered.pop();
      answered = question
        ? { text: (question.message || '').trim(), at: new Date(msg.created_at || 0).getTime() }
        : null;
    } else if (isSystemMessage(text)) {
      continue;
    } else if (msg.sender_role !== 'customer') {
      unanswered = [];
      answered = null;
    } else {
      const isRepeat =
        answered !== null &&
        text === answered.text &&
        new Date(msg.created_at || 0).getTime() - answered.at < REPEAT_WINDOW_MS;
      if (!isRepeat) {
        unanswered.push(msg);
        answered = null;
      }
    }
  }
  return unanswered[unanswered.length - 1] ?? null;
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

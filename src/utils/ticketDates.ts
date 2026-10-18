/**
 * The date a customer should see for a past ticket:
 * - completed: when the motorcycle was released (paid_at is set at release), else last update
 * - missed / cancelled / anything else: the booked drop-off date
 * YYYY-MM-DD dates are read as local calendar days (not UTC midnight).
 */
export function getTicketDisplayDate(ticket: {
  status: string;
  created_at: string;
  dropoff_date?: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
}): Date {
  if (ticket.status === 'COMPLETED') {
    const done = ticket.paid_at || ticket.updated_at;
    if (done) return new Date(done);
  }
  const parts = (ticket.dropoff_date || '').split('-').map((p) => parseInt(p, 10));
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(ticket.created_at);
}

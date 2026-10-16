-- MIGRATION: Expand check constraint on service_tickets.status
-- Ensures PostgreSQL allows extended lifecycle statuses while remaining backward compatible

ALTER TABLE public.service_tickets DROP CONSTRAINT IF EXISTS service_tickets_status_check;

ALTER TABLE public.service_tickets ADD CONSTRAINT service_tickets_status_check
  CHECK (status IN (
    'PENDING_CONFIRMATION',
    'PENDING_DROPOFF',
    'CONFIRMED_APPOINTMENT',
    'IN_PROGRESS',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'CANCELLED',
    'MISSED',
    'NO_SHOW',
    'CANCELLED_BY_ADMIN'
  ));

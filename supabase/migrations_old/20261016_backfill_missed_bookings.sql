-- =========================================================================
-- MIGRATION: Backfill auto-expired bookings from CANCELLED to MISSED
-- MotoCare Workshop Management System
-- Dati, ang missed-booking scan ay nagse-save ng status = 'CANCELLED'.
-- Ngayon 'MISSED' na, kaya ililipat dito ang mga lumang auto-expired tickets
-- para lumabas ang Reschedule / Late Check-in buttons para sa kanila.
-- Requires: 20261016_update_service_tickets_status_check.sql (allows 'MISSED')
-- Safe and idempotent: can be executed repeatedly without errors
-- =========================================================================

UPDATE public.service_tickets
SET status = 'MISSED'
WHERE status = 'CANCELLED'
  AND notes LIKE '%[MISSED_EXPIRATION%'
  -- Skip tickets that were rescheduled after expiring (may have been cancelled by staff later)
  AND notes NOT LIKE '%[Rescheduled to%';

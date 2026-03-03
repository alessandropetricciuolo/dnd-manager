-- Fix: consentire status 'pending', 'approved', 'attended', 'rejected' per joinSession e flusso approvazioni.
-- Esegui in Supabase → SQL Editor se l'iscrizione dà: violates check constraint "session_signups_status_check"

ALTER TABLE session_signups
  DROP CONSTRAINT IF EXISTS session_signups_status_check;

ALTER TABLE session_signups
  ADD CONSTRAINT session_signups_status_check
  CHECK (status IN ('pending', 'approved', 'attended', 'rejected', 'confirmed', 'waitlist', 'cancelled'));

ALTER TABLE session_signups
  ALTER COLUMN status SET DEFAULT 'pending';

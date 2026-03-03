-- Aggiunge stato 'absent' per le assenze in chiusura sessione (appello).
ALTER TABLE session_signups
  DROP CONSTRAINT IF EXISTS session_signups_status_check;

ALTER TABLE session_signups
  ADD CONSTRAINT session_signups_status_check
  CHECK (status IN (
    'pending', 'approved', 'attended', 'rejected', 'absent',
    'confirmed', 'waitlist', 'cancelled'
  ));

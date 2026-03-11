-- Consenti ai player di bloccare gli avvisi automatici (email: nuove sessioni, conferme iscrizioni, assegnazione personaggi).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notifications_disabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.notifications_disabled IS 'Se true, il player non riceve email automatiche (nuove sessioni, conferme iscrizioni, assegnazione PG).';

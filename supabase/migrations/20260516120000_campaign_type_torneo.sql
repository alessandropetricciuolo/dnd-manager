-- Tipo evento Torneo: gestione simile a oneshot con funzioni ridotte in UI.
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_type_check;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_type_check CHECK (type IN ('oneshot', 'quest', 'long', 'torneo'));

COMMENT ON COLUMN campaigns.type IS 'Tipo evento: oneshot, quest, long, torneo.';

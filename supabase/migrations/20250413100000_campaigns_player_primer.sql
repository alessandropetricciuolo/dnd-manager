-- Bibbia di Campagna / Guida del Giocatore: solo per campagne lunghe.
-- is_long_campaign: abilita la sezione Guida del Giocatore (player primer).
-- player_primer: contenuto Markdown della guida (visibile ai giocatori).

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS is_long_campaign BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS player_primer TEXT;

COMMENT ON COLUMN campaigns.is_long_campaign IS 'Se true, abilita la Guida del Giocatore (Bibbia di Campagna) e il campo player_primer.';
COMMENT ON COLUMN campaigns.player_primer IS 'Contenuto Markdown della Guida del Giocatore. Visibile solo se is_long_campaign = true.';

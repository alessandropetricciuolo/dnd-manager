-- Impostazioni di impaginazione/tipografia per la Guida del Giocatore (Player Primer).
-- Il GM può impostare dimensione font e carattere dalla sezione Bibbia nel tab Solo GM.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS primer_typography JSONB DEFAULT '{"fontSize":"medium","fontFamily":"serif"}'::jsonb;

COMMENT ON COLUMN campaigns.primer_typography IS 'Impostazioni tipografia Guida del Giocatore: fontSize (small|medium|large), fontFamily (serif|sans).';

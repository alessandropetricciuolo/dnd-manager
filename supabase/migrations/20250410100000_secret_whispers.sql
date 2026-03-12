-- Chat 1-a-1 in tempo reale tra GM e giocatori (Sussurri Segreti)
CREATE TABLE IF NOT EXISTS secret_whispers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT secret_whispers_message_or_image CHECK (
    (message IS NOT NULL AND message <> '') OR (image_url IS NOT NULL AND image_url <> '')
  )
);

COMMENT ON TABLE secret_whispers IS 'Messaggi privati GM ↔ giocatore (Sussurri Segreti). image_url: stesso formato Wiki (es. /api/tg-image/xxx).';
COMMENT ON COLUMN secret_whispers.image_url IS 'URL immagine (es. /api/tg-image/file_id). Opzionale.';

CREATE INDEX IF NOT EXISTS idx_secret_whispers_campaign_receiver_sender
  ON secret_whispers(campaign_id, receiver_id, sender_id);

CREATE INDEX IF NOT EXISTS idx_secret_whispers_created_at
  ON secret_whispers(created_at);

ALTER TABLE secret_whispers ENABLE ROW LEVEL SECURITY;

-- Lettura: GM della campagna, o sender/receiver del messaggio
CREATE POLICY "secret_whispers_select"
  ON secret_whispers FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
    OR EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = secret_whispers.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- Inserimento: mittente = utente corrente; deve essere GM della campagna oppure sta scrivendo al GM
CREATE POLICY "secret_whispers_insert"
  ON secret_whispers FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_id
      AND (c.gm_id = auth.uid() OR c.gm_id = receiver_id)
    )
  );

-- Realtime: abilita per INSERT (nuovi messaggi)
ALTER PUBLICATION supabase_realtime ADD TABLE secret_whispers;

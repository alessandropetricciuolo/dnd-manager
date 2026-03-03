-- Copertina campagna (URL immagine in Storage bucket campaign_covers)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Bucket per le copertine campagne (crea in Dashboard → Storage se preferisci)
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign_covers', 'campaign_covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload campaign covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'campaign_covers');

CREATE POLICY "Public read campaign covers"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'campaign_covers');

-- Bucket per le mappe delle campagne (Storage)
-- Esegui questo script in Supabase: Dashboard → SQL Editor → New query → Incolla → Run
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign_maps', 'campaign_maps', true)
ON CONFLICT (id) DO NOTHING;

-- Chi può caricare: utenti autenticati (il GM carica dalla sua campagna, la validazione è in app)
CREATE POLICY "Authenticated users can upload campaign maps"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'campaign_maps');

-- Chi può leggere: tutti (bucket pubblico)
CREATE POLICY "Public read for campaign_maps"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'campaign_maps');

-- Opzionale: utenti autenticati possono aggiornare/cancellare i propri upload (per ora lasciamo solo insert)
-- Se vuoi che solo il GM cancelli, si può fare con RLS su storage.objects e metadata campagna.

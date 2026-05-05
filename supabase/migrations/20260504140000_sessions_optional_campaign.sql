-- Eventi calendario senza campagna: sessioni con campaign_id NULL (da collegare dopo).
-- I giocatori autenticati possono vedere le sessioni "aperte" programmate e iscriversi come per le altre.

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_campaign_id_fkey;

ALTER TABLE public.sessions ALTER COLUMN campaign_id DROP NOT NULL;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE POLICY "Authenticated users can view open calendar sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    campaign_id IS NULL
    AND status = 'scheduled'
  );

-- Per il calendario: conteggio iscritti sugli eventi aperti (senza esporre altre campagne).
CREATE POLICY "Authenticated users can view signups for open sessions"
  ON public.session_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_signups.session_id
        AND s.campaign_id IS NULL
        AND s.status = 'scheduled'
    )
  );

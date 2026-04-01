-- GM/Admin: aprire/chiudere iscrizioni autonome (campagna Long pubblica) senza rendere privata la campagna.

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS long_registrations_open boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.campaigns.long_registrations_open IS
  'Se true, i player possono iscriversi da soli (insieme a type=long e is_public). Il GM/Admin può chiudere le iscrizioni.';

DROP POLICY IF EXISTS "Players can self-join public long campaigns" ON public.campaign_members;

CREATE POLICY "Players can self-join public long campaigns"
  ON public.campaign_members
  FOR INSERT
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = campaign_members.campaign_id
        AND c.type = 'long'
        AND c.is_public = true
        AND c.long_registrations_open = true
    )
  );

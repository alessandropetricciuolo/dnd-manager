-- Consente ai player autenticati di iscriversi da soli alle campagne Long pubbliche.
-- Necessario per joinLongCampaign() quando usa client user (RLS attivo).

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
    )
  );


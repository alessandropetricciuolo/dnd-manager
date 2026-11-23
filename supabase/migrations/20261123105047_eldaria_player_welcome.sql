CREATE TABLE public.campaign_guide_reads (
  campaign_id uuid NOT NULL,
  player_id uuid NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, player_id),
  FOREIGN KEY (campaign_id, player_id)
    REFERENCES public.campaign_members (campaign_id, player_id) ON DELETE CASCADE
);

ALTER TABLE public.campaign_guide_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaign_guide_reads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.campaign_guide_reads TO authenticated;
GRANT INSERT (campaign_id, player_id) ON public.campaign_guide_reads TO authenticated;

CREATE POLICY "Players read their own guide confirmation"
  ON public.campaign_guide_reads FOR SELECT TO authenticated
  USING (player_id = (SELECT auth.uid()));

CREATE POLICY "Players confirm their own campaign guide"
  ON public.campaign_guide_reads FOR INSERT TO authenticated
  WITH CHECK (
    player_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.campaign_members member
      WHERE member.campaign_id = campaign_guide_reads.campaign_id
        AND member.player_id = campaign_guide_reads.player_id
    )
  );

CREATE POLICY "Eldaria membership requires GM approval"
  ON public.campaign_members AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    campaign_id <> 'd9962add-4d55-42ef-bfd7-96eddfe49969'
    OR EXISTS (
      SELECT 1 FROM public.campaigns campaign
      WHERE campaign.id = campaign_members.campaign_id
        AND campaign.gm_id = (SELECT auth.uid())
        AND campaign_members.player_id <> (SELECT auth.uid())
    )
  );

-- Update only the original inauguration letter. Preserve any replacement already written by the GM.
UPDATE public.campaign_email_settings
SET join_subject = 'Una missiva da Barber & Dragons',
    join_body_html = '<p>La Barber &amp; Dragons ti dà il benvenuto a Eldaria.</p><p>Prima di metterti in viaggio, c’è una cosa che ci interessa sapere: che storia porti con te? Raccontacela al tavolo.</p><p><strong>Barber &amp; Dragons</strong></p>',
    updated_at = now()
WHERE campaign_id = 'd9962add-4d55-42ef-bfd7-96eddfe49969'
  AND join_body_html ILIKE '%inaugurazione ufficiale%';

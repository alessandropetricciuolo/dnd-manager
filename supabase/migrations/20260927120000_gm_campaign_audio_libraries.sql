CREATE TABLE public.gm_campaign_audio_libraries (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  library jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.gm_campaign_audio_libraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY gm_campaign_audio_libraries_gm_read ON public.gm_campaign_audio_libraries
  FOR SELECT TO authenticated USING (
    public.can_manage_campaign_as_gm(campaign_id)
  );

CREATE POLICY gm_campaign_audio_libraries_gm_insert ON public.gm_campaign_audio_libraries
  FOR INSERT TO authenticated WITH CHECK (
    public.can_manage_campaign_as_gm(campaign_id)
  );

CREATE POLICY gm_campaign_audio_libraries_gm_update ON public.gm_campaign_audio_libraries
  FOR UPDATE TO authenticated USING (
    public.can_manage_campaign_as_gm(campaign_id)
  ) WITH CHECK (
    public.can_manage_campaign_as_gm(campaign_id)
  );

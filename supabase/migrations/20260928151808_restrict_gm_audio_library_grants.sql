REVOKE ALL PRIVILEGES ON TABLE public.gm_campaign_audio_libraries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.gm_campaign_audio_libraries TO authenticated;

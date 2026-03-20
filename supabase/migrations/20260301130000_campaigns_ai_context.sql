-- Contesto AI strutturato per campagna (Agente Architetto): tono, magia, meccaniche, paletti visivi.
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS ai_context JSONB DEFAULT NULL;

COMMENT ON COLUMN campaigns.ai_context IS 'JSON da AI: narrative_tone, magic_level, mechanics_focus, visual_positive, visual_negative (Europe/Rome app; uso future feature immagini/testo).';

-- Add isolated Tamagotchi state and optional low-poly avatar URL for Long campaign characters.
-- Kept separate from rules_snapshot / hit_points so D&D 5e sheet state is never affected.

ALTER TABLE public.campaign_characters
  ADD COLUMN IF NOT EXISTS tamagotchi_state jsonb,
  ADD COLUMN IF NOT EXISTS lowpoly_avatar_url text;

COMMENT ON COLUMN public.campaign_characters.tamagotchi_state IS
  'Stato Tamagotchi mobile (solo campagne Long, indipendente dalle regole D&D 5e).';
COMMENT ON COLUMN public.campaign_characters.lowpoly_avatar_url IS
  'URL avatar low-poly opzionale derivato dal ritratto del personaggio per il Tamagotchi mobile.';

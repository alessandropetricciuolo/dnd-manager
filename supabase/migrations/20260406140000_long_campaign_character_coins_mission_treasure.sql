-- Campagne lunghe: monete sui PG + tesoretto missione (distribuibile al gruppo che completa)

ALTER TABLE public.campaign_characters
  ADD COLUMN IF NOT EXISTS coins_gp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_sp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_cp integer NOT NULL DEFAULT 0;

ALTER TABLE public.campaign_characters
  DROP CONSTRAINT IF EXISTS campaign_characters_coins_gp_check,
  DROP CONSTRAINT IF EXISTS campaign_characters_coins_sp_check,
  DROP CONSTRAINT IF EXISTS campaign_characters_coins_cp_check;

ALTER TABLE public.campaign_characters
  ADD CONSTRAINT campaign_characters_coins_gp_check CHECK (coins_gp >= 0),
  ADD CONSTRAINT campaign_characters_coins_sp_check CHECK (coins_sp >= 0),
  ADD CONSTRAINT campaign_characters_coins_cp_check CHECK (coins_cp >= 0);

COMMENT ON COLUMN public.campaign_characters.coins_gp IS 'Monete d''oro in possesso del PG.';
COMMENT ON COLUMN public.campaign_characters.coins_sp IS 'Monete d''argento in possesso del PG.';
COMMENT ON COLUMN public.campaign_characters.coins_cp IS 'Monete di rame in possesso del PG.';

ALTER TABLE public.campaign_missions
  ADD COLUMN IF NOT EXISTS treasure_gp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS treasure_sp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS treasure_cp integer NOT NULL DEFAULT 0;

ALTER TABLE public.campaign_missions
  DROP CONSTRAINT IF EXISTS campaign_missions_treasure_gp_check,
  DROP CONSTRAINT IF EXISTS campaign_missions_treasure_sp_check,
  DROP CONSTRAINT IF EXISTS campaign_missions_treasure_cp_check;

ALTER TABLE public.campaign_missions
  ADD CONSTRAINT campaign_missions_treasure_gp_check CHECK (treasure_gp >= 0),
  ADD CONSTRAINT campaign_missions_treasure_sp_check CHECK (treasure_sp >= 0),
  ADD CONSTRAINT campaign_missions_treasure_cp_check CHECK (treasure_cp >= 0);

COMMENT ON COLUMN public.campaign_missions.treasure_gp IS 'Tesoretto di gruppo (oro) dalla missione completata; il GM lo distribuisce ai PG.';
COMMENT ON COLUMN public.campaign_missions.treasure_sp IS 'Tesoretto di gruppo (argento).';
COMMENT ON COLUMN public.campaign_missions.treasure_cp IS 'Tesoretto di gruppo (rame).';

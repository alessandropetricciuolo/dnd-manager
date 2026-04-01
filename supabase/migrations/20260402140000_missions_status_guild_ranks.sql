-- Missioni: stato, punti premio, completamento; gilde: rango lettera D–S al posto di grade numerico

-- Gilde: da grade (intero) a rank (D,C,B,A,S) + auto_rank (ricalcolo rango dai punti)
ALTER TABLE public.campaign_guilds
  ADD COLUMN IF NOT EXISTS rank text,
  ADD COLUMN IF NOT EXISTS auto_rank boolean NOT NULL DEFAULT true;

UPDATE public.campaign_guilds
SET rank = CASE
  WHEN grade >= 4 THEN 'S'
  WHEN grade = 3 THEN 'A'
  WHEN grade = 2 THEN 'B'
  WHEN grade = 1 THEN 'C'
  ELSE 'D'
END
WHERE rank IS NULL;

UPDATE public.campaign_guilds SET rank = 'D' WHERE rank IS NULL OR trim(rank) = '';

ALTER TABLE public.campaign_guilds
  ALTER COLUMN rank SET NOT NULL,
  DROP CONSTRAINT IF EXISTS campaign_guilds_grade_check;

ALTER TABLE public.campaign_guilds DROP COLUMN IF EXISTS grade;

ALTER TABLE public.campaign_guilds
  ADD CONSTRAINT campaign_guilds_rank_check CHECK (rank IN ('D', 'C', 'B', 'A', 'S'));

DROP INDEX IF EXISTS campaign_guilds_campaign_id_idx;

COMMENT ON COLUMN public.campaign_guilds.rank IS 'Rango gilda: D (basso) … S (alto). Modificabile a mano; se auto_rank è true viene aggiornato dai punti al completamento missioni.';
COMMENT ON COLUMN public.campaign_guilds.auto_rank IS 'Se true, al completamento missione il rango viene ricalcolato dai punti (soglie in app). Se false, solo il punteggio cambia.';

CREATE INDEX campaign_guilds_campaign_id_idx ON public.campaign_guilds (campaign_id);

-- Missioni: tracciamento
ALTER TABLE public.campaign_missions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS points_reward integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by_guild_id uuid REFERENCES public.campaign_guilds (id) ON DELETE SET NULL;

UPDATE public.campaign_missions SET status = 'open' WHERE status IS NULL OR trim(status) = '';

ALTER TABLE public.campaign_missions
  ADD CONSTRAINT campaign_missions_status_check CHECK (status IN ('open', 'completed')),
  ADD CONSTRAINT campaign_missions_points_reward_check CHECK (points_reward >= 0);

COMMENT ON COLUMN public.campaign_missions.status IS 'open | completed';
COMMENT ON COLUMN public.campaign_missions.points_reward IS 'Punti gilda assegnati alla gilda che completa la missione.';
COMMENT ON COLUMN public.campaign_missions.completed_by_guild_id IS 'Gilda che ha completato la missione (impostata dal GM).';

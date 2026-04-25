-- Missioni long: incontri preparati solo GM, con liste mostri richiamabili dal GM screen.

CREATE TABLE IF NOT EXISTS public.mission_encounters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.campaign_missions(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mission_encounters_campaign_id_idx
  ON public.mission_encounters (campaign_id);

CREATE INDEX IF NOT EXISTS mission_encounters_mission_id_idx
  ON public.mission_encounters (mission_id);

CREATE UNIQUE INDEX IF NOT EXISTS mission_encounters_mission_id_sort_order_idx
  ON public.mission_encounters (mission_id, sort_order, id);

CREATE TABLE IF NOT EXISTS public.mission_encounter_monsters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id uuid NOT NULL REFERENCES public.mission_encounters(id) ON DELETE CASCADE,
  wiki_entity_id uuid NOT NULL REFERENCES public.wiki_entities(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mission_encounter_monsters_encounter_id_idx
  ON public.mission_encounter_monsters (encounter_id);

CREATE INDEX IF NOT EXISTS mission_encounter_monsters_wiki_entity_id_idx
  ON public.mission_encounter_monsters (wiki_entity_id);

ALTER TABLE public.mission_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_encounter_monsters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mission encounters visible to GM and admin"
  ON public.mission_encounters FOR SELECT
  USING (public.is_gm_or_admin());

CREATE POLICY "GM and Admin can manage mission encounters"
  ON public.mission_encounters FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

CREATE POLICY "Mission encounter monsters visible to GM and admin"
  ON public.mission_encounter_monsters FOR SELECT
  USING (
    public.is_gm_or_admin()
    AND EXISTS (
      SELECT 1
      FROM public.mission_encounters me
      WHERE me.id = mission_encounter_monsters.encounter_id
    )
  );

CREATE POLICY "GM and Admin can manage mission encounter monsters"
  ON public.mission_encounter_monsters FOR ALL
  USING (
    public.is_gm_or_admin()
    AND EXISTS (
      SELECT 1
      FROM public.mission_encounters me
      WHERE me.id = mission_encounter_monsters.encounter_id
    )
  )
  WITH CHECK (
    public.is_gm_or_admin()
    AND EXISTS (
      SELECT 1
      FROM public.mission_encounters me
      WHERE me.id = mission_encounter_monsters.encounter_id
    )
  );

COMMENT ON TABLE public.mission_encounters IS
  'Incontri preparati dal GM per le missioni long; non visibili ai membri campagna.';

COMMENT ON TABLE public.mission_encounter_monsters IS
  'Mostri collegati a un incontro preparato di missione, con quantita e ordinamento.';

COMMENT ON COLUMN public.mission_encounters.notes IS
  'Note operative solo GM per l''incontro.';

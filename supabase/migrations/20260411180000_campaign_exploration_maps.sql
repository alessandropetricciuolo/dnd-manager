-- Vista dall'alto: mappe 2D con fog of war (poligoni), solo GM/Admin in app.
-- Se ALTER PUBLICATION fallisce: Supabase Dashboard → Database → Publications / Realtime → aggiungi le tabelle.

CREATE TABLE public.campaign_exploration_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  floor_label TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_path TEXT NOT NULL,
  grid_cell_meters NUMERIC(10, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX campaign_exploration_maps_campaign_sort_idx
  ON public.campaign_exploration_maps (campaign_id, sort_order);

COMMENT ON TABLE public.campaign_exploration_maps IS
  'Mappe vista dall''alto (Dungeon Alchemist, ecc.) per FoW; distinte da public.maps.';

CREATE TABLE public.campaign_exploration_fow_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.campaign_exploration_maps(id) ON DELETE CASCADE,
  polygon JSONB NOT NULL,
  is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_exploration_fow_regions_polygon_is_array
    CHECK (jsonb_typeof(polygon) = 'array')
);

CREATE INDEX campaign_exploration_fow_regions_map_idx
  ON public.campaign_exploration_fow_regions (map_id);

COMMENT ON COLUMN public.campaign_exploration_fow_regions.polygon IS
  'Array di {x,y} normalizzati 0–1 rispetto all''immagine.';

ALTER TABLE public.campaign_exploration_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_exploration_fow_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exploration_maps_select_gm_admin"
  ON public.campaign_exploration_maps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_exploration_maps.campaign_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE POLICY "exploration_maps_mutate_gm_admin"
  ON public.campaign_exploration_maps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_exploration_maps.campaign_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_exploration_maps.campaign_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE POLICY "exploration_fow_regions_select_gm_admin"
  ON public.campaign_exploration_fow_regions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_exploration_maps m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = campaign_exploration_fow_regions.map_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE POLICY "exploration_fow_regions_mutate_gm_admin"
  ON public.campaign_exploration_fow_regions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_exploration_maps m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = campaign_exploration_fow_regions.map_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_exploration_maps m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = campaign_exploration_fow_regions.map_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_exploration_fow_regions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_exploration_maps;

INSERT INTO storage.buckets (id, name, public)
VALUES ('exploration_maps', 'exploration_maps', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "exploration_maps_storage_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'exploration_maps');

CREATE POLICY "exploration_maps_storage_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'exploration_maps');

CREATE POLICY "exploration_maps_storage_update_authenticated"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'exploration_maps')
  WITH CHECK (bucket_id = 'exploration_maps');

CREATE POLICY "exploration_maps_storage_delete_authenticated"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'exploration_maps');

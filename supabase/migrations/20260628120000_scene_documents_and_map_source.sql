-- Scene Editor (Fase 1): documento strutturato multi-piano + collegamento mappe generate.

CREATE TABLE public.campaign_scene_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  linked_mission_id UUID REFERENCES public.campaign_missions(id) ON DELETE SET NULL,
  document JSONB NOT NULL,
  document_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_scene_documents_document_is_object
    CHECK (jsonb_typeof(document) = 'object')
);

CREATE INDEX campaign_scene_documents_campaign_idx
  ON public.campaign_scene_documents (campaign_id);

COMMENT ON TABLE public.campaign_scene_documents IS
  'Documento Scene Editor (stanze, corridoi, muri). Una scena può avere più piani (mappe exploration).';

ALTER TABLE public.campaign_exploration_maps
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'uploaded_image',
  ADD COLUMN IF NOT EXISTS scene_document_id UUID REFERENCES public.campaign_scene_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scene_floor_id TEXT;

ALTER TABLE public.campaign_exploration_maps
  DROP CONSTRAINT IF EXISTS campaign_exploration_maps_source_type_check;

ALTER TABLE public.campaign_exploration_maps
  ADD CONSTRAINT campaign_exploration_maps_source_type_check
    CHECK (source_type IN ('uploaded_image', 'generated_scene'));

CREATE INDEX IF NOT EXISTS campaign_exploration_maps_scene_document_idx
  ON public.campaign_exploration_maps (scene_document_id)
  WHERE scene_document_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_exploration_maps_scene_floor_unique_idx
  ON public.campaign_exploration_maps (scene_document_id, scene_floor_id)
  WHERE scene_document_id IS NOT NULL AND scene_floor_id IS NOT NULL;

ALTER TABLE public.campaign_exploration_fow_regions
  ADD COLUMN IF NOT EXISTS source_area_id TEXT;

CREATE INDEX IF NOT EXISTS campaign_exploration_fow_regions_source_area_idx
  ON public.campaign_exploration_fow_regions (map_id, source_area_id)
  WHERE source_area_id IS NOT NULL;

COMMENT ON COLUMN public.campaign_exploration_maps.source_type IS
  'uploaded_image = mappa esterna; generated_scene = creata in Scene Editor.';
COMMENT ON COLUMN public.campaign_exploration_maps.scene_floor_id IS
  'Id piano nel documento JSON (floors[].id).';
COMMENT ON COLUMN public.campaign_exploration_fow_regions.source_area_id IS
  'Id area (stanza/corridoio) nel documento scena; null = FoW manuale.';

ALTER TABLE public.campaign_scene_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scene_documents_select_gm_admin"
  ON public.campaign_scene_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "scene_documents_mutate_gm_admin"
  ON public.campaign_scene_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gm', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gm', 'admin')
    )
  );

-- Realtime (opzionale; ignora errore se publication già configurata altrove)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_scene_documents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

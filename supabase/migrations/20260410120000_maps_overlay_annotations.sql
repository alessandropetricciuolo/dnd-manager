-- Overlay testo/simboli sulle mappe (coordinate normalizzate 0–1). Bozza + storico pubblicazioni.

ALTER TABLE public.maps
  ADD COLUMN IF NOT EXISTS overlay_items jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.maps
  ADD COLUMN IF NOT EXISTS overlay_draft jsonb;

COMMENT ON COLUMN public.maps.overlay_items IS
  'Annotazioni pubblicate (JSON array). Visibili a chi può vedere la mappa. Coordinate x,y in [0,1] sul rettangolo immagine (object-contain).';

COMMENT ON COLUMN public.maps.overlay_draft IS
  'Bozza GM (stesso schema di overlay_items). NULL = nessuna bozza salvata.';

CREATE TABLE IF NOT EXISTS public.map_overlay_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  overlay_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_overlay_snapshots_map_id_created_at_idx
  ON public.map_overlay_snapshots (map_id, created_at DESC);

COMMENT ON TABLE public.map_overlay_snapshots IS
  'Storico stati pubblicati (e snapshot precedente al publish) per ripristino bozza.';

ALTER TABLE public.map_overlay_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "map_overlay_snapshots_select_gm_or_admin"
  ON public.map_overlay_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.maps m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = map_overlay_snapshots.map_id
      AND (c.gm_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
    )
  );

CREATE POLICY "map_overlay_snapshots_insert_gm_or_admin"
  ON public.map_overlay_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.maps m
      JOIN public.campaigns c ON c.id = m.campaign_id
      WHERE m.id = map_overlay_snapshots.map_id
      AND (c.gm_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
    )
  );

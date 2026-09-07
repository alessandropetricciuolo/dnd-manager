-- R6.4: persistent tactical scene/publication boundary.
-- Wiki maps and every legacy scene/exploration table remain untouched.

CREATE TABLE public.tactical_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lifecycle TEXT NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft', 'ready', 'live', 'archived')),
  current_revision_no INTEGER NOT NULL DEFAULT 1 CHECK (current_revision_no > 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tactical_scenes_campaign_idx ON public.tactical_scenes(campaign_id);

CREATE TABLE public.tactical_scene_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES public.tactical_scenes(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  parent_revision_id UUID REFERENCES public.tactical_scene_revisions(id) ON DELETE RESTRICT,
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scene_id, revision_no)
);
CREATE INDEX tactical_scene_revisions_scene_idx ON public.tactical_scene_revisions(scene_id, revision_no DESC);

CREATE TABLE public.tactical_scene_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES public.tactical_scenes(id) ON DELETE CASCADE,
  revision_id UUID NOT NULL REFERENCES public.tactical_scene_revisions(id) ON DELETE RESTRICT,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  published_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX tactical_scene_one_active_publication_idx ON public.tactical_scene_publications(scene_id) WHERE revoked_at IS NULL;

CREATE TABLE public.tactical_scene_fow_runtime (
  scene_id UUID PRIMARY KEY REFERENCES public.tactical_scenes(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.tactical_scene_publications(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL CHECK (revision_no > 0),
  document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tactical_scenes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tactical_scene_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tactical_scene_publications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tactical_scene_fow_runtime TO authenticated;

ALTER TABLE public.tactical_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_scene_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_scene_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tactical_scene_fow_runtime ENABLE ROW LEVEL SECURITY;

CREATE POLICY tactical_scenes_gm_admin ON public.tactical_scenes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')));
CREATE POLICY tactical_scene_revisions_gm_admin ON public.tactical_scene_revisions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')));
CREATE POLICY tactical_scene_publications_gm_admin ON public.tactical_scene_publications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')));
CREATE POLICY tactical_scene_fow_runtime_gm_admin ON public.tactical_scene_fow_runtime FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('gm', 'admin')));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tactical_scene_publications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

-- All state transitions below are transactional and run as the caller. The
-- profile lookup is deliberately repeated inside the function: server action
-- checks are defense in depth, not a substitute for RLS/database checks.
CREATE OR REPLACE FUNCTION public.save_tactical_scene_revision(
  p_scene_id UUID, p_expected_revision_no INTEGER, p_document JSONB
) RETURNS TABLE(revision_id UUID, revision_no INTEGER, document JSONB)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE current_scene public.tactical_scenes%ROWTYPE; next_id UUID; next_no INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gm', 'admin')) THEN RAISE EXCEPTION 'tactical_scene_forbidden'; END IF;
  SELECT * INTO current_scene FROM public.tactical_scenes WHERE id = p_scene_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tactical_scene_not_found'; END IF;
  IF current_scene.current_revision_no <> p_expected_revision_no THEN RAISE EXCEPTION 'tactical_scene_revision_conflict:%', current_scene.current_revision_no; END IF;
  IF jsonb_typeof(p_document) <> 'object' THEN RAISE EXCEPTION 'tactical_scene_invalid_document'; END IF;
  next_no := p_expected_revision_no + 1; next_id := gen_random_uuid();
  p_document := jsonb_set(jsonb_set(jsonb_set(p_document, '{revisionNo}', to_jsonb(next_no)), '{revisionId}', to_jsonb(next_id::text)), '{parentRevisionId}', to_jsonb((SELECT id FROM public.tactical_scene_revisions WHERE scene_id = p_scene_id AND revision_no = p_expected_revision_no)));
  INSERT INTO public.tactical_scene_revisions(id, scene_id, revision_no, parent_revision_id, document, created_by) VALUES (next_id, p_scene_id, next_no, (SELECT id FROM public.tactical_scene_revisions WHERE scene_id = p_scene_id AND revision_no = p_expected_revision_no), p_document, auth.uid());
  UPDATE public.tactical_scenes SET current_revision_no = next_no, name = COALESCE(NULLIF(p_document->>'name',''), name), lifecycle = COALESCE(NULLIF(p_document->>'lifecycle',''), lifecycle), updated_at = now() WHERE id = p_scene_id;
  RETURN QUERY SELECT next_id, next_no, p_document;
END $$;

CREATE OR REPLACE FUNCTION public.create_tactical_scene_with_revision(
  p_campaign_id UUID, p_document JSONB
) RETURNS TABLE(scene_id UUID, revision_id UUID, revision_no INTEGER, document JSONB)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE new_scene UUID; new_revision UUID; next_no INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gm', 'admin')) THEN RAISE EXCEPTION 'tactical_scene_forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE id = p_campaign_id) THEN RAISE EXCEPTION 'tactical_campaign_not_found'; END IF;
  IF jsonb_typeof(p_document) <> 'object' OR p_document->>'campaignId' IS DISTINCT FROM p_campaign_id::text THEN RAISE EXCEPTION 'tactical_scene_campaign_mismatch'; END IF;
  next_no := COALESCE(NULLIF((p_document->>'revisionNo'), '')::INTEGER, 1); new_scene := gen_random_uuid(); new_revision := gen_random_uuid();
  p_document := jsonb_set(jsonb_set(p_document, '{revisionNo}', to_jsonb(next_no)), '{revisionId}', to_jsonb(new_revision::text));
  INSERT INTO public.tactical_scenes(id, campaign_id, name, lifecycle, current_revision_no, created_by) VALUES (new_scene, p_campaign_id, COALESCE(NULLIF(p_document->>'name',''), 'Scena tattica'), COALESCE(NULLIF(p_document->>'lifecycle',''), 'draft'), next_no, auth.uid());
  INSERT INTO public.tactical_scene_revisions(id, scene_id, revision_no, document, created_by) VALUES (new_revision, new_scene, next_no, p_document, auth.uid());
  RETURN QUERY SELECT new_scene, new_revision, next_no, p_document;
END $$;

CREATE OR REPLACE FUNCTION public.publish_tactical_scene(
  p_scene_id UUID, p_revision_id UUID, p_revision_no INTEGER
) RETURNS TABLE(publication_id UUID, document JSONB)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE revision public.tactical_scene_revisions%ROWTYPE; publication UUID; published JSONB; fow JSONB; patch JSONB; patch_region TEXT; patch_revealed BOOLEAN; region_rows JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gm', 'admin')) THEN RAISE EXCEPTION 'tactical_scene_forbidden'; END IF;
  PERFORM 1 FROM public.tactical_scenes WHERE id = p_scene_id AND current_revision_no = p_revision_no FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tactical_scene_revision_conflict'; END IF;
  SELECT * INTO revision FROM public.tactical_scene_revisions WHERE id = p_revision_id AND scene_id = p_scene_id AND revision_no = p_revision_no;
  IF NOT FOUND THEN RAISE EXCEPTION 'tactical_scene_revision_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(revision.document->'floors', '[]'::jsonb)) floor WHERE (floor->'asset'->>'storageKey') LIKE 'local://%' OR floor->'asset'->>'mimeType' = 'image/svg+xml') THEN RAISE EXCEPTION 'tactical_scene_placeholder_map'; END IF;
  fow := COALESCE(revision.document->'fow', '{}'::jsonb);
  -- Region-wide patches are materialized in stable id order. The publication
  -- and runtime therefore never depend on a later client-side interpretation.
  FOR patch IN SELECT value FROM jsonb_array_elements(COALESCE(fow->'patches', '[]'::jsonb)) ORDER BY value->>'id' LOOP
    patch_region := patch->>'regionId'; patch_revealed := (patch->>'operation') = 'reveal';
    SELECT COALESCE(jsonb_agg(CASE WHEN value->>'id' = patch_region THEN jsonb_set(value, '{revealed}', to_jsonb(patch_revealed)) ELSE value END ORDER BY ord), '[]'::jsonb) INTO region_rows FROM jsonb_array_elements(COALESCE(fow->'regions', '[]'::jsonb)) WITH ORDINALITY AS rows(value, ord);
    fow := jsonb_set(fow, '{regions}', region_rows);
  END LOOP;
  fow := jsonb_set(fow, '{patches}', '[]'::jsonb);
  published := jsonb_set(jsonb_set(jsonb_set(revision.document, '{lifecycle}', to_jsonb('live'::text)), '{fow}', fow), '{overlay,published}', COALESCE(revision.document#>'{overlay,draft}', '[]'::jsonb));
  UPDATE public.tactical_scene_publications SET revoked_at = now() WHERE scene_id = p_scene_id AND revoked_at IS NULL;
  INSERT INTO public.tactical_scene_publications(scene_id, revision_id, revision_no, document, published_by) VALUES (p_scene_id, revision.id, revision.revision_no, published, auth.uid()) RETURNING id INTO publication;
  INSERT INTO public.tactical_scene_fow_runtime(scene_id, publication_id, revision_no, document, updated_by) VALUES (p_scene_id, publication, revision.revision_no, fow, auth.uid()) ON CONFLICT (scene_id) DO UPDATE SET publication_id = EXCLUDED.publication_id, revision_no = EXCLUDED.revision_no, document = EXCLUDED.document, updated_by = EXCLUDED.updated_by, updated_at = now();
  UPDATE public.tactical_scenes SET lifecycle = 'live', updated_at = now() WHERE id = p_scene_id;
  RETURN QUERY SELECT publication, published;
END $$;

CREATE OR REPLACE FUNCTION public.rollback_tactical_scene_publication(p_scene_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gm', 'admin')) THEN RAISE EXCEPTION 'tactical_scene_forbidden'; END IF;
  PERFORM 1 FROM public.tactical_scenes WHERE id = p_scene_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tactical_scene_not_found'; END IF;
  UPDATE public.tactical_scene_publications SET revoked_at = now() WHERE scene_id = p_scene_id AND revoked_at IS NULL;
  UPDATE public.tactical_scenes SET lifecycle = 'ready', updated_at = now() WHERE id = p_scene_id;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.update_tactical_scene_fow_runtime(
  p_scene_id UUID, p_publication_id UUID, p_revision_no INTEGER, p_document JSONB
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gm', 'admin')) THEN RAISE EXCEPTION 'tactical_scene_forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tactical_scene_publications WHERE id = p_publication_id AND scene_id = p_scene_id AND revision_no = p_revision_no AND revoked_at IS NULL) THEN RAISE EXCEPTION 'tactical_scene_publication_not_found'; END IF;
  IF jsonb_typeof(p_document) <> 'object' THEN RAISE EXCEPTION 'tactical_scene_invalid_runtime'; END IF;
  INSERT INTO public.tactical_scene_fow_runtime(scene_id, publication_id, revision_no, document, updated_by) VALUES (p_scene_id, p_publication_id, p_revision_no, p_document, auth.uid()) ON CONFLICT (scene_id) DO UPDATE SET publication_id = EXCLUDED.publication_id, revision_no = EXCLUDED.revision_no, document = EXCLUDED.document, updated_by = EXCLUDED.updated_by, updated_at = now();
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.save_tactical_scene_revision(UUID, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tactical_scene_with_revision(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_tactical_scene(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_tactical_scene_publication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tactical_scene_fow_runtime(UUID, UUID, INTEGER, JSONB) TO authenticated;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tactical_scene_fow_runtime;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

-- Catalogo definizioni ufficiali (parallelo a manuals_knowledge / RAG).
-- Non altera chunk esistenti: sola lookup tipizzata (condizioni PHB v1).

CREATE TABLE IF NOT EXISTS public.rules_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (
    kind IN ('condition', 'spell', 'feature', 'rule', 'trait', 'item')
  ),
  slug text NOT NULL,
  name text NOT NULL,
  name_aliases text[] NOT NULL DEFAULT '{}'::text[],
  source_book text NOT NULL,
  source_file text NOT NULL,
  source_label text,
  parent_section text,
  heading_level smallint,
  heading_raw text,
  body_md text NOT NULL,
  body_hash text NOT NULL,
  facets jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_version text NOT NULL DEFAULT 'rules-catalog-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rules_catalog_kind_book_slug_uq UNIQUE (kind, source_book, slug)
);

COMMENT ON TABLE public.rules_catalog IS
  'Definizioni ufficiali tipizzate (condizioni, spell, …) estratte dai manuali; parallelo a manuals_knowledge.';
COMMENT ON COLUMN public.rules_catalog.facets IS
  'Campi strutturati (es. effects[] per condizioni; campi spell futuri).';
COMMENT ON COLUMN public.rules_catalog.body_hash IS
  'Hash del body_md per skip upsert se invariato.';

CREATE INDEX IF NOT EXISTS rules_catalog_kind_name_lower_idx
  ON public.rules_catalog (kind, lower(name));

CREATE INDEX IF NOT EXISTS rules_catalog_name_aliases_gin_idx
  ON public.rules_catalog USING gin (name_aliases);

CREATE INDEX IF NOT EXISTS rules_catalog_kind_slug_idx
  ON public.rules_catalog (kind, slug);

DROP TRIGGER IF EXISTS rules_catalog_updated_at ON public.rules_catalog;
CREATE TRIGGER rules_catalog_updated_at
  BEFORE UPDATE ON public.rules_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.rules_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GM and admin can read rules_catalog"
  ON public.rules_catalog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "Admins can manage rules_catalog"
  ON public.rules_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

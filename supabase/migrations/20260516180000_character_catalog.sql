-- Catalogo globale PG riutilizzabili (Barber & Dragons) + path storage `catalog/...` nel bucket character_sheets.

CREATE TABLE IF NOT EXISTS public.character_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  library_key TEXT NOT NULL DEFAULT 'barber_and_dragons',
  name TEXT NOT NULL,
  character_class TEXT,
  class_subclass TEXT,
  armor_class INTEGER,
  hit_points INTEGER,
  background TEXT,
  race_slug TEXT,
  subclass_slug TEXT,
  background_slug TEXT,
  image_url TEXT,
  sheet_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT character_catalog_slug_library_unique UNIQUE (slug, library_key),
  CONSTRAINT character_catalog_armor_class_nonneg CHECK (armor_class IS NULL OR armor_class >= 0),
  CONSTRAINT character_catalog_hit_points_nonneg CHECK (hit_points IS NULL OR hit_points >= 0)
);

COMMENT ON TABLE public.character_catalog IS
  'Template PG globali per import in campagna (libreria Barber & Dragons). Immagine URL e PDF in storage paths.';
COMMENT ON COLUMN public.character_catalog.slug IS 'Chiave stabile per JSON/script (univoca per library_key).';
COMMENT ON COLUMN public.character_catalog.library_key IS 'Scope libreria; default barber_and_dragons.';
COMMENT ON COLUMN public.character_catalog.sheet_file_path IS
  'Path nel bucket character_sheets (es. catalog/mio-pg/scheda.pdf), senza prefisso bucket.';

CREATE INDEX IF NOT EXISTS idx_character_catalog_library ON public.character_catalog (library_key);

DROP TRIGGER IF EXISTS character_catalog_updated_at ON public.character_catalog;
CREATE TRIGGER character_catalog_updated_at
  BEFORE UPDATE ON public.character_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.character_catalog ENABLE ROW LEVEL SECURITY;

-- Lettura: Master e Admin (import / anteprima in campagna)
CREATE POLICY "GM and admin can read character_catalog"
  ON public.character_catalog FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gm', 'admin')
    )
  );

-- Scrittura: solo Admin (popolamento catalogo da UI futura o script service role)
CREATE POLICY "Admins can manage character_catalog"
  ON public.character_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ========== Storage: character_sheets / catalog/* ==========
-- GM/Admin possono leggere i PDF del catalogo (copia verso cartella campagna in import server-side usa service role).

CREATE POLICY "GM and admin can read character_sheets catalog prefix"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND (storage.foldername(name))[1] = 'catalog'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "Admins can upload character_sheets catalog prefix"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'character_sheets'
    AND (storage.foldername(name))[1] = 'catalog'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update character_sheets catalog prefix"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND (storage.foldername(name))[1] = 'catalog'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete character_sheets catalog prefix"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND (storage.foldername(name))[1] = 'catalog'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Regola: TUTTI i GM e Admin vedono e gestiscono PG (e tutto il resto campagna) a prescindere da chi ha creato la campagna.
-- Sostituiamo le policy restrittive (solo gm_id campagna o admin) con policy che usano is_gm_or_admin().

-- ========== campaign_characters ==========
-- Rimuovi la policy che limita al solo GM della campagna (e admin)
DROP POLICY IF EXISTS "GM and admin can manage campaign_characters" ON campaign_characters;
-- Rimuovi anche la policy "view" che avevamo aggiunto (verrà coperta da FOR ALL)
DROP POLICY IF EXISTS "Any GM and Admin can view all campaign_characters" ON campaign_characters;

-- Qualsiasi GM/Admin può fare tutto (SELECT, INSERT, UPDATE, DELETE) su tutti i personaggi di tutte le campagne
CREATE POLICY "Any GM and Admin can manage all campaign_characters"
  ON campaign_characters FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

-- I Player continuano a vedere solo il personaggio assegnato a sé (policy già esistente)

-- ========== storage character_sheets ==========
-- Upload: qualsiasi GM/Admin può caricare PDF in qualsiasi campagna (path campaign_id/...)
DROP POLICY IF EXISTS "GM and admin can upload character_sheets" ON storage.objects;
CREATE POLICY "GM and admin can upload character_sheets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'character_sheets'
    AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    AND public.is_gm_or_admin()
  );

-- Read: qualsiasi GM/Admin può leggere (signed URL)
DROP POLICY IF EXISTS "GM and admin can read character_sheets" ON storage.objects;
CREATE POLICY "GM and admin can read character_sheets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND public.is_gm_or_admin()
  );

-- Delete: qualsiasi GM/Admin può eliminare
DROP POLICY IF EXISTS "GM and admin can delete character_sheets" ON storage.objects;
CREATE POLICY "GM and admin can delete character_sheets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND public.is_gm_or_admin()
  );

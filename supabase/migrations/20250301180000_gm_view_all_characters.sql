-- Tutti i GM (e admin) possono vedere i PG di tutte le campagne, non solo il creatore.
-- La gestione (crea/assegna/elimina) resta solo al GM della campagna e agli admin.

-- campaign_characters: qualsiasi GM/Admin può leggere (SELECT)
CREATE POLICY "Any GM and Admin can view all campaign_characters"
  ON campaign_characters FOR SELECT
  USING (public.is_gm_or_admin());

-- character_sheets bucket: qualsiasi GM/Admin può leggere i PDF (per generare signed URL in getCampaignCharacters)
DROP POLICY IF EXISTS "GM and admin can read character_sheets" ON storage.objects;
CREATE POLICY "GM and admin can read character_sheets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'character_sheets'
    AND (
      EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.gm_id = auth.uid() AND (storage.foldername(name))[1] = c.id::text
      )
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'gm')
    )
  );

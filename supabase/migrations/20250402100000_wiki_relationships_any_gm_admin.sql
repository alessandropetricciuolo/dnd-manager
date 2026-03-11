-- Tutti i GM e Admin possono gestire le relazioni wiki (mappa concettuale), non solo il gm_id della campagna.
-- Allineato a campaign_characters e sessions (is_gm_or_admin).

DROP POLICY IF EXISTS "GM can manage wiki_relationships" ON wiki_relationships;

CREATE POLICY "Any GM and Admin can manage wiki_relationships"
  ON wiki_relationships FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

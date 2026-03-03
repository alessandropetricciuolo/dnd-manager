-- Fix RLS su wiki_entities: INSERT richiede WITH CHECK esplicito;
-- inoltre GM/Admin devono poter gestire le entità (come per sessions/signups).

DROP POLICY IF EXISTS "GM can manage wiki entities" ON wiki_entities;

CREATE POLICY "GM and Admin can manage wiki entities"
  ON wiki_entities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = wiki_entities.campaign_id AND c.gm_id = auth.uid()
    )
    OR public.is_gm_or_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = wiki_entities.campaign_id AND c.gm_id = auth.uid()
    )
    OR public.is_gm_or_admin()
  );

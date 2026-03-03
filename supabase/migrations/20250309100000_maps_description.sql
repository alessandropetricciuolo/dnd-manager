ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Modello Gilda: GM e Admin possono eliminare/gestire qualsiasi mappa.
CREATE POLICY "GM and Admin can manage maps"
  ON maps FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

-- Modello Guild: GM e Admin devono poter creare/modificare/eliminare sessioni per TUTTE le campagne
-- (non solo quelle di cui sono gm_id). La policy "GM and Admin can view all sessions" permette
-- solo la SELECT; qui abilitiamo INSERT, UPDATE, DELETE per chi ha ruolo gm o admin.

CREATE POLICY "GM and Admin can manage all sessions"
  ON sessions FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

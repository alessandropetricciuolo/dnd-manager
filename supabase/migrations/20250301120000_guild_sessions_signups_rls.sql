-- Modello Guild: GM e Admin devono vedere sessioni e iscrizioni di TUTTE le campagne
-- (non solo quelle di cui sono gm_id). Senza queste policy l'admin non vede le sessioni
-- né la lista "Nessun iscritto ancora" nella scheda Sessioni.

-- Sessioni: GM/Admin possono leggere tutte le sessioni (per vedere le card nella pagina campagna).
CREATE POLICY "GM and Admin can view all sessions"
  ON sessions FOR SELECT
  USING (public.is_gm_or_admin());

-- Iscrizioni: GM/Admin possono leggere e gestire tutte le iscrizioni (approva, rifiuta, elimina).
CREATE POLICY "GM and Admin can view all signups"
  ON session_signups FOR SELECT
  USING (public.is_gm_or_admin());

CREATE POLICY "GM and Admin can manage all signups"
  ON session_signups FOR ALL
  USING (public.is_gm_or_admin());

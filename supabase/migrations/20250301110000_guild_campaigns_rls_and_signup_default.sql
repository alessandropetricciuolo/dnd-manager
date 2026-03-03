-- Modello Guild: GM e Admin possono vedere tutte le campagne.
CREATE OR REPLACE FUNCTION public.is_gm_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('gm', 'admin')
  );
$$;

CREATE POLICY "GM and Admin can view all campaigns"
  ON campaigns FOR SELECT
  USING (public.is_gm_or_admin());

-- Iscrizioni: stato iniziale sempre Pending.
ALTER TABLE session_signups
  ALTER COLUMN status SET DEFAULT 'pending';

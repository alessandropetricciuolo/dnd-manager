-- Garantisce che esista una riga in profiles per l'utente corrente (utile se il trigger on signup non è partito).
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (auth.uid(), 'player')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.ensure_my_profile() IS 'Creates a profile row for the current user if missing (e.g. when trigger did not run).';

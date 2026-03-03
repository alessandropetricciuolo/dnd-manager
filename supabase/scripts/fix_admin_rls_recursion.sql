-- Risolve "infinite recursion detected in policy for relation profiles".
-- La policy che legge da profiles per verificare se sei admin causava ricorsione.
-- Usiamo una funzione SECURITY DEFINER che legge profiles senza passare da RLS.

-- 1. Funzione che ritorna true se l'utente corrente è admin (non causa ricorsione)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Rimuovi le policy che causano ricorsione
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- 3. Nuove policy che usano la funzione (nessuna ricorsione)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

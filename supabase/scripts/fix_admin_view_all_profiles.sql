-- Esegui questo script in Supabase → SQL Editor se gli admin non vedono tutti gli utenti.
-- Aggiunge le policy che permettono agli admin di vedere e aggiornare tutti i profili.

-- 1. Ruolo 'admin' consentito (se non già fatto)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('player', 'gm', 'admin'));

-- 2. Rimuovi policy admin se esistono (per poterle ricreare)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- 3. Gli admin possono vedere TUTTI i profili
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4. Gli admin possono aggiornare qualsiasi profilo (es. cambio ruolo)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

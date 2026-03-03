-- Allow 'admin' in profiles.role and RLS for admin panel

-- 1. Drop existing role check and add new one including 'admin'
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('player', 'gm', 'admin'));

-- 2. Admins can view all profiles (for admin dashboard list)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- 3. Admins can update any profile (for role changes)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- M2 security prerequisite: profiles.role is authorization data and must not
-- be writable by the profile owner or sourced as Admin from signup metadata.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, first_name, last_name, phone)
  VALUES (
    NEW.id,
    'player',
    NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '')
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates signup profiles as player; mutable signup metadata never grants an authorization role.';

CREATE OR REPLACE FUNCTION public.enforce_profile_role_management()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF current_user = 'service_role' OR public.is_global_admin() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'profile_role_change_requires_admin'
    USING ERRCODE = '42501';
END;
$$;

COMMENT ON FUNCTION public.enforce_profile_role_management() IS
  'Blocks self-promotion while preserving verified Admin and server service-role management.';

REVOKE ALL ON FUNCTION public.enforce_profile_role_management() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_enforce_role_management ON public.profiles;
CREATE TRIGGER profiles_enforce_role_management
  BEFORE UPDATE OF role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_management();

-- Replace the historical self-referential Admin policy with the M1 helper.
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());

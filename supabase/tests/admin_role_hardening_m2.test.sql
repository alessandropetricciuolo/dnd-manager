BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(8);

SELECT like(
  pg_get_functiondef('public.handle_new_user()'::regprocedure),
  '%NEW.id,%''player''%',
  'Signup always creates the non-privileged player role'
);
SELECT unlike(
  pg_get_functiondef('public.handle_new_user()'::regprocedure),
  '%raw_user_meta_data->>''role''%',
  'Signup metadata is not used for authorization role assignment'
);

SET LOCAL session_replication_role = replica;
INSERT INTO public.profiles (id, role, display_name) VALUES
  ('11000000-0000-0000-0000-000000000001', 'admin', 'Admin fixture'),
  ('22000000-0000-0000-0000-000000000002', 'gm', 'GM fixture'),
  ('33000000-0000-0000-0000-000000000003', 'player', 'Player fixture');
SET LOCAL session_replication_role = origin;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000003', true);
SELECT throws_ok(
  $$UPDATE public.profiles SET role = 'admin' WHERE id = '33000000-0000-0000-0000-000000000003'$$,
  '42501', 'profile_role_change_requires_admin', 'Player cannot self-promote to Admin'
);
SELECT lives_ok(
  $$UPDATE public.profiles SET display_name = 'Player updated safely' WHERE id = '33000000-0000-0000-0000-000000000003'$$,
  'Player can still update non-role profile fields'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000002', true);
SELECT throws_ok(
  $$UPDATE public.profiles SET role = 'admin' WHERE id = '22000000-0000-0000-0000-000000000002'$$,
  '42501', 'profile_role_change_requires_admin', 'GM cannot self-promote to Admin'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);
SELECT lives_ok(
  $$UPDATE public.profiles SET role = 'gm' WHERE id = '33000000-0000-0000-0000-000000000003'$$,
  'Verified Admin can manage another profile role'
);
SELECT is(
  (SELECT role FROM public.profiles WHERE id = '33000000-0000-0000-0000-000000000003'),
  'gm',
  'Admin role change is persisted'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT lives_ok(
  $$UPDATE public.profiles SET role = 'player' WHERE id = '33000000-0000-0000-0000-000000000003'$$,
  'Server service-role flow can manage roles'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;

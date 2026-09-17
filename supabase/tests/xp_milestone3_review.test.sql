BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(19);

SELECT has_table(
  'public',
  'session_xp_awards',
  'The XP ledger is present after the M1 migration'
);
SELECT has_column(
  'public',
  'session_xp_awards',
  'xp_after',
  'The M2 persisted confirmation total is present'
);
SELECT ok(
  (SELECT c.relrowsecurity FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'session_xp_awards'),
  'The XP ledger keeps RLS enabled'
);
SELECT has_index(
  'public',
  'session_xp_awards',
  'session_xp_awards_session_character_uidx',
  'The session and character uniqueness guard is present'
);
SELECT has_function(
  'public',
  'session_actor_can_manage',
  ARRAY['uuid', 'uuid'],
  'The explicit campaign authorization helper is present'
);
SELECT has_function(
  'public',
  'close_session_with_xp_persisted',
  ARRAY['uuid', 'uuid', 'jsonb', 'integer', 'jsonb', 'text', 'text'],
  'The persisted close wrapper is present'
);

SELECT like(
  pg_get_functiondef('public.session_actor_can_manage(uuid,uuid)'::regprocedure),
  '%c.gm_id = p_actor_id%',
  'A GM must own the target campaign when closing XP'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%FOR UPDATE%',
  'Close locks the session and participant rows transactionally'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%ON CONFLICT (session_id, player_id) DO NOTHING%',
  'Retry cannot insert a second award for the same player and session'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%SET status = ''completed''%',
  'The session is completed inside the same transaction as the ledger'
);
SELECT ok(
  strpos(
    pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
    'IF v_session.status = ''completed'''
  ) < strpos(
    pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
    'FOR v_signup IN'
  ),
  'A completed-session retry returns before attendance or XP side effects'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%WHEN v_character_id IS NOT NULL THEN%',
  'The character sheet is the canonical XP base when assigned'
);
SELECT like(
  pg_get_functiondef('public.set_character_xp_canonical(uuid,uuid,integer)'::regprocedure),
  '%IF v_character.assigned_to IS NULL THEN%',
  'Reassignment and unassignment are explicitly guarded'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp_persisted(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%SET xp_after = COALESCE%',
  'The close confirmation is based on persisted totals'
);
SELECT ok(
  has_function_privilege('service_role', 'public.session_actor_can_manage(uuid,uuid)', 'EXECUTE'),
  'Only the server execution role can invoke the campaign guard'
);
SELECT ok(
  has_function_privilege('service_role', 'public.close_session_with_xp_persisted(uuid,uuid,jsonb,integer,jsonb,text,text)', 'EXECUTE'),
  'Only the server execution role can invoke persisted close'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.session_xp_awards', 'SELECT'),
  'Authenticated GM/Admin readers retain ledger SELECT access'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.session_xp_awards', 'INSERT'),
  'Authenticated clients cannot insert ledger rows directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.session_xp_awards', 'UPDATE'),
  'Authenticated clients cannot mutate persisted totals directly'
);

SELECT * FROM finish();
ROLLBACK;

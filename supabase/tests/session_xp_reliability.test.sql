BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(14);

SELECT has_table(
  'public',
  'session_xp_awards',
  'Session XP ledger table exists'
);
SELECT has_column(
  'public',
  'sessions',
  'pre_closed_xp_gained',
  'Pre-close total XP is persisted on sessions'
);
SELECT has_column(
  'public',
  'sessions',
  'pre_closed_xp_awards',
  'Pre-close per-player XP is persisted on sessions'
);
SELECT col_not_null(
  'public',
  'session_xp_awards',
  'session_id',
  'Ledger rows always belong to a session'
);
SELECT col_not_null(
  'public',
  'session_xp_awards',
  'player_id',
  'Ledger rows always belong to a player'
);
SELECT col_not_null(
  'public',
  'session_xp_awards',
  'xp_awarded',
  'Ledger rows always record an XP amount'
);
SELECT has_index(
  'public',
  'session_xp_awards',
  'session_xp_awards_session_character_uidx',
  'Session and character idempotency index exists'
);
SELECT has_function(
  'public',
  'save_session_preclose',
  ARRAY['uuid', 'uuid', 'jsonb', 'integer', 'jsonb'],
  'Pre-close RPC exists with explicit actor authorization input'
);
SELECT has_function(
  'public',
  'close_session_with_xp',
  ARRAY['uuid', 'uuid', 'jsonb', 'integer', 'jsonb', 'text', 'text'],
  'Atomic close RPC exists'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%ON CONFLICT (session_id, player_id) DO NOTHING%',
  'Close RPC is idempotent per session and player'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%SET status = ''completed''%',
  'Close RPC marks the session completed only after award processing'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%WHERE id = v_member_id%',
  'Close RPC updates an existing campaign member by the selected member id'
);
SELECT like(
  pg_get_functiondef('public.session_actor_can_manage(uuid,uuid)'::regprocedure),
  '%c.gm_id = p_actor_id%',
  'GM authorization is scoped to the campaign owner'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%WHEN v_character_id IS NOT NULL THEN%',
  'Character current XP is the canonical base when a sheet exists'
);

SELECT * FROM finish();
ROLLBACK;

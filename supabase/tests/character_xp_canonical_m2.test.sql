BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(7);

SELECT has_column(
  'public',
  'session_xp_awards',
  'xp_after',
  'Ledger stores the persisted post-award total'
);
SELECT has_function(
  'public',
  'set_character_xp_canonical',
  ARRAY['uuid', 'uuid', 'integer'],
  'Canonical character XP synchronization RPC exists'
);
SELECT has_function(
  'public',
  'close_session_with_xp_persisted',
  ARRAY['uuid', 'uuid', 'jsonb', 'integer', 'jsonb', 'text', 'text'],
  'Persisted close confirmation RPC exists'
);
SELECT like(
  pg_get_functiondef('public.set_character_xp_canonical(uuid,uuid,integer)'::regprocedure),
  '%SET current_xp = v_next_xp%',
  'Canonical RPC writes the character sheet total'
);
SELECT like(
  pg_get_functiondef('public.set_character_xp_canonical(uuid,uuid,integer)'::regprocedure),
  '%SET xp_earned = EXCLUDED.xp_earned%',
  'Compatibility member total is synchronized explicitly'
);
SELECT like(
  pg_get_functiondef('public.close_session_with_xp_persisted(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%SET xp_after = COALESCE(%',
  'Close confirmation snapshots the persisted total'
);
SELECT unlike(
  pg_get_functiondef('public.close_session_with_xp_persisted(uuid,uuid,jsonb,integer,jsonb,text,text)'::regprocedure),
  '%campaign_members%SET current_xp%',
  'Member compatibility data never becomes the character canonical source'
);
SELECT * FROM finish();
ROLLBACK;

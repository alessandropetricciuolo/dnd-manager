BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;

SELECT plan(44);

SELECT has_column('public', 'campaigns', 'admin_drafts_enabled', 'campaign flag exists');
SELECT has_column('public', 'wiki_entities', 'admin_only', 'wiki barrier column exists');
SELECT has_column('public', 'maps', 'admin_only', 'map barrier column exists');
SELECT has_column('public', 'campaign_memory_chunks', 'admin_only', 'memory barrier column exists');
SELECT col_not_null('public', 'campaigns', 'admin_drafts_enabled', 'campaign flag is not null');
SELECT col_not_null('public', 'wiki_entities', 'admin_only', 'wiki admin_only is not null');
SELECT col_not_null('public', 'maps', 'admin_only', 'map admin_only is not null');
SELECT col_not_null('public', 'campaign_memory_chunks', 'admin_only', 'memory admin_only is not null');
SELECT col_default_is('public', 'campaigns', 'admin_drafts_enabled', 'false', 'campaign flag defaults false');
SELECT col_default_is('public', 'wiki_entities', 'admin_only', 'false', 'wiki admin_only defaults false');
SELECT col_default_is('public', 'maps', 'admin_only', 'false', 'map admin_only defaults false');
SELECT col_default_is('public', 'campaign_memory_chunks', 'admin_only', 'false', 'memory admin_only defaults false');

SET LOCAL session_replication_role = replica;
INSERT INTO public.profiles (id, role) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin'),
  ('20000000-0000-0000-0000-000000000002', 'gm'),
  ('30000000-0000-0000-0000-000000000003', 'player');
INSERT INTO public.campaigns (id, gm_id, name, admin_drafts_enabled) VALUES
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'M1 enabled', true),
  ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'M1 disabled', false);
SET LOCAL session_replication_role = origin;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT lives_ok(
  $$INSERT INTO public.wiki_entities (id, campaign_id, type, name, admin_only)
    VALUES ('60000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000004', 'lore', 'M1 protected wiki', true)$$,
  'Admin inserts protected wiki when enabled'
);
SELECT lives_ok(
  $$INSERT INTO public.maps (id, campaign_id, name, image_url, admin_only)
    VALUES ('70000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000004', 'M1 protected map', 'https://example.invalid/m1.png', true)$$,
  'Admin inserts protected map when enabled'
);
SELECT is((SELECT count(*) FROM public.wiki_entities WHERE id = '60000000-0000-0000-0000-000000000006'), 1::bigint, 'Admin selects protected wiki');
SELECT is((SELECT count(*) FROM public.maps WHERE id = '70000000-0000-0000-0000-000000000007'), 1::bigint, 'Admin selects protected map');
SELECT lives_ok($$UPDATE public.wiki_entities SET name = 'M1 protected wiki updated' WHERE id = '60000000-0000-0000-0000-000000000006'$$, 'Admin updates protected wiki');
SELECT lives_ok($$UPDATE public.maps SET name = 'M1 protected map updated' WHERE id = '70000000-0000-0000-0000-000000000007'$$, 'Admin updates protected map');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
SELECT is((SELECT count(*) FROM public.wiki_entities WHERE id = '60000000-0000-0000-0000-000000000006'), 0::bigint, 'GM cannot select protected wiki');
SELECT is((SELECT count(*) FROM public.maps WHERE id = '70000000-0000-0000-0000-000000000007'), 0::bigint, 'GM cannot select protected map');
SELECT is((WITH changed AS (UPDATE public.wiki_entities SET name = 'leak' WHERE id = '60000000-0000-0000-0000-000000000006' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'GM cannot update protected wiki');
SELECT is((WITH changed AS (DELETE FROM public.maps WHERE id = '70000000-0000-0000-0000-000000000007' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'GM cannot delete protected map');
SELECT throws_ok(
  $$INSERT INTO public.wiki_entities (campaign_id, type, name, admin_only) VALUES ('40000000-0000-0000-0000-000000000004', 'lore', 'GM denied', true)$$,
  '42501', 'admin_only_requires_global_admin', 'GM cannot insert protected wiki'
);
SELECT lives_ok(
  $$INSERT INTO public.wiki_entities (id, campaign_id, type, name) VALUES ('80000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000004', 'lore', 'GM normal')$$,
  'GM can insert normal wiki under existing policy'
);
SELECT lives_ok($$UPDATE public.wiki_entities SET name = 'GM normal updated' WHERE id = '80000000-0000-0000-0000-000000000008'$$, 'GM can update normal wiki');
SELECT lives_ok($$DELETE FROM public.wiki_entities WHERE id = '80000000-0000-0000-0000-000000000008'$$, 'GM can delete normal wiki');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
SELECT is((SELECT count(*) FROM public.wiki_entities WHERE id = '60000000-0000-0000-0000-000000000006'), 0::bigint, 'Player cannot select protected wiki');
SELECT is((SELECT count(*) FROM public.maps WHERE id = '70000000-0000-0000-0000-000000000007'), 0::bigint, 'Player cannot select protected map');
SELECT is((WITH changed AS (UPDATE public.maps SET name = 'leak' WHERE id = '70000000-0000-0000-0000-000000000007' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'Player cannot update protected map');
SELECT is((WITH changed AS (DELETE FROM public.wiki_entities WHERE id = '60000000-0000-0000-0000-000000000006' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'Player cannot delete protected wiki');
SELECT throws_ok(
  $$INSERT INTO public.maps (campaign_id, name, image_url, admin_only) VALUES ('40000000-0000-0000-0000-000000000004', 'Player denied', 'https://example.invalid/player.png', true)$$,
  '42501', 'admin_only_requires_global_admin', 'Player cannot insert protected map'
);

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT is((SELECT count(*) FROM public.wiki_entities WHERE id = '60000000-0000-0000-0000-000000000006'), 0::bigint, 'Anon cannot select protected wiki');
SELECT is((SELECT count(*) FROM public.maps WHERE id = '70000000-0000-0000-0000-000000000007'), 0::bigint, 'Anon cannot select protected map');
SELECT is((WITH changed AS (UPDATE public.wiki_entities SET name = 'leak' WHERE id = '60000000-0000-0000-0000-000000000006' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'Anon cannot update protected wiki');
SELECT is((WITH changed AS (DELETE FROM public.maps WHERE id = '70000000-0000-0000-0000-000000000007' RETURNING 1) SELECT count(*) FROM changed), 0::bigint, 'Anon cannot delete protected map');
SELECT throws_ok(
  $$INSERT INTO public.wiki_entities (campaign_id, type, name, admin_only) VALUES ('40000000-0000-0000-0000-000000000004', 'lore', 'Anon denied', true)$$,
  '42501', 'admin_only_requires_global_admin', 'Anon cannot insert protected wiki'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
SELECT throws_ok(
  $$INSERT INTO public.wiki_entities (campaign_id, type, name, admin_only) VALUES ('50000000-0000-0000-0000-000000000005', 'lore', 'Disabled wiki', true)$$,
  '42501', 'admin_only_feature_disabled', 'Disabled flag blocks Admin protected wiki insert'
);
SELECT throws_ok(
  $$INSERT INTO public.maps (campaign_id, name, image_url, admin_only) VALUES ('50000000-0000-0000-0000-000000000005', 'Disabled map', 'https://example.invalid/disabled.png', true)$$,
  '42501', 'admin_only_feature_disabled', 'Disabled flag blocks Admin protected map insert'
);
SELECT lives_ok(
  $$INSERT INTO public.wiki_entities (id, campaign_id, type, name) VALUES ('90000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000005', 'lore', 'Convertible')$$,
  'Admin inserts normal wiki while flag disabled'
);
SELECT throws_ok(
  $$UPDATE public.wiki_entities SET admin_only = true WHERE id = '90000000-0000-0000-0000-000000000009'$$,
  '42501', 'admin_only_feature_disabled', 'Disabled flag blocks Admin conversion to protected'
);
SELECT lives_ok(
  $$UPDATE public.campaigns SET admin_drafts_enabled = false WHERE id = '40000000-0000-0000-0000-000000000004'$$,
  'Admin can perform operational rollback by disabling the flag'
);
SELECT lives_ok(
  $$UPDATE public.wiki_entities SET name = 'Protected remains editable' WHERE id = '60000000-0000-0000-0000-000000000006'$$,
  'Existing protected row remains editable after operational flag rollback'
);
SELECT lives_ok($$DELETE FROM public.wiki_entities WHERE id = '60000000-0000-0000-0000-000000000006'$$, 'Admin deletes protected wiki');
SELECT lives_ok($$DELETE FROM public.maps WHERE id = '70000000-0000-0000-0000-000000000007'$$, 'Admin deletes protected map');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;

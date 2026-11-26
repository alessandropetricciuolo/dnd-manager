-- Player-facing projections contain only the resources explicitly shared by the GM.
CREATE SCHEMA IF NOT EXISTS session_live_private;
REVOKE ALL ON SCHEMA session_live_private FROM PUBLIC;

CREATE TABLE session_live_private.contexts (
  scope text NOT NULL CHECK (scope IN ('session', 'torneo', 'torneo2')),
  context_id uuid NOT NULL,
  gm_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  active boolean NOT NULL,
  revision bigint NOT NULL CHECK (revision > 0),
  PRIMARY KEY (scope, context_id)
);

CREATE TABLE session_live_private.commands (
  id uuid PRIMARY KEY,
  scope text NOT NULL,
  context_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE public.session_live_characters (
  scope text NOT NULL,
  context_id uuid NOT NULL,
  character_id uuid NOT NULL REFERENCES public.campaign_characters(id) ON DELETE CASCADE,
  active boolean NOT NULL,
  resources jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, context_id, character_id),
  FOREIGN KEY (scope, context_id) REFERENCES session_live_private.contexts(scope, context_id) ON DELETE CASCADE
);

CREATE INDEX session_live_character_lookup ON public.session_live_characters(character_id);
CREATE UNIQUE INDEX session_live_one_context_per_character
  ON public.session_live_characters(character_id) WHERE active;

ALTER TABLE public.session_live_characters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.session_live_characters FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.session_live_characters TO authenticated, service_role;

CREATE FUNCTION session_live_private.context_gm(p_scope text, p_context_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE p_scope
    WHEN 'session' THEN (
      SELECT coalesce(s.dm_id, c.gm_id)
      FROM public.sessions s JOIN public.campaigns c ON c.id = s.campaign_id
      WHERE s.id = p_context_id AND s.status = 'scheduled' AND c.type IN ('long', 'quest', 'oneshot')
    )
    WHEN 'torneo' THEN (
      SELECT l.created_by
      FROM public.torneo_matches m
      JOIN public.torneo_live_sessions l ON l.campaign_id = m.campaign_id
      WHERE m.id = p_context_id AND m.status <> 'completed' AND l.status = 'live'
        AND p_context_id IN (l.station1_match_id, l.station2_match_id)
    )
    WHEN 'torneo2' THEN (
      SELECT l.created_by
      FROM public.torneo2_matches m
      JOIN public.torneo2_live_sessions l ON l.campaign_id = m.campaign_id
      WHERE m.id = p_context_id AND m.status = 'active' AND l.status = 'live'
        AND p_context_id IN (l.station1_match_id, l.station2_match_id)
    )
  END
$$;

CREATE FUNCTION session_live_private.in_roster(
  p_scope text, p_context_id uuid, p_character_id uuid, p_user_id uuid
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_characters c
    WHERE c.id = p_character_id AND c.assigned_to = p_user_id AND
    CASE p_scope
      WHEN 'session' THEN EXISTS (
        SELECT 1 FROM public.sessions s
        JOIN public.session_signups ssu ON ssu.session_id = s.id
        WHERE s.id = p_context_id AND s.campaign_id = c.campaign_id
          AND ssu.player_id = p_user_id AND ssu.status IN ('approved', 'confirmed', 'attended')
      )
      WHEN 'torneo' THEN EXISTS (
        SELECT 1 FROM public.torneo_matches m
        JOIN public.torneo_team_members tm ON tm.team_id IN (m.team_a_id, m.team_b_id)
        WHERE m.id = p_context_id AND m.campaign_id = c.campaign_id AND tm.character_id = c.id
      )
      WHEN 'torneo2' THEN EXISTS (
        SELECT 1 FROM public.torneo2_matches m
        WHERE m.id = p_context_id AND m.campaign_id = c.campaign_id AND (
          (m.kind = 'team' AND EXISTS (
            SELECT 1 FROM public.torneo2_team_members tm
            WHERE tm.team_id IN (m.team_a_id, m.team_b_id) AND tm.character_id = c.id
          )) OR (m.kind = 'final_ffa' AND EXISTS (
            SELECT 1 FROM public.torneo2_match_participants mp
            WHERE mp.match_id = m.id AND mp.character_id = c.id
          ))
        )
      )
      ELSE false
    END
  )
$$;

CREATE POLICY session_live_owned_projection ON public.session_live_characters
  FOR SELECT TO authenticated USING (
    session_live_private.context_gm(scope, context_id) IS NOT NULL
    AND session_live_private.in_roster(scope, context_id, character_id, (SELECT auth.uid()))
  );

-- The match rows include the full GM snapshot. Player clients use the projection above.
CREATE POLICY session_live_tournament_snapshot_gm_only ON public.torneo_matches
  AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING ((SELECT public.is_gm_or_admin()));
CREATE POLICY session_live_tournament2_snapshot_gm_only ON public.torneo2_matches
  AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING ((SELECT public.is_gm_or_admin()));

CREATE FUNCTION session_live_private.sheet_resources(p_hit_points integer, p_snapshot jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'hitPoints', greatest(0, coalesce(p_hit_points,
      CASE WHEN p_snapshot #>> '{character_sheet,hpMax}' ~ '^[0-9]{1,7}$'
        THEN (p_snapshot #>> '{character_sheet,hpMax}')::integer END,
      CASE WHEN p_snapshot ->> 'max_hp' ~ '^[0-9]{1,7}$'
        THEN (p_snapshot ->> 'max_hp')::integer END)),
    'tempHp', coalesce(p_snapshot -> 'temp_hp', '0'::jsonb),
    'deathSaves', jsonb_build_object(
      'successes', coalesce(p_snapshot #> '{death_saves,successes}', '0'::jsonb),
      'failures', coalesce(p_snapshot #> '{death_saves,failures}', '0'::jsonb)),
    'usedSpellSlots', CASE WHEN jsonb_typeof(p_snapshot -> 'usedSpellSlots') = 'object'
      THEN coalesce((SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(p_snapshot -> 'usedSpellSlots')
        WHERE key ~ '^[1-9]$' AND value::text ~ '^[1-9][0-9]?$'), '{}'::jsonb)
      ELSE '{}'::jsonb END,
    'conditions', '[]'::jsonb
  )
$$;

CREATE FUNCTION session_live_private.slot_count(p_slots jsonb, p_level text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_slots) = 'object' AND p_slots ->> p_level ~ '^[0-9]{1,2}$'
      THEN (p_slots ->> p_level)::integer
    WHEN jsonb_typeof(p_slots) = 'array' THEN (
      SELECT (slot ->> 'count')::integer FROM jsonb_array_elements(p_slots) slot
      WHERE slot ->> 'level' = p_level AND slot ->> 'count' ~ '^[0-9]{1,2}$'
      LIMIT 1)
  END
$$;

CREATE FUNCTION session_live_private.tracker_resources(p_entry jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'hitPoints', coalesce(p_entry -> 'hp', '0'::jsonb),
    'tempHp', coalesce(p_entry -> 'tempHp', '0'::jsonb),
    'deathSaves', jsonb_build_object(
      'successes', coalesce(p_entry #> '{deathSaves,success}', '0'::jsonb),
      'failures', coalesce(p_entry #> '{deathSaves,fail}', '0'::jsonb)),
    'usedSpellSlots', coalesce((
      SELECT jsonb_object_agg(s ->> 'level', (s ->> 'count')::integer -
        coalesce((SELECT (r ->> 'count')::integer
          FROM jsonb_array_elements(coalesce(p_entry #> '{spellSlots,remaining}', '[]'::jsonb)) r
          WHERE r ->> 'level' = s ->> 'level' LIMIT 1), 0))
      FROM jsonb_array_elements(coalesce(p_entry #> '{spellSlots,max}', '[]'::jsonb)) s
    ), '{}'::jsonb),
    'conditions', '[]'::jsonb
  )
$$;

-- Only this command path can preserve a protected resource write. The marker is private
-- and scoped to the transaction, and absent for regular GM, mobile and service-role writes.
CREATE TABLE session_live_private.sheet_writes (
  transaction_id bigint NOT NULL,
  character_id uuid NOT NULL,
  PRIMARY KEY (transaction_id, character_id)
);

CREATE FUNCTION session_live_private.guard_sheet_resources()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (old.hit_points, old.rules_snapshot -> 'temp_hp', old.rules_snapshot -> 'death_saves',
      old.rules_snapshot -> 'usedSpellSlots') IS DISTINCT FROM
     (new.hit_points, new.rules_snapshot -> 'temp_hp', new.rules_snapshot -> 'death_saves',
      new.rules_snapshot -> 'usedSpellSlots')
    AND EXISTS (SELECT 1 FROM public.session_live_characters pc WHERE pc.character_id = old.id AND pc.active)
    AND NOT EXISTS (
      SELECT 1 FROM session_live_private.sheet_writes w
      WHERE w.transaction_id = txid_current() AND w.character_id = old.id
    )
  THEN
    RAISE EXCEPTION 'session_live_resources_managed_by_gm';
  END IF;
  RETURN new;
END
$$;

CREATE TRIGGER session_live_guard_sheet
  BEFORE UPDATE OF hit_points, rules_snapshot ON public.campaign_characters
  FOR EACH ROW EXECUTE FUNCTION session_live_private.guard_sheet_resources();

-- Other tournament writers still save initiative, turn counters and notes. Retain
-- confirmed live resources if one of those writes contains an older copy.
CREATE FUNCTION session_live_private.merge_tracker_resources(p_entry jsonb, p_resources jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT p_entry || jsonb_build_object(
    'hp', p_resources -> 'hitPoints', 'tempHp', p_resources -> 'tempHp',
    'deathSaves', coalesce(p_entry -> 'deathSaves', '{}'::jsonb) || jsonb_build_object(
      'success', p_resources #> '{deathSaves,successes}', 'fail', p_resources #> '{deathSaves,failures}'))
    || CASE WHEN jsonb_typeof(p_entry #> '{spellSlots,max}') = 'array' THEN
      jsonb_build_object('spellSlots', (p_entry -> 'spellSlots') || jsonb_build_object('remaining',
        coalesce((SELECT jsonb_agg(s || jsonb_build_object('count', greatest(0, (s ->> 'count')::integer
          - coalesce((p_resources #> '{usedSpellSlots}' ->> (s ->> 'level'))::integer, 0))))
          FROM jsonb_array_elements(p_entry #> '{spellSlots,max}') s), '[]'::jsonb)))
    ELSE '{}'::jsonb END
$$;

CREATE FUNCTION session_live_private.preserve_match_resources(
  p_scope text, p_match_id uuid, p_snapshot jsonb
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_list text := CASE WHEN p_scope = 'torneo' THEN 'entries' ELSE 'combatants' END;
  v_id text := CASE WHEN p_scope = 'torneo' THEN 'playerId' ELSE 'characterId' END;
  v_entries jsonb;
BEGIN
  IF jsonb_typeof(p_snapshot -> v_list) IS DISTINCT FROM 'array' THEN RETURN p_snapshot; END IF;
  SELECT coalesce(jsonb_agg(CASE WHEN pc.resources IS NOT NULL
    THEN session_live_private.merge_tracker_resources(e, pc.resources) ELSE e END ORDER BY ord), '[]'::jsonb)
  INTO v_entries
  FROM jsonb_array_elements(p_snapshot -> v_list) WITH ORDINALITY entry(e, ord)
  LEFT JOIN public.session_live_characters pc ON pc.scope = p_scope AND pc.context_id = p_match_id
    AND pc.character_id::text = e ->> v_id AND pc.active
    AND (p_scope <> 'torneo' OR e ->> 'type' = 'pc');
  RETURN jsonb_set(p_snapshot, ARRAY[v_list], v_entries);
END
$$;

CREATE FUNCTION session_live_private.guard_match_resources()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_ARGV[0] = 'torneo' THEN
    NEW.initiative_snapshot := session_live_private.preserve_match_resources('torneo', OLD.id, NEW.initiative_snapshot);
  ELSE
    NEW.combat_state := session_live_private.preserve_match_resources('torneo2', OLD.id, NEW.combat_state);
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER session_live_guard_match BEFORE UPDATE OF initiative_snapshot ON public.torneo_matches
  FOR EACH ROW WHEN (OLD.status = NEW.status AND NEW.initiative_snapshot IS NOT NULL)
  EXECUTE FUNCTION session_live_private.guard_match_resources('torneo');
CREATE TRIGGER session_live_guard_match2 BEFORE UPDATE OF combat_state ON public.torneo2_matches
  FOR EACH ROW WHEN (OLD.status = NEW.status AND NEW.combat_state IS NOT NULL)
  EXECUTE FUNCTION session_live_private.guard_match_resources('torneo2');

CREATE FUNCTION public.session_live_gm_state(p_scope text, p_context_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_gm uuid := session_live_private.context_gm(p_scope, p_context_id);
  v_ctx session_live_private.contexts%ROWTYPE;
BEGIN
  SELECT * INTO v_ctx FROM session_live_private.contexts WHERE scope = p_scope AND context_id = p_context_id;
  IF NOT coalesce(public.is_gm_or_admin(), false)
    OR (auth.uid() IS DISTINCT FROM v_gm AND auth.uid() IS DISTINCT FROM v_ctx.gm_id)
  THEN
    RETURN jsonb_build_object('active', false, 'ownsLive', false, 'revision', 0, 'characters', '[]'::jsonb);
  END IF;
  RETURN jsonb_build_object(
    'active', coalesce(v_ctx.active AND v_gm = v_ctx.gm_id, false),
    'ownsLive', coalesce(auth.uid() = v_gm, false),
    'revision', coalesce(v_ctx.revision, 0),
    'characters', coalesce((
      SELECT jsonb_agg(pc.resources || jsonb_build_object('characterId', pc.character_id)
        ORDER BY pc.character_id)
      FROM public.session_live_characters pc
      WHERE pc.scope = p_scope AND pc.context_id = p_context_id AND pc.active
    ), '[]'::jsonb)
  );
END
$$;

CREATE FUNCTION public.session_live_command(
  p_scope text, p_context_id uuid, p_command_id uuid, p_action text, p_payload jsonb DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_command session_live_private.commands%ROWTYPE;
  v_context session_live_private.contexts%ROWTYPE;
  v_character public.campaign_characters%ROWTYPE;
  v_entry jsonb;
  v_resources jsonb;
  v_previous_resources jsonb;
  v_patch jsonb;
  v_id uuid;
  v_change jsonb;
  v_ids uuid[];
  v_slots jsonb;
  v_conditions jsonb;
  v_max_hp integer;
  v_slot_maxima jsonb;
  v_campaign_type text;
  v_match_entries jsonb;
  v_match_state jsonb;
  v_match_field text;
  v_match_id_field text;
BEGIN
  IF v_actor IS NULL OR p_context_id IS NULL OR p_command_id IS NULL OR p_scope IS NULL
    OR p_action IS NULL OR p_scope NOT IN ('session', 'torneo', 'torneo2')
    OR p_action NOT IN ('start', 'update', 'stop') OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
    OR octet_length(p_payload::text) > 50000
  THEN RAISE EXCEPTION 'session_live_invalid_command'; END IF;

  -- Serialize with session closure, match refresh/reset and other commands in this context.
  IF p_scope = 'session' THEN
    SELECT c.type INTO v_campaign_type
    FROM public.sessions s JOIN public.campaigns c ON c.id = s.campaign_id
    WHERE s.id = p_context_id FOR UPDATE OF s;
  ELSIF p_scope = 'torneo' THEN
    SELECT initiative_snapshot INTO v_match_state FROM public.torneo_matches WHERE id = p_context_id FOR UPDATE;
    PERFORM 1 FROM public.torneo_live_sessions
    WHERE status = 'live' AND p_context_id IN (station1_match_id, station2_match_id) FOR SHARE;
    v_match_field := 'entries';
    v_match_id_field := 'playerId';
  ELSE
    SELECT combat_state INTO v_match_state FROM public.torneo2_matches WHERE id = p_context_id FOR UPDATE;
    PERFORM 1 FROM public.torneo2_live_sessions
    WHERE status = 'live' AND p_context_id IN (station1_match_id, station2_match_id) FOR SHARE;
    v_match_field := 'combatants';
    v_match_id_field := 'characterId';
  END IF;

  SELECT * INTO v_command FROM session_live_private.commands WHERE id = p_command_id;
  IF FOUND THEN
    IF (v_command.scope, v_command.context_id, v_command.actor_id, v_command.action, v_command.payload)
      IS DISTINCT FROM (p_scope, p_context_id, v_actor, p_action, p_payload)
    THEN RAISE EXCEPTION 'session_live_command_id_conflict'; END IF;
    RETURN public.session_live_gm_state(p_scope, p_context_id);
  END IF;

  IF v_actor IS DISTINCT FROM session_live_private.context_gm(p_scope, p_context_id)
    OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_actor AND p.role IN ('gm', 'admin'))
  THEN RAISE EXCEPTION 'session_live_not_authorized'; END IF;

  SELECT * INTO v_context FROM session_live_private.contexts WHERE scope = p_scope AND context_id = p_context_id;
  IF v_context.active AND v_context.gm_id IS DISTINCT FROM v_actor
  THEN RAISE EXCEPTION 'session_live_not_authorized'; END IF;

  IF p_action <> 'start' THEN
    IF NOT coalesce(v_context.active, false) THEN RAISE EXCEPTION 'session_live_not_active'; END IF;
    IF jsonb_typeof(p_payload -> 'expectedRevision') IS DISTINCT FROM 'number'
      OR (p_payload ->> 'expectedRevision') !~ '^[0-9]{1,18}$'
    THEN RAISE EXCEPTION 'session_live_invalid_revision'; END IF;
    IF (p_payload ->> 'expectedRevision')::bigint IS DISTINCT FROM v_context.revision
    THEN RAISE EXCEPTION 'session_live_revision_conflict'; END IF;
    UPDATE session_live_private.contexts SET revision = revision + 1 WHERE scope = p_scope AND context_id = p_context_id;
  END IF;

  INSERT INTO session_live_private.commands (id, scope, context_id, actor_id, action, payload)
    VALUES (p_command_id, p_scope, p_context_id, v_actor, p_action, p_payload);

  IF p_action = 'start' THEN
    IF v_context.active THEN RAISE EXCEPTION 'session_live_already_started'; END IF;
    IF jsonb_typeof(p_payload -> 'characterIds') IS DISTINCT FROM 'array'
      OR jsonb_array_length(p_payload -> 'characterIds') NOT BETWEEN 1 AND 50
    THEN RAISE EXCEPTION 'session_live_empty_roster'; END IF;
    SELECT array_agg(DISTINCT item::uuid ORDER BY item::uuid) INTO v_ids
      FROM jsonb_array_elements_text(p_payload -> 'characterIds') item;
    INSERT INTO session_live_private.contexts AS ctx (scope, context_id, gm_id, active, revision)
      VALUES (p_scope, p_context_id, v_actor, true, 1)
      ON CONFLICT (scope, context_id) DO UPDATE SET gm_id = excluded.gm_id, active = true, revision = ctx.revision + 1;

    FOREACH v_id IN ARRAY v_ids LOOP
      SELECT * INTO v_character FROM public.campaign_characters WHERE id = v_id FOR UPDATE;
      IF NOT FOUND OR NOT session_live_private.in_roster(p_scope, p_context_id, v_id, v_character.assigned_to)
      THEN RAISE EXCEPTION 'session_live_invalid_roster'; END IF;

      UPDATE public.session_live_characters pc SET active = false, updated_at = clock_timestamp()
      WHERE pc.character_id = v_id AND pc.active
        AND (session_live_private.context_gm(pc.scope, pc.context_id) IS NULL OR
          NOT session_live_private.in_roster(pc.scope, pc.context_id, v_id, v_character.assigned_to));

      IF p_scope = 'session' THEN
        SELECT CASE WHEN v_campaign_type = 'long'
          THEN session_live_private.sheet_resources(v_character.hit_points, v_character.rules_snapshot)
            || jsonb_build_object('conditions', resources -> 'conditions')
          ELSE resources END
        INTO v_resources FROM public.session_live_characters
        WHERE scope = p_scope AND context_id = p_context_id AND character_id = v_id;
        v_resources := coalesce(v_resources, session_live_private.sheet_resources(v_character.hit_points, v_character.rules_snapshot));
      ELSE
        SELECT e INTO v_entry
        FROM jsonb_array_elements(coalesce(v_match_state -> v_match_field, '[]'::jsonb)) e
        WHERE e ->> v_match_id_field = v_id::text AND (p_scope <> 'torneo' OR e ->> 'type' = 'pc')
        LIMIT 1;
        IF v_entry IS NULL THEN RAISE EXCEPTION 'session_live_match_not_initialized'; END IF;
        v_resources := session_live_private.tracker_resources(v_entry);
      END IF;

      INSERT INTO public.session_live_characters (scope, context_id, character_id, active, resources)
        VALUES (p_scope, p_context_id, v_id, true, v_resources)
        ON CONFLICT (scope, context_id, character_id) DO UPDATE
        SET active = true, resources = excluded.resources, updated_at = clock_timestamp();
    END LOOP;
  ELSIF p_action = 'stop' THEN
    UPDATE session_live_private.contexts SET active = false WHERE scope = p_scope AND context_id = p_context_id;
    UPDATE public.session_live_characters SET active = false, updated_at = clock_timestamp()
      WHERE scope = p_scope AND context_id = p_context_id AND active;
  ELSE
    IF jsonb_typeof(p_payload -> 'changes') IS DISTINCT FROM 'array'
      OR jsonb_array_length(p_payload -> 'changes') NOT BETWEEN 1 AND 50
    THEN RAISE EXCEPTION 'session_live_invalid_changes'; END IF;

    FOR v_change IN SELECT item FROM jsonb_array_elements(p_payload -> 'changes') item ORDER BY item ->> 'characterId' LOOP
      v_id := (v_change ->> 'characterId')::uuid;
      SELECT * INTO v_character FROM public.campaign_characters WHERE id = v_id FOR UPDATE;
      IF NOT FOUND OR NOT session_live_private.in_roster(p_scope, p_context_id, v_id, v_character.assigned_to)
      THEN RAISE EXCEPTION 'session_live_invalid_roster'; END IF;
      SELECT resources INTO v_previous_resources FROM public.session_live_characters
        WHERE scope = p_scope AND context_id = p_context_id AND character_id = v_id AND active;
      IF NOT FOUND THEN RAISE EXCEPTION 'session_live_invalid_roster'; END IF;

      v_slots := v_change -> 'usedSpellSlots';
      v_conditions := v_change -> 'conditions';
      IF jsonb_typeof(v_slots) IS DISTINCT FROM 'object'
        OR jsonb_typeof(v_conditions) IS DISTINCT FROM 'array'
        OR jsonb_typeof(v_change #> '{deathSaves,successes}') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_change #> '{deathSaves,failures}') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_change -> 'hitPoints') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_change -> 'tempHp') IS DISTINCT FROM 'number'
      THEN RAISE EXCEPTION 'session_live_invalid_resources'; END IF;
      IF (v_change ->> 'hitPoints') !~ '^[0-9]{1,7}$'
        OR (v_change ->> 'tempHp') !~ '^[0-9]{1,7}$'
        OR (v_change #>> '{deathSaves,successes}') !~ '^[0-3]$'
        OR (v_change #>> '{deathSaves,failures}') !~ '^[0-3]$'
        OR EXISTS (SELECT 1 FROM jsonb_each(v_slots) v WHERE key !~ '^[1-9]$' OR value::text !~ '^[0-9]{1,2}$')
        OR jsonb_array_length(v_conditions) > 30
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_conditions) v WHERE jsonb_typeof(v) <> 'string' OR length(v #>> '{}') NOT BETWEEN 1 AND 100)
      THEN RAISE EXCEPTION 'session_live_invalid_resources'; END IF;

      IF p_scope = 'session' THEN
        v_max_hp := coalesce(
          CASE WHEN v_character.rules_snapshot #>> '{character_sheet,hpMax}' ~ '^[0-9]{1,7}$'
            THEN (v_character.rules_snapshot #>> '{character_sheet,hpMax}')::integer END,
          CASE WHEN v_character.rules_snapshot ->> 'max_hp' ~ '^[0-9]{1,7}$'
            THEN (v_character.rules_snapshot ->> 'max_hp')::integer END);
        v_slot_maxima := v_character.rules_snapshot -> 'spellSlots';
      ELSE
        SELECT e INTO v_entry
        FROM jsonb_array_elements(coalesce(v_match_state -> v_match_field, '[]'::jsonb)) e
        WHERE e ->> v_match_id_field = v_id::text AND (p_scope <> 'torneo' OR e ->> 'type' = 'pc')
        LIMIT 1;
        IF v_entry IS NULL THEN RAISE EXCEPTION 'session_live_match_not_initialized'; END IF;
        v_max_hp := (v_entry ->> 'maxHp')::integer;
        v_slot_maxima := v_entry #> '{spellSlots,max}';
      END IF;
      IF (v_slot_maxima IS NOT NULL OR (p_scope = 'session' AND v_character.rules_snapshot #> '{character_sheet,spellSlots}' IS NOT NULL))
        AND EXISTS (
          SELECT 1 FROM jsonb_each_text(v_slots) slot
          WHERE slot.value::integer > coalesce(
            CASE WHEN p_scope = 'session' THEN session_live_private.slot_count(
              v_character.rules_snapshot #> '{character_sheet,spellSlots}', slot.key) END,
            session_live_private.slot_count(v_slot_maxima, slot.key), 0)
        )
      THEN RAISE EXCEPTION 'session_live_invalid_spell_slots'; END IF;
      IF v_max_hp > 0 AND (v_change ->> 'hitPoints')::integer > v_max_hp
      THEN RAISE EXCEPTION 'session_live_invalid_hit_points'; END IF;

      IF p_scope = 'session' THEN
        SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb) INTO v_slots
        FROM jsonb_each(v_slots) WHERE value <> '0'::jsonb;
      END IF;
      v_resources := jsonb_build_object(
        'hitPoints', v_change -> 'hitPoints',
        'tempHp', v_change -> 'tempHp',
        'deathSaves', jsonb_build_object(
          'successes', v_change #> '{deathSaves,successes}',
          'failures', v_change #> '{deathSaves,failures}'),
        'usedSpellSlots', v_slots,
        'conditions', v_conditions
      );

      IF p_scope = 'session' AND v_campaign_type = 'long' THEN
        -- A visible condition or an unrelated resource edit must not initialize
        -- values that were absent from an incomplete or recovered sheet.
        SELECT coalesce(jsonb_object_agg(field, v_resources -> resource), '{}'::jsonb)
        INTO v_patch FROM (VALUES
          ('temp_hp', 'tempHp'), ('death_saves', 'deathSaves'), ('usedSpellSlots', 'usedSpellSlots')
        ) AS fields(field, resource)
        WHERE v_resources -> resource IS DISTINCT FROM v_previous_resources -> resource;
        IF v_patch <> '{}'::jsonb OR v_resources -> 'hitPoints' IS DISTINCT FROM v_previous_resources -> 'hitPoints' THEN
          INSERT INTO session_live_private.sheet_writes VALUES (txid_current(), v_id);
          UPDATE public.campaign_characters SET
            hit_points = CASE WHEN v_resources -> 'hitPoints' IS DISTINCT FROM v_previous_resources -> 'hitPoints'
              THEN (v_resources ->> 'hitPoints')::integer ELSE hit_points END,
            rules_snapshot = CASE WHEN v_patch <> '{}'::jsonb
              THEN coalesce(rules_snapshot, '{}'::jsonb) || v_patch ELSE rules_snapshot END,
            updated_at = greatest(clock_timestamp(), updated_at + interval '1 millisecond')
          WHERE id = v_id;
          DELETE FROM session_live_private.sheet_writes WHERE transaction_id = txid_current() AND character_id = v_id;
        END IF;
      ELSIF p_scope <> 'session' THEN
        SELECT jsonb_agg(CASE WHEN e ->> v_match_id_field = v_id::text AND (p_scope <> 'torneo' OR e ->> 'type' = 'pc')
          THEN session_live_private.merge_tracker_resources(e, v_resources) ELSE e END ORDER BY ord)
        INTO v_match_entries
        FROM jsonb_array_elements(v_match_state -> v_match_field) WITH ORDINALITY entry(e, ord);
        v_match_state := jsonb_set(v_match_state, ARRAY[v_match_field], v_match_entries);
      END IF;

      UPDATE public.session_live_characters SET resources = v_resources, updated_at = clock_timestamp()
        WHERE scope = p_scope AND context_id = p_context_id AND character_id = v_id;
    END LOOP;

    IF p_scope = 'torneo' THEN
      UPDATE public.torneo_matches SET initiative_snapshot = v_match_state, initiative_updated_at = clock_timestamp()
        WHERE id = p_context_id;
    ELSIF p_scope = 'torneo2' THEN
      UPDATE public.torneo2_matches SET combat_state = v_match_state, combat_seq = combat_seq + 1,
        combat_origin = 'session-live', combat_updated_at = clock_timestamp() WHERE id = p_context_id;
    END IF;
  END IF;

  RETURN public.session_live_gm_state(p_scope, p_context_id);
END
$$;

REVOKE ALL ON FUNCTION public.session_live_gm_state(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.session_live_command(text, uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.session_live_gm_state(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_live_command(text, uuid, uuid, text, jsonb) TO authenticated;

CREATE FUNCTION session_live_private.close_context()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_scope text := TG_ARGV[0];
BEGIN
  UPDATE session_live_private.contexts SET active = false, revision = revision + 1
    WHERE scope = v_scope AND context_id = old.id AND active;
  UPDATE public.session_live_characters SET active = false, updated_at = clock_timestamp()
    WHERE scope = v_scope AND context_id = old.id AND active;
  RETURN NULL;
END
$$;

CREATE TRIGGER session_live_close_session AFTER UPDATE OF status, dm_id ON public.sessions
  FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status AND new.status <> 'scheduled')
    OR old.dm_id IS DISTINCT FROM new.dm_id)
  EXECUTE FUNCTION session_live_private.close_context('session');
CREATE TRIGGER session_live_close_match AFTER UPDATE OF status, initiative_snapshot ON public.torneo_matches
  FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status AND new.status IN ('pending', 'completed'))
    OR (new.initiative_snapshot IS NULL AND old.initiative_snapshot IS NOT NULL))
  EXECUTE FUNCTION session_live_private.close_context('torneo');
CREATE TRIGGER session_live_close_match2 AFTER UPDATE OF status, combat_state ON public.torneo2_matches
  FOR EACH ROW WHEN ((old.status = 'active' AND new.status <> 'active')
    OR (new.combat_state IS NULL AND old.combat_state IS NOT NULL))
  EXECUTE FUNCTION session_live_private.close_context('torneo2');
CREATE TRIGGER session_live_delete_session AFTER DELETE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION session_live_private.close_context('session');
CREATE TRIGGER session_live_delete_match AFTER DELETE ON public.torneo_matches
  FOR EACH ROW EXECUTE FUNCTION session_live_private.close_context('torneo');
CREATE TRIGGER session_live_delete_match2 AFTER DELETE ON public.torneo2_matches
  FOR EACH ROW EXECUTE FUNCTION session_live_private.close_context('torneo2');

-- Ending the tournament live session or replacing a station's match releases
-- the roster lock even when the match itself has not been completed.
CREATE FUNCTION session_live_private.close_inactive_stations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_scope text := TG_ARGV[0];
  v_retained uuid[] := '{}'::uuid[];
  v_released uuid[];
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.status = 'live' THEN
    v_retained := array_remove(ARRAY[NEW.station1_match_id, NEW.station2_match_id], NULL);
  END IF;
  v_released := ARRAY(SELECT DISTINCT station FROM unnest(ARRAY[OLD.station1_match_id, OLD.station2_match_id]) station
    WHERE station IS NOT NULL AND station <> ALL (v_retained));
  UPDATE session_live_private.contexts SET active = false, revision = revision + 1
    WHERE scope = v_scope AND context_id = ANY (v_released) AND active;
  UPDATE public.session_live_characters SET active = false, updated_at = clock_timestamp()
    WHERE scope = v_scope AND context_id = ANY (v_released) AND active;
  RETURN NULL;
END
$$;
CREATE TRIGGER session_live_release_stations
  AFTER UPDATE OF status, station1_match_id, station2_match_id OR DELETE ON public.torneo_live_sessions
  FOR EACH ROW EXECUTE FUNCTION session_live_private.close_inactive_stations('torneo');
CREATE TRIGGER session_live_release_stations2
  AFTER UPDATE OF status, station1_match_id, station2_match_id OR DELETE ON public.torneo2_live_sessions
  FOR EACH ROW EXECUTE FUNCTION session_live_private.close_inactive_stations('torneo2');

CREATE FUNCTION session_live_private.unassign()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.session_live_characters SET active = false, updated_at = clock_timestamp()
    WHERE character_id = old.id AND active;
  RETURN NULL;
END
$$;
CREATE TRIGGER session_live_unassign AFTER UPDATE OF assigned_to ON public.campaign_characters
  FOR EACH ROW WHEN (old.assigned_to IS DISTINCT FROM new.assigned_to)
  EXECUTE FUNCTION session_live_private.unassign();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_live_characters;
  END IF;
END
$$;

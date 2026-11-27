-- Review access to live resources is limited to sessions in the private demo.
-- The existing live RPCs still require the actor to be the actual session DM.
CREATE FUNCTION session_live_private.gm_role_allowed(p_scope text, p_context_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND (
        p.role IN ('gm', 'admin')
        OR (
          p.role = 'player' AND p_scope = 'session'
          AND EXISTS (
            SELECT 1 FROM public.sessions AS s
            JOIN public.campaigns AS c ON c.id = s.campaign_id
            WHERE s.id = p_context_id
              AND c.id::text = auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id'
              AND c.gm_id = p.id AND NOT c.is_public
          )
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION session_live_private.gm_role_allowed(text, uuid) FROM PUBLIC, anon, authenticated;

-- Preserve the existing live RPC contracts and command processing. Only the
-- role checks now include a review account scoped to its private session.
CREATE OR REPLACE FUNCTION public.session_live_gm_state(p_scope text, p_context_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_gm uuid := session_live_private.context_gm(p_scope, p_context_id);
  v_ctx session_live_private.contexts%ROWTYPE;
BEGIN
  SELECT * INTO v_ctx FROM session_live_private.contexts WHERE scope = p_scope AND context_id = p_context_id;
  IF NOT session_live_private.gm_role_allowed(p_scope, p_context_id)
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

CREATE OR REPLACE FUNCTION public.session_live_command(
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
    OR NOT session_live_private.gm_role_allowed(p_scope, p_context_id)
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

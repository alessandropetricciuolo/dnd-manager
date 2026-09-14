BEGIN;

-- The audit object id is domain-generic (Wiki, asset, map, mission, encounter),
-- so it cannot remain a foreign key to wiki_entities.
ALTER TABLE public.mcp_write_audit DROP CONSTRAINT IF EXISTS mcp_write_audit_entity_id_fkey;

DROP POLICY IF EXISTS "GM and Admin can manage guilds" ON public.campaign_guilds;
CREATE POLICY "Campaign GM can manage guilds" ON public.campaign_guilds FOR ALL TO authenticated
USING (public.can_manage_campaign_as_gm(campaign_id)) WITH CHECK (public.can_manage_campaign_as_gm(campaign_id));
DROP POLICY IF EXISTS "GM and Admin can manage missions" ON public.campaign_missions;
CREATE POLICY "Campaign GM can manage missions" ON public.campaign_missions FOR ALL TO authenticated
USING (public.can_manage_campaign_as_gm(campaign_id)) WITH CHECK (public.can_manage_campaign_as_gm(campaign_id));

DROP POLICY IF EXISTS "Mission encounters visible to GM and admin" ON public.mission_encounters;
DROP POLICY IF EXISTS "GM and Admin can manage mission encounters" ON public.mission_encounters;
CREATE POLICY "Campaign GM can read mission encounters" ON public.mission_encounters FOR SELECT TO authenticated USING (public.can_manage_campaign_as_gm(campaign_id));
CREATE POLICY "Campaign GM can manage mission encounters" ON public.mission_encounters FOR ALL TO authenticated USING (public.can_manage_campaign_as_gm(campaign_id)) WITH CHECK (public.can_manage_campaign_as_gm(campaign_id));

DROP POLICY IF EXISTS "Mission encounter monsters visible to GM and admin" ON public.mission_encounter_monsters;
DROP POLICY IF EXISTS "GM and Admin can manage mission encounter monsters" ON public.mission_encounter_monsters;
CREATE POLICY "Campaign GM can read mission encounter monsters" ON public.mission_encounter_monsters FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.mission_encounters me WHERE me.id=encounter_id AND public.can_manage_campaign_as_gm(me.campaign_id)));
CREATE POLICY "Campaign GM can manage mission encounter monsters" ON public.mission_encounter_monsters FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.mission_encounters me WHERE me.id=encounter_id AND public.can_manage_campaign_as_gm(me.campaign_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.mission_encounters me WHERE me.id=encounter_id AND public.can_manage_campaign_as_gm(me.campaign_id)));

CREATE OR REPLACE FUNCTION mcp_private.prevent_duplicate_mission_title() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.campaign_id::text || ':' || lower(btrim(NEW.title)),0));
  IF EXISTS (SELECT 1 FROM public.campaign_missions m WHERE m.campaign_id=NEW.campaign_id AND lower(btrim(m.title))=lower(btrim(NEW.title)) AND m.id<>NEW.id)
  THEN RAISE EXCEPTION 'duplicate mission title' USING ERRCODE='23505'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION mcp_private.prevent_duplicate_mission_title() FROM PUBLIC;
CREATE TRIGGER mcp_mission_unique_title BEFORE INSERT OR UPDATE OF title ON public.campaign_missions FOR EACH ROW EXECUTE FUNCTION mcp_private.prevent_duplicate_mission_title();

CREATE OR REPLACE FUNCTION mcp_private.audit_write() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data record; object_revision integer;
BEGIN
  IF TG_OP='DELETE' THEN row_data:=OLD; ELSE row_data:=NEW; END IF;
  object_revision:=CASE WHEN TG_TABLE_NAME='wiki_entities' THEN (to_jsonb(row_data)->>'mcp_revision')::integer ELSE NULL END;
  INSERT INTO public.mcp_write_audit(actor_id,campaign_id,entity_id,action,revision)
  VALUES(auth.uid(),row_data.campaign_id,row_data.id,TG_TABLE_NAME||'.'||lower(TG_OP),object_revision);
  RETURN row_data;
END $$;
REVOKE ALL ON FUNCTION mcp_private.audit_write() FROM PUBLIC;
CREATE TRIGGER mcp_mission_audit AFTER INSERT OR UPDATE OR DELETE ON public.campaign_missions FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();
CREATE TRIGGER mcp_mission_encounter_audit AFTER INSERT OR UPDATE OR DELETE ON public.mission_encounters FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();
CREATE TRIGGER mcp_exploration_mission_link_audit AFTER UPDATE OF linked_mission_id ON public.campaign_exploration_maps FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();
CREATE TRIGGER mcp_scene_mission_link_audit AFTER UPDATE OF linked_mission_id ON public.campaign_scene_documents FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_write();

COMMIT;

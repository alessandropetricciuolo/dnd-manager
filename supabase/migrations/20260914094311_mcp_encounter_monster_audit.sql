CREATE OR REPLACE FUNCTION mcp_private.audit_encounter_monster_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data record; campaign uuid;
BEGIN
  IF TG_OP='DELETE' THEN row_data:=OLD; ELSE row_data:=NEW; END IF;
  SELECT me.campaign_id INTO campaign FROM public.mission_encounters me WHERE me.id=row_data.encounter_id;
  -- Cascading encounter deletion is already represented by the parent audit.
  IF campaign IS NULL THEN RETURN row_data; END IF;
  INSERT INTO public.mcp_write_audit(actor_id,campaign_id,entity_id,action,revision)
  VALUES(auth.uid(),campaign,row_data.id,TG_TABLE_NAME||'.'||lower(TG_OP),NULL);
  RETURN row_data;
END $$;

REVOKE ALL ON FUNCTION mcp_private.audit_encounter_monster_write() FROM PUBLIC;
CREATE TRIGGER mcp_mission_encounter_monster_audit
AFTER INSERT OR UPDATE OR DELETE ON public.mission_encounter_monsters
FOR EACH ROW EXECUTE FUNCTION mcp_private.audit_encounter_monster_write();

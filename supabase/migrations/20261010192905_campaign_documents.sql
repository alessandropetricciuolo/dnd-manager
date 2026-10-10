-- A location, independent of Wiki kind and manual archived_at state.
ALTER TABLE public.wiki_entities ADD COLUMN is_campaign_document boolean NOT NULL DEFAULT false;
ALTER TABLE public.wiki_entities ADD CONSTRAINT campaign_document_is_admin_only CHECK (NOT is_campaign_document OR admin_only);
CREATE INDEX wiki_campaign_documents_idx ON public.wiki_entities (campaign_id, name) WHERE is_campaign_document;
COMMENT ON COLUMN public.wiki_entities.is_campaign_document IS 'Admin-only campaign reference document; excluded from normal Wiki lists. Independent of archived_at.';
CREATE POLICY "Campaign documents admin barrier" ON public.wiki_entities AS RESTRICTIVE FOR ALL TO public
USING (NOT is_campaign_document OR public.is_global_admin())
WITH CHECK (NOT is_campaign_document OR public.is_global_admin());

CREATE FUNCTION public.enforce_campaign_document_location() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_campaign_document) OR
     (TG_OP = 'UPDATE' AND OLD.is_campaign_document IS DISTINCT FROM NEW.is_campaign_document) THEN
    IF NOT public.is_global_admin() THEN
      RAISE EXCEPTION 'campaign_document_requires_admin' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_campaign_document_location() FROM PUBLIC;
CREATE TRIGGER wiki_campaign_document_location BEFORE INSERT OR UPDATE OF is_campaign_document
ON public.wiki_entities FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_document_location();

-- Existing indexed copies must become protected in the same transaction as a move.
-- The indexer's subsequent refresh also reads the source's admin_only flag.
CREATE FUNCTION public.protect_campaign_document_memory() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.is_campaign_document THEN
    UPDATE public.campaign_memory_chunks SET admin_only = true
    WHERE campaign_id = NEW.campaign_id AND source_type = 'wiki' AND source_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_campaign_document_memory() FROM PUBLIC;
CREATE TRIGGER wiki_protect_document_memory AFTER UPDATE OF is_campaign_document
ON public.wiki_entities FOR EACH ROW EXECUTE FUNCTION public.protect_campaign_document_memory();

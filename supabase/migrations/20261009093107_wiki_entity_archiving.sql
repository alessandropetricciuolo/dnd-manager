ALTER TABLE public.wiki_entities
  ADD COLUMN archived_at timestamptz;

COMMENT ON COLUMN public.wiki_entities.archived_at IS
  'Manual reversible Wiki archive state; independent of linked mission status.';

CREATE INDEX wiki_entities_campaign_archived_idx
  ON public.wiki_entities (campaign_id, archived_at);

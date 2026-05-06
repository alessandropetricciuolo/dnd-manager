-- Categorizzazione allegati "Archivio GM":
-- liberi oppure legati a una sezione wiki o a una missione.

ALTER TABLE public.gm_attachments
  ADD COLUMN IF NOT EXISTS link_kind text NOT NULL DEFAULT 'free';

ALTER TABLE public.gm_attachments
  ADD COLUMN IF NOT EXISTS wiki_section text;

ALTER TABLE public.gm_attachments
  ADD COLUMN IF NOT EXISTS linked_mission_id uuid REFERENCES public.campaign_missions(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gm_attachments_link_kind_check'
  ) THEN
    ALTER TABLE public.gm_attachments
      ADD CONSTRAINT gm_attachments_link_kind_check
      CHECK (link_kind IN ('free', 'wiki_section', 'mission'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gm_attachments_wiki_section_check'
  ) THEN
    ALTER TABLE public.gm_attachments
      ADD CONSTRAINT gm_attachments_wiki_section_check
      CHECK (
        wiki_section IS NULL
        OR wiki_section IN ('npc', 'monster', 'location', 'item', 'lore', 'pg')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gm_attachments_link_kind
  ON public.gm_attachments(campaign_id, link_kind);

CREATE INDEX IF NOT EXISTS idx_gm_attachments_linked_mission
  ON public.gm_attachments(linked_mission_id)
  WHERE linked_mission_id IS NOT NULL;

COMMENT ON COLUMN public.gm_attachments.link_kind IS
  'free = libero, wiki_section = legato a sezione wiki, mission = legato a missione.';

COMMENT ON COLUMN public.gm_attachments.wiki_section IS
  'Categoria wiki di riferimento (npc, monster, location, item, lore, pg).';

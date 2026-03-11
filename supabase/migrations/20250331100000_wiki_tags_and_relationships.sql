-- Wiki: tag liberi (array di stringhe)
ALTER TABLE wiki_entities
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Relazioni tra entità wiki (grafo worldbuilding)
CREATE TABLE IF NOT EXISTS wiki_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES wiki_entities(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES wiki_entities(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wiki_relationships_no_self CHECK (source_id <> target_id),
  CONSTRAINT wiki_relationships_unique UNIQUE (campaign_id, source_id, target_id, label)
);

CREATE INDEX IF NOT EXISTS idx_wiki_relationships_campaign
  ON wiki_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wiki_relationships_source
  ON wiki_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_wiki_relationships_target
  ON wiki_relationships(target_id);

ALTER TABLE wiki_relationships ENABLE ROW LEVEL SECURITY;

-- GM della campagna può gestire le relazioni
CREATE POLICY "GM can manage wiki_relationships"
  ON wiki_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = wiki_relationships.campaign_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = wiki_relationships.campaign_id
        AND (c.gm_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

-- I partecipanti alla campagna possono leggere (per eventuale vista grafo in sola lettura)
CREATE POLICY "Campaign participants can read wiki_relationships"
  ON wiki_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = wiki_relationships.campaign_id
        AND (c.gm_id = auth.uid() OR c.is_public OR EXISTS (
          SELECT 1 FROM campaign_members cm WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
        ))
    )
  );

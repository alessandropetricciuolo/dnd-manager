-- dm_id su sessions: DM che ha masterato la sessione (può essere diverso dal gm della campagna).
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS dm_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- type su campaigns: Oneshot, Quest, Long (per badge in UI).
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('oneshot', 'quest', 'long'));

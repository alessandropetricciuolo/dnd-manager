-- Barber & Dragons - D&D Campaign Manager
-- Initial database schema (Phase 1)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Auth)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('gm', 'player')) DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'player');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gm_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public campaigns are viewable by everyone"
  ON campaigns FOR SELECT
  USING (is_public = true OR gm_id = auth.uid());

CREATE POLICY "GMs can manage own campaigns"
  ON campaigns FOR ALL
  USING (gm_id = auth.uid());

-- ============================================
-- CAMPAIGN_MEMBERS (players in a campaign)
-- ============================================
CREATE TABLE campaign_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, player_id)
);

ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members visible to GM and members"
  ON campaign_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_members.campaign_id
      AND (c.gm_id = auth.uid() OR c.is_public)
    )
    OR player_id = auth.uid()
  );

CREATE POLICY "GM can manage members"
  ON campaign_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_members.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- SESSIONS
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')) DEFAULT 'scheduled',
  max_players INTEGER NOT NULL DEFAULT 6,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions visible to campaign GM and members"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id
      AND (c.gm_id = auth.uid() OR c.is_public OR EXISTS (
        SELECT 1 FROM campaign_members cm
        WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "GM can manage sessions"
  ON sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = sessions.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- SESSION_SIGNUPS (player booking)
-- ============================================
CREATE TABLE session_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'waitlist', 'cancelled')) DEFAULT 'confirmed',
  signed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

ALTER TABLE session_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signups visible to campaign participants"
  ON session_signups FOR SELECT
  USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_signups.session_id AND c.gm_id = auth.uid()
    )
  );

CREATE POLICY "Players can manage own signups"
  ON session_signups FOR ALL
  USING (player_id = auth.uid());

CREATE POLICY "GM can manage all signups for their sessions"
  ON session_signups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaigns c ON c.id = s.campaign_id
      WHERE s.id = session_signups.session_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- WIKI_ENTITIES (NPCs, Monsters, Items, Lore)
-- ============================================
CREATE TABLE wiki_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('npc', 'monster', 'item', 'location', 'lore')),
  name TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wiki_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wiki entities visible to campaign participants"
  ON wiki_entities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = wiki_entities.campaign_id
      AND (c.gm_id = auth.uid() OR c.is_public OR EXISTS (
        SELECT 1 FROM campaign_members cm
        WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "GM can manage wiki entities"
  ON wiki_entities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = wiki_entities.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- MAPS (images in Storage)
-- ============================================
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maps visible to campaign participants"
  ON maps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = maps.campaign_id
      AND (c.gm_id = auth.uid() OR c.is_public OR EXISTS (
        SELECT 1 FROM campaign_members cm
        WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "GM can manage maps"
  ON maps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = maps.campaign_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- MAP_PINS (clickable zones)
-- ============================================
CREATE TABLE map_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  x DECIMAL(5,4) NOT NULL CHECK (x >= 0 AND x <= 1),
  y DECIMAL(5,4) NOT NULL CHECK (y >= 0 AND y <= 1),
  link_map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
  link_entity_id UUID REFERENCES wiki_entities(id) ON DELETE SET NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT link_target CHECK (link_map_id IS NOT NULL OR link_entity_id IS NOT NULL)
);

ALTER TABLE map_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Map pins follow map access"
  ON map_pins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM maps m
      JOIN campaigns c ON c.id = m.campaign_id
      WHERE m.id = map_pins.map_id
      AND (c.gm_id = auth.uid() OR c.is_public OR EXISTS (
        SELECT 1 FROM campaign_members cm
        WHERE cm.campaign_id = c.id AND cm.player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "GM can manage map pins"
  ON map_pins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM maps m
      JOIN campaigns c ON c.id = m.campaign_id
      WHERE m.id = map_pins.map_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- EXPLORATIONS (player unlock visibility)
-- ============================================
CREATE TABLE explorations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES wiki_entities(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exploration_target CHECK (map_id IS NOT NULL OR entity_id IS NOT NULL)
);

ALTER TABLE explorations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view own explorations"
  ON explorations FOR SELECT
  USING (player_id = auth.uid());

CREATE POLICY "GMs can grant explorations"
  ON explorations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN maps m ON m.campaign_id = c.id
      WHERE m.id = explorations.map_id AND c.gm_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaigns c
      JOIN wiki_entities we ON we.campaign_id = c.id
      WHERE we.id = explorations.entity_id AND c.gm_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKET (for map images, avatars, etc.)
-- NOTE: eseguire separatamente se necessario
-- ============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('campaign-assets', 'campaign-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER wiki_entities_updated_at
  BEFORE UPDATE ON wiki_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER maps_updated_at
  BEFORE UPDATE ON maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


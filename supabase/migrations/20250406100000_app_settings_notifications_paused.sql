-- Impostazioni globali app (es. sospensione avvisi automatici per inserimenti massivi)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE app_settings IS 'Chiave-valore per impostazioni globali (solo admin).';

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Solo admin può leggere e aggiornare
CREATE POLICY "Admins can read app_settings"
  ON app_settings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update app_settings"
  ON app_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Valore iniziale: avvisi attivi (non sospesi)
INSERT INTO app_settings (key, value)
VALUES ('notifications_paused', 'false')
ON CONFLICT (key) DO NOTHING;

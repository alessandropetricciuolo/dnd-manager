-- Categorie per achievement (facilita selezione GM in fine sessione)
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Generale';

COMMENT ON COLUMN achievements.category IS 'Categoria per raggruppare achievement (es. Titoli di Fine Sessione, Combattimento, Generale).';

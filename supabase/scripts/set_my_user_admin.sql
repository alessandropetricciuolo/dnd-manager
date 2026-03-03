-- Imposta come admin il tuo utente (o tutti i profili se sei l'unico).
-- Esegui in Supabase → SQL Editor.

UPDATE profiles
SET role = 'admin';

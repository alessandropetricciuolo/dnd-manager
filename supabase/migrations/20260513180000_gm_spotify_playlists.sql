-- Playlist Spotify curate da admin, riproducibili nel GM screen (embed ufficiale)

CREATE TABLE public.gm_spotify_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  mood text NOT NULL DEFAULT '',
  spotify_playlist_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT gm_spotify_playlists_playlist_id_unique UNIQUE (spotify_playlist_id)
);

CREATE INDEX gm_spotify_playlists_created_at_idx ON public.gm_spotify_playlists (created_at DESC);
CREATE INDEX gm_spotify_playlists_mood_idx ON public.gm_spotify_playlists (lower(mood));

ALTER TABLE public.gm_spotify_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_spotify_playlists_select_gm_admin"
  ON public.gm_spotify_playlists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "gm_spotify_playlists_insert_admin"
  ON public.gm_spotify_playlists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "gm_spotify_playlists_update_admin"
  ON public.gm_spotify_playlists
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "gm_spotify_playlists_delete_admin"
  ON public.gm_spotify_playlists
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.gm_spotify_playlists IS 'Spotify playlist IDs for embed player; admin CRUD, GM read.';

-- Libreria audio globale (admin carica su R2; GM/admin leggono da GM screen)

CREATE TABLE public.gm_global_audio_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  audio_type text NOT NULL CHECK (audio_type IN ('music', 'sfx', 'atmosphere')),
  mood text NOT NULL DEFAULT '',
  storage_key text NOT NULL UNIQUE,
  public_url text NOT NULL,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX gm_global_audio_tracks_audio_type_idx ON public.gm_global_audio_tracks (audio_type);
CREATE INDEX gm_global_audio_tracks_mood_idx ON public.gm_global_audio_tracks (lower(mood));
CREATE INDEX gm_global_audio_tracks_created_at_idx ON public.gm_global_audio_tracks (created_at DESC);

ALTER TABLE public.gm_global_audio_tracks ENABLE ROW LEVEL SECURITY;

-- Lettura: GM e admin (sessione Supabase)
CREATE POLICY "gm_global_audio_tracks_select_gm_admin"
  ON public.gm_global_audio_tracks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  );

-- Scrittura: solo admin
CREATE POLICY "gm_global_audio_tracks_insert_admin"
  ON public.gm_global_audio_tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "gm_global_audio_tracks_update_admin"
  ON public.gm_global_audio_tracks
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

CREATE POLICY "gm_global_audio_tracks_delete_admin"
  ON public.gm_global_audio_tracks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.gm_global_audio_tracks IS 'Audio/music catalog uploaded by admins to R2; readable by all GMs in GM screen.';

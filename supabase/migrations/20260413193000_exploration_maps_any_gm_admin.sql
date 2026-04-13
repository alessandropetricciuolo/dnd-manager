-- Vista dall'alto FoW: qualsiasi GM/Admin può vedere e modificare mappe/regioni in ogni campagna.
-- Motivazione: il workflow richiede collaborazione tra GM/Admin, non solo GM proprietario campagna.

DROP POLICY IF EXISTS "exploration_maps_select_gm_admin" ON public.campaign_exploration_maps;
DROP POLICY IF EXISTS "exploration_maps_mutate_gm_admin" ON public.campaign_exploration_maps;
DROP POLICY IF EXISTS "exploration_fow_regions_select_gm_admin" ON public.campaign_exploration_fow_regions;
DROP POLICY IF EXISTS "exploration_fow_regions_mutate_gm_admin" ON public.campaign_exploration_fow_regions;

CREATE POLICY "exploration_maps_select_gm_admin"
  ON public.campaign_exploration_maps FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "exploration_maps_mutate_gm_admin"
  ON public.campaign_exploration_maps FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "exploration_fow_regions_select_gm_admin"
  ON public.campaign_exploration_fow_regions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  );

CREATE POLICY "exploration_fow_regions_mutate_gm_admin"
  ON public.campaign_exploration_fow_regions FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('gm', 'admin')
    )
  );

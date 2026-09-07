-- R6.9: make the tactical workspace grants explicit. RLS remains the
-- authorization boundary, while anon/Public receive no table or RPC access.

REVOKE ALL ON TABLE
  public.tactical_scenes,
  public.tactical_scene_revisions,
  public.tactical_scene_publications,
  public.tactical_scene_fow_runtime,
  public.tactical_scene_rollouts,
  public.tactical_scene_backfill_records
FROM anon;

REVOKE ALL ON TABLE
  public.tactical_scenes,
  public.tactical_scene_revisions,
  public.tactical_scene_publications,
  public.tactical_scene_fow_runtime,
  public.tactical_scene_rollouts,
  public.tactical_scene_backfill_records
FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.tactical_scenes,
  public.tactical_scene_revisions,
  public.tactical_scene_publications,
  public.tactical_scene_fow_runtime
TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.tactical_scene_rollouts,
  public.tactical_scene_backfill_records
TO authenticated;

REVOKE ALL ON FUNCTION public.save_tactical_scene_revision(UUID, INTEGER, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_tactical_scene_with_revision(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_tactical_scene(UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rollback_tactical_scene_publication(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_tactical_scene_fow_runtime(UUID, UUID, INTEGER, JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_tactical_scene_revision(UUID, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tactical_scene_with_revision(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_tactical_scene(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_tactical_scene_publication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_tactical_scene_fow_runtime(UUID, UUID, INTEGER, JSONB) TO authenticated;

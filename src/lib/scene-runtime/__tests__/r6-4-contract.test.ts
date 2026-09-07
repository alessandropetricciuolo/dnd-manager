import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createLocalWorkspaceScene } from "../workspace";
import { parseTacticalScene } from "../validate";

describe("R6.4 migration contract", () => {
  it("keeps tactical tables GM/Admin-only and enables runtime channels", () => {
    const sql = readFileSync("supabase/migrations/20260907120000_tactical_scene_publication_r6_4.sql", "utf8");
    for (const table of ["tactical_scenes", "tactical_scene_revisions", "tactical_scene_publications", "tactical_scene_fow_runtime"]) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
      assert.match(sql, new RegExp(`CREATE POLICY [^\\n]+ ON public\\.${table} FOR ALL TO authenticated`));
    }
    assert.match(sql, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.tactical_scene_publications/);
    assert.match(sql, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.tactical_scene_fow_runtime/);
    assert.doesNotMatch(sql, /user_metadata|service_role/i);
    assert.match(sql, /save_tactical_scene_revision[\s\S]+SECURITY INVOKER[\s\S]+FOR UPDATE[\s\S]+current_scene\.current_revision_no <> p_expected_revision_no/);
    assert.match(sql, /publish_tactical_scene[\s\S]+SECURITY INVOKER[\s\S]+revoked_at = now\(\)[\s\S]+INSERT INTO public\.tactical_scene_publications/);
    assert.match(sql, /update_tactical_scene_fow_runtime[\s\S]+revoked_at IS NULL/);
    assert.match(sql, /jsonb_set\(fow, '\{patches\}', '\[\]'::jsonb\)/);
    assert.match(sql, /\{overlay,published\}/);
    assert.match(sql, /\{overlay,draft\}/);
    assert.match(sql, /INSERT INTO public\.tactical_scene_fow_runtime[\s\S]+ON CONFLICT \(scene_id\)/);
    assert.match(sql, /create_tactical_scene_with_revision[\s\S]+INSERT INTO public\.tactical_scenes[\s\S]+INSERT INTO public\.tactical_scene_revisions/);
    assert.doesNotMatch(sql, /GRANT .* TO anon/);
  });

  it("accepts the materialized publication shape", () => {
    const scene = createLocalWorkspaceScene("campaign-1").draft;
    const publication = { ...scene, lifecycle: "live" as const, fow: { regions: [], patches: [] }, overlay: { draft: [], published: [] } };
    const result = parseTacticalScene(publication);
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.scene.fow.patches, []);
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, validate } from "../contracts";
import { executeMissionOperation } from "../missions";

const campaign_id = "11111111-1111-4111-8111-111111111111";
const campaignB_id = "55555555-5555-4555-8555-555555555555";
const mission_id = "22222222-2222-4222-8222-222222222222";
const wiki_id = "33333333-3333-4333-8333-333333333333";
const map_id = "77777777-7777-4777-8777-777777777777";
const scene_id = "88888888-8888-4888-8888-888888888888";

const wiki_b_id = "99999999-9999-4999-8999-999999999999";
const map_b_id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeeb";
const scene_b_id = "cccccccc-dddd-4eee-8fff-aaaaaaaaaaab";

test("mission contracts cover native CRUD, encounters, and resource links", () => {
  assert.equal(validate({ operation: "search_missions", args: { campaign_id, status: "open", limit: 50, mission_kind: "organization" } }).operation, "search_missions");
  assert.equal(validate({ operation: "search_missions", args: { campaign_id, mission_kind: "personal" } }).args.mission_kind, "personal");
  assert.equal(validate({ operation: "search_missions", args: { campaign_id, mission_kind: "all" } }).args.mission_kind, "all");
  assert.equal(validate({ operation: "create_mission", args: { campaign_id, grade: "C", title: "La Cripta", committente: "Egida", ubicazione: "Portico", paga: "100 mo", urgenza: "3 giorni", description: "Indagare", points_reward: 2 } }).operation, "create_mission");
  assert.equal(validate({ operation: "replace_encounter_monsters", args: { campaign_id, encounter_id: mission_id, monsters: [{ wiki_entity_id: campaign_id, quantity: 2 }] } }).operation, "replace_encounter_monsters");
  assert.equal(validate({ operation: "link_mission_resource", args: { campaign_id, mission_id, resource_type: "scene", resource_id: campaign_id } }).operation, "link_mission_resource");
  assert.equal(validate({ operation: "link_mission_resource", args: { campaign_id, mission_id, resource_type: "wiki", resource_id: wiki_id, unlink: true } }).args.unlink, true);
  assert.equal(validate({ operation: "link_mission_resource", args: { campaign_id, mission_id, resource_type: "wiki", resource_id: wiki_id, action: "unlink" } }).args.action, "unlink");
  assert.equal(validate({ operation: "list_mission_resources", args: { campaign_id, mission_id, limit: 10, offset: 0 } }).operation, "list_mission_resources");
});

test("mission contracts handle personal mission rules", () => {
  // Personal mission requires only title and description
  const personalValid = validate({
    operation: "create_mission",
    args: {
      campaign_id,
      title: "Missione Privata",
      description: "Note riservate",
      mission_kind: "personal",
    },
  });
  assert.equal(personalValid.args.mission_kind, "personal");

  // Personal mission rejects positive points_reward
  assert.throws(
    () =>
      validate({
        operation: "create_mission",
        args: {
          campaign_id,
          title: "Missione Privata",
          description: "Note",
          mission_kind: "personal",
          points_reward: 5,
        },
      }),
    ApiError
  );

  // Organization mission still requires legacy fields (e.g. grade)
  assert.throws(
    () =>
      validate({
        operation: "create_mission",
        args: {
          campaign_id,
          title: "Manca il grado",
          description: "Desc",
          mission_kind: "organization",
        },
      }),
    ApiError
  );
});

test("mission contracts reject stale-write omissions and invalid destructive payloads", () => {
  for (const raw of [
    { operation: "update_mission", args: { campaign_id, mission_id, title: "Nuovo" } },
    { operation: "set_mission_status", args: { campaign_id, mission_id, expected_updated_at: "now", status: "completed" } },
    { operation: "complete_mission", args: { campaign_id, mission_id, expected_updated_at: "now", treasure_gp: -1 } },
    { operation: "replace_encounter_monsters", args: { campaign_id, encounter_id: mission_id, monsters: [{ wiki_entity_id: campaign_id, quantity: 0 }] } },
  ]) assert.throws(() => validate(raw), ApiError);
});

function createMockSupabase(initialData?: {
  missions?: Array<Record<string, unknown>>;
  guilds?: Array<Record<string, unknown>>;
  wiki?: Array<Record<string, unknown>>;
  maps?: Array<Record<string, unknown>>;
  scenes?: Array<Record<string, unknown>>;
}) {
  const missions = [...(initialData?.missions ?? [])];
  const guilds = [...(initialData?.guilds ?? [])];
  const wiki = [...(initialData?.wiki ?? [])];
  const maps = [...(initialData?.maps ?? [])];
  const scenes = [...(initialData?.scenes ?? [])];

  const db: any = {
    from(table: string) {
      const currentTable: Array<Record<string, unknown>> =
        table === "campaign_missions"
          ? missions
          : table === "campaign_guilds"
            ? guilds
            : table === "wiki_entities"
              ? wiki
              : table === "campaign_exploration_maps"
                ? maps
                : table === "campaign_scene_documents"
                  ? scenes
                  : [];

      const filters: Record<string, unknown> = {};
      let ilikeFilter: { col: string; val: string } | null = null;
      let limitCount: number | null = null;
      let rangeOffset = 0;
      let updatePayload: Record<string, unknown> | null = null;
      let insertPayload: Record<string, unknown> | null = null;
      let isDelete = false;

      const queryBuilder: any = {
        select: (_cols?: string) => queryBuilder,
        eq: (col: string, val: unknown) => {
          filters[col] = val;
          return queryBuilder;
        },
        ilike: (col: string, val: string) => {
          ilikeFilter = { col, val };
          return queryBuilder;
        },
        order: (_col: string, _opts?: { ascending?: boolean }) => queryBuilder,
        range: (from: number, to: number) => {
          rangeOffset = from;
          limitCount = to - from + 1;
          return queryBuilder;
        },
        limit: (n: number) => {
          limitCount = n;
          return queryBuilder;
        },
        update: (payload: Record<string, unknown>) => {
          updatePayload = payload;
          return queryBuilder;
        },
        insert: (payload: Record<string, unknown>) => {
          insertPayload = payload;
          return queryBuilder;
        },
        delete: () => {
          isDelete = true;
          return queryBuilder;
        },
        maybeSingle: async () => {
          if (isDelete) {
            const rowsToDelete = applyFilters();
            for (const r of rowsToDelete) {
              const idx = currentTable.indexOf(r);
              if (idx >= 0) currentTable.splice(idx, 1);
            }
            return { data: rowsToDelete[0] ?? null, error: null };
          }
          if (updatePayload) {
            const rowsToUpdate = applyFilters();
            for (const r of rowsToUpdate) {
              Object.assign(r, updatePayload);
            }
            return { data: rowsToUpdate[0] ?? null, error: null };
          }
          const rows = applyFilters();
          return { data: rows[0] ?? null, error: null };
        },
        single: async () => {
          if (insertPayload) {
            const row = {
              id: (insertPayload.id as string) || "generated-id-" + Math.random().toString(36).slice(2, 8),
              ...insertPayload,
            };
            currentTable.push(row);
            return { data: row, error: null };
          }
          const rows = applyFilters();
          if (rows.length === 0) return { data: null, error: { message: "Not found" } };
          return { data: rows[0], error: null };
        },
        then: (resolve: (res: { data: unknown; error: unknown }) => unknown) => {
          if (isDelete) {
            const rowsToDelete = applyFilters();
            for (const r of rowsToDelete) {
              const idx = currentTable.indexOf(r);
              if (idx >= 0) currentTable.splice(idx, 1);
            }
            return Promise.resolve({ data: rowsToDelete, error: null }).then(resolve);
          }
          if (updatePayload) {
            const rowsToUpdate = applyFilters();
            for (const r of rowsToUpdate) {
              Object.assign(r, updatePayload);
            }
            return Promise.resolve({ data: rowsToUpdate, error: null }).then(resolve);
          }
          const filtered = applyFilters();
          const paged =
            limitCount != null ? filtered.slice(rangeOffset, rangeOffset + limitCount) : filtered;
          return Promise.resolve({ data: paged, error: null }).then(resolve);
        },
      };

      function applyFilters() {
        return currentTable.filter((row) => {
          for (const [k, v] of Object.entries(filters)) {
            if (row[k] !== v) return false;
          }
          if (ilikeFilter) {
            const cell = String(row[ilikeFilter.col] ?? "").toLowerCase();
            const pattern = ilikeFilter.val.toLowerCase();
            if (cell !== pattern) return false;
          }
          return true;
        });
      }

      return queryBuilder;
    },
  };

  return { db, missions, wiki, maps, scenes, guilds };
}

test("executeMissionOperation handles personal mission creation, search, update, and linking", async () => {
  const existingOrgMission = {
    id: mission_id,
    campaign_id,
    mission_kind: "organization",
    title: "Bacheca Egida",
    description: "Missione pubblica",
    grade: "D",
    committente: "Egida",
    ubicazione: "Città",
    paga: "10 mo",
    urgenza: "Bassa",
    status: "open",
    points_reward: 1,
    treasure_gp: 10,
    treasure_sp: 0,
    treasure_cp: 0,
    updated_at: "2026-11-04T12:00:00.000Z",
    created_at: "2026-11-04T12:00:00.000Z",
  };

  const { db, missions, wiki, maps, scenes } = createMockSupabase({
    missions: [existingOrgMission],
    wiki: [
      {
        id: wiki_id,
        campaign_id,
        name: "PNG Segreto",
        type: "npc",
        linked_mission_id: null,
      },
      {
        id: wiki_b_id,
        campaign_id: campaignB_id,
        name: "PNG Campagna B",
        type: "npc",
        linked_mission_id: null,
      },
    ],
    maps: [
      {
        id: map_id,
        campaign_id,
        floor_label: "Piano Terra A",
        linked_mission_id: null,
      },
      {
        id: map_b_id,
        campaign_id: campaignB_id,
        floor_label: "Mappa B",
        linked_mission_id: null,
      },
    ],
    scenes: [
      {
        id: scene_id,
        campaign_id,
        name: "Scena A",
        linked_mission_id: null,
      },
      {
        id: scene_b_id,
        campaign_id: campaignB_id,
        name: "Scena B",
        linked_mission_id: null,
      },
    ],
  });

  // 1. Create personal mission
  const created = await executeMissionOperation(db, "create_mission", {
    campaign_id,
    title: "Trama Oscura",
    description: "Appunti riservati al master",
    mission_kind: "personal",
  });
  assert.equal(created.mission.mission_kind, "personal");
  assert.equal(created.mission.points_reward, 0);
  assert.equal(created.mission.title, "Trama Oscura");

  const personalId = created.mission.id;

  // 2. Search missions with default kind -> returns only organization
  const defaultSearch = await executeMissionOperation(db, "search_missions", { campaign_id });
  assert.equal(defaultSearch.missions.length, 1);
  assert.equal(defaultSearch.missions[0].id, mission_id);
  assert.equal(defaultSearch.mission_kind, "organization");

  // Search personal missions -> returns only personal
  const personalSearch = await executeMissionOperation(db, "search_missions", {
    campaign_id,
    mission_kind: "personal",
  });
  assert.equal(personalSearch.missions.length, 1);
  assert.equal(personalSearch.missions[0].id, personalId);
  assert.equal(personalSearch.mission_kind, "personal");

  // Search all missions -> returns both
  const allSearch = await executeMissionOperation(db, "search_missions", {
    campaign_id,
    mission_kind: "all",
  });
  assert.equal(allSearch.missions.length, 2);

  // 3. Duplicate title rejection
  await assert.rejects(
    executeMissionOperation(db, "create_mission", {
      campaign_id,
      title: "Trama Oscura",
      description: "Duplicato",
      mission_kind: "personal",
    }),
    /already exists/
  );

  // 4. Update with concurrency token check
  // Mismatched token throws 409
  await assert.rejects(
    executeMissionOperation(db, "update_mission", {
      campaign_id,
      mission_id: personalId,
      expected_updated_at: "2020-01-01T00:00:00.000Z",
      title: "Titolo Nuovo",
    }),
    /Mission changed: read it again/
  );

  // Valid token updates title and preserves invariants
  const updated = await executeMissionOperation(db, "update_mission", {
    campaign_id,
    mission_id: personalId,
    expected_updated_at: created.mission.updated_at,
    title: "Trama Oscura Risolta",
  });
  assert.equal(updated.mission.title, "Trama Oscura Risolta");
  assert.equal(updated.mission.points_reward, 0);

  // 5. Cross-Campaign Resource Linking Rejection:
  // Authorized request on Campaign A, mission in Campaign A, but resource belongs to Campaign B.
  // The linking must fail and the resource in Campaign B must remain unmodified!
  for (const item of [
    { type: "wiki", id: wiki_b_id, list: wiki },
    { type: "exploration_map", id: map_b_id, list: maps },
    { type: "scene", id: scene_b_id, list: scenes },
  ] as const) {
    await assert.rejects(
      executeMissionOperation(db, "link_mission_resource", {
        campaign_id,
        mission_id: personalId,
        resource_type: item.type,
        resource_id: item.id,
      }),
      (err: unknown) => err instanceof ApiError && err.status === 404,
      `Cross-campaign link rejection for ${item.type} must fail with 404`
    );
    const target = item.list.find((r) => r.id === item.id);
    assert.equal(target?.linked_mission_id, null, `Resource ${item.type} in Campaign B must remain untouched`);
  }

  // Valid linking within Campaign A for Wiki, Map, Scene
  const linkWiki = await executeMissionOperation(db, "link_mission_resource", {
    campaign_id,
    mission_id: personalId,
    resource_type: "wiki",
    resource_id: wiki_id,
  });
  assert.equal(linkWiki.action, "link");
  assert.equal(wiki.find((w) => w.id === wiki_id)?.linked_mission_id, personalId);

  const linkMap = await executeMissionOperation(db, "link_mission_resource", {
    campaign_id,
    mission_id: personalId,
    resource_type: "exploration_map",
    resource_id: map_id,
  });
  assert.equal(linkMap.action, "link");
  assert.equal(maps.find((m) => m.id === map_id)?.linked_mission_id, personalId);

  const linkScene = await executeMissionOperation(db, "link_mission_resource", {
    campaign_id,
    mission_id: personalId,
    resource_type: "scene",
    resource_id: scene_id,
  });
  assert.equal(linkScene.action, "link");
  assert.equal(scenes.find((s) => s.id === scene_id)?.linked_mission_id, personalId);

  // 6. Cross-Mission Unlinking Protection:
  // Unlink referencing a DIFFERENT mission in Campaign A must NOT wipe out the existing link!
  await assert.rejects(
    executeMissionOperation(db, "link_mission_resource", {
      campaign_id,
      mission_id, // mission_id is the other mission in Campaign A, but wiki_id is linked to personalId!
      resource_type: "wiki",
      resource_id: wiki_id,
      unlink: true,
    }),
    (err: unknown) => err instanceof ApiError && err.status === 404,
    "Unlink with mismatched mission_id must fail"
  );
  // Verify wiki_id remains linked to personalId!
  assert.equal(
    wiki.find((w) => w.id === wiki_id)?.linked_mission_id,
    personalId,
    "Existing link must NOT be wiped when unlink references a different mission"
  );

  // 7. List mission resources
  const listed = await executeMissionOperation(db, "list_mission_resources", {
    campaign_id,
    mission_id: personalId,
  });
  assert.equal(listed.resources.length, 3);
  assert.equal(listed.mission_kind, "personal");

  // 8. Correct unlinking with the matching mission_id
  const unlinkRes = await executeMissionOperation(db, "link_mission_resource", {
    campaign_id,
    mission_id: personalId,
    resource_type: "wiki",
    resource_id: wiki_id,
    unlink: true,
  });
  assert.equal(unlinkRes.action, "unlink");
  assert.equal(wiki.find((w) => w.id === wiki_id)?.linked_mission_id, null);

  // 9. Personal mission complete and reopen (no points, no guild)
  const completed = await executeMissionOperation(db, "complete_mission", {
    campaign_id,
    mission_id: personalId,
    expected_updated_at: updated.mission.updated_at,
  });
  assert.equal(completed.mission.status, "completed");
  assert.equal(completed.mission.points_reward, 0);
  assert.equal(completed.mission.completed_by_guild_id, null);

  const reopened = await executeMissionOperation(db, "reopen_mission", {
    campaign_id,
    mission_id: personalId,
    expected_updated_at: completed.mission.updated_at,
  });
  assert.equal(reopened.mission.status, "open");
  assert.equal(reopened.mission.completed_at, null);
});

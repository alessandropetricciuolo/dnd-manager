import assert from "node:assert/strict";
import test from "node:test";
import {
  getMobileCampaignWikiEntityDetail,
  getMobileCampaignWikiIndex,
  type MobileWikiCampaignRow,
  type MobileWikiDependencies,
  type RawCampaignMapRow,
  type RawWikiEntityRow,
  type RawWikiRelationshipRow,
} from "../wiki-service";

const CAMP_LONG_ID = "d9962add-4d55-42ef-bfd7-96eddfe49969";
const CAMP_QUEST_ID = "11111111-2222-4333-8444-555555555555";
const CAMP_DEMO_ID = "22222222-3333-4444-8555-666666666666";

const ENT_PUBLIC_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const ENT_SECRET_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const ENT_ADMIN_ID = "cccccccc-3333-4333-8333-333333333333";
const ENT_DOC_ID = "dddddddd-4444-4444-8444-444444444444";
const MAP_PUBLIC_ID = "eeeeeeee-5555-4555-8555-555555555555";

function createFixtureDeps(overrides?: Partial<MobileWikiDependencies>): MobileWikiDependencies {
  const campaigns: Record<string, MobileWikiCampaignRow> = {
    [CAMP_LONG_ID]: {
      id: CAMP_LONG_ID,
      name: "Eldaria",
      type: "long",
      gm_id: "gm-1",
      is_public: true,
    },
    [CAMP_QUEST_ID]: {
      id: CAMP_QUEST_ID,
      name: "Cripta del Corvo",
      type: "quest",
      gm_id: "gm-1",
      is_public: true,
    },
    [CAMP_DEMO_ID]: {
      id: CAMP_DEMO_ID,
      name: "Demo Store Review",
      type: "long",
      gm_id: "review-gm-user",
      is_public: false,
    },
  };

  const entities: RawWikiEntityRow[] = [
    {
      id: ENT_PUBLIC_ID,
      campaign_id: CAMP_LONG_ID,
      name: "Locanda della Sirena",
      type: "location",
      content: { body: "Una locanda sul porto.", description: "Ritrovo dei marinai." },
      attributes: {
        loot: "Forziere nascosto 500 MO",
        gm_notes: "Il locandiere è una spia",
        relationships: "Paga tributo alla Gilda",
      },
      visibility: "public",
      admin_only: false,
      is_campaign_document: false,
      archived_at: null,
    },
    {
      id: ENT_SECRET_ID,
      campaign_id: CAMP_LONG_ID,
      name: "Basilisco Abissale",
      type: "monster",
      content: { body: "Creatura delle profondità." },
      attributes: {
        statblock: "**Morso** +7",
        combat_stats: { hp: "110", ac: "16", cr: "6", attacks: "Morso 2d10+4" },
        gm_notes: "Fugge sotto 20 PF",
      },
      visibility: "secret",
      is_secret: true,
      admin_only: false,
      is_campaign_document: false,
      archived_at: null,
    },
    {
      id: ENT_ADMIN_ID,
      campaign_id: CAMP_LONG_ID,
      name: "Trama Finale Solo Admin",
      type: "lore",
      content: { body: "Bozza riservata ad Alessandro." },
      attributes: { gm_notes: "Top secret" },
      visibility: "secret",
      is_secret: true,
      admin_only: true,
      is_campaign_document: false,
      archived_at: null,
    },
    {
      id: ENT_DOC_ID,
      campaign_id: CAMP_LONG_ID,
      name: "Appunti Regia Capitolo 4",
      type: "lore",
      content: { body: "Scaletta sessione." },
      attributes: {},
      visibility: "secret",
      is_secret: true,
      admin_only: true,
      is_campaign_document: true,
      archived_at: null,
    },
    {
      id: "ffffffff-6666-4666-8666-666666666666",
      campaign_id: CAMP_QUEST_ID,
      name: "Custode della Cripta",
      type: "npc",
      content: { body: "PNG della Quest." },
      attributes: { gm_notes: "Consegna la chiave" },
      visibility: "secret",
      is_secret: true,
      admin_only: false,
      is_campaign_document: false,
      archived_at: null,
    },
  ];

  const maps: RawCampaignMapRow[] = [
    {
      id: MAP_PUBLIC_ID,
      campaign_id: CAMP_LONG_ID,
      name: "Portico",
      image_url: "/maps/portico.png",
      map_type: "city",
      visibility: "public",
      wiki_entity_id: ENT_PUBLIC_ID,
      admin_only: false,
    },
  ];

  const relationships: RawWikiRelationshipRow[] = [
    {
      id: "rel-1",
      campaign_id: CAMP_LONG_ID,
      source_id: ENT_PUBLIC_ID,
      target_map_id: MAP_PUBLIC_ID,
      label: "Si trova in",
    },
    {
      id: "rel-secret",
      campaign_id: CAMP_LONG_ID,
      source_id: ENT_PUBLIC_ID,
      target_id: ENT_SECRET_ID,
      label: "Nasconde nei sotterranei",
    },
    {
      id: "rel-admin",
      campaign_id: CAMP_LONG_ID,
      source_id: ENT_PUBLIC_ID,
      target_id: ENT_ADMIN_ID,
      label: "Collegata al finale",
    },
  ];

  return {
    authenticateBearer: async (token: string) => {
      if (token === "tok-player") return { id: "player-1", appMetadata: {} };
      if (token === "tok-gm") return { id: "gm-1", appMetadata: {} };
      if (token === "tok-admin") return { id: "admin-1", appMetadata: {} };
      if (token === "tok-review-gm") {
        return {
          id: "review-gm-user",
          appMetadata: { review_gm_campaign_id: CAMP_DEMO_ID },
        };
      }
      return null;
    },
    getProfileRole: async (userId: string) => {
      if (userId === "admin-1") return "admin";
      if (userId === "gm-1") return "gm";
      return "player";
    },
    getCampaign: async (campaignId: string) => campaigns[campaignId] ?? null,
    isCampaignMember: async (campaignId: string, userId: string) =>
      campaignId === CAMP_LONG_ID && userId === "player-1",
    fetchPlayerPermissions: async () => ({
      permittedWikiIds: new Set(),
      permittedMapIds: new Set(),
    }),
    fetchPlayerExplorations: async () => ({
      unlockedWikiIds: new Set(),
      unlockedMapIds: new Set(),
    }),
    listCampaignWikiEntities: async ({ campaignId }) =>
      entities.filter((e) => e.campaign_id === campaignId),
    listCampaignMaps: async ({ campaignId }) =>
      maps.filter((m) => m.campaign_id === campaignId),
    getWikiEntityById: async (campaignId, entityId) =>
      entities.find((e) => e.campaign_id === campaignId && e.id === entityId) ?? null,
    listEntityRelationships: async (campaignId, entityId) =>
      relationships.filter(
        (r) =>
          r.campaign_id === campaignId &&
          (r.source_id === entityId || r.target_id === entityId),
      ),
    listMinimalWikiTargetsByIds: async (campaignId, ids) =>
      entities.filter((e) => e.campaign_id === campaignId && ids.includes(e.id)),
    ...overrides,
  };
}

test("Player in Long campaign receives only public entries, stripped attributes, and no secret relationships", async () => {
  const deps = createFixtureDeps();
  const idx = await getMobileCampaignWikiIndex(
    CAMP_LONG_ID,
    "tok-player",
    { includeAdminOnly: true, includeDocuments: true },
    deps,
  );
  assert.equal(idx.status, 200);
  const items = idx.body.entities as Array<Record<string, unknown>>;
  assert.equal(items.length, 1);
  assert.equal(items[0].id, ENT_PUBLIC_ID);
  assert.equal("monster_combat_preview" in items[0], false);
  assert.equal("documents" in idx.body, false);

  const detail = await getMobileCampaignWikiEntityDetail(
    CAMP_LONG_ID,
    ENT_PUBLIC_ID,
    "tok-player",
    { includeAdminOnly: true },
    deps,
  );
  assert.equal(detail.status, 200);
  const entity = detail.body.entity as any;
  assert.deepEqual(entity.attributes, {});
  assert.equal(entity.relations.length, 1);
  assert.equal(entity.relations[0].targetId, MAP_PUBLIC_ID);

  // Secret entity returns 404 to Player
  const secretDetail = await getMobileCampaignWikiEntityDetail(
    CAMP_LONG_ID,
    ENT_SECRET_ID,
    "tok-player",
    {},
    deps,
  );
  assert.equal(secretDetail.status, 404);
});

test("Player is blocked from non-Long Quest wiki, while GM accesses Quest & Long secrets without seeing Admin-only", async () => {
  const deps = createFixtureDeps();
  const playerQuest = await getMobileCampaignWikiIndex(CAMP_QUEST_ID, "tok-player", {}, deps);
  assert.equal(playerQuest.status, 403);

  const gmQuest = await getMobileCampaignWikiIndex(CAMP_QUEST_ID, "tok-gm", {}, deps);
  assert.equal(gmQuest.status, 200);
  assert.equal((gmQuest.body.entities as any[]).length, 1);

  const gmLong = await getMobileCampaignWikiIndex(
    CAMP_LONG_ID,
    "tok-gm",
    { includeAdminOnly: true, includeDocuments: true },
    deps,
  );
  assert.equal(gmLong.status, 200);
  const gmIds = (gmLong.body.entities as any[]).map((e) => e.id);
  assert.deepEqual(gmIds, [ENT_PUBLIC_ID, ENT_SECRET_ID]);
  assert.equal("documents" in gmLong.body, false);

  // GM attempting to read Admin-only or Campaign Document gets uniform 404
  const gmAdminTry = await getMobileCampaignWikiEntityDetail(
    CAMP_LONG_ID,
    ENT_ADMIN_ID,
    "tok-gm",
    { includeAdminOnly: true },
    deps,
  );
  assert.equal(gmAdminTry.status, 404);

  const gmDocTry = await getMobileCampaignWikiEntityDetail(
    CAMP_LONG_ID,
    ENT_DOC_ID,
    "tok-gm",
    { includeAdminOnly: true },
    deps,
  );
  assert.equal(gmDocTry.status, 404);
});

test("Admin omits Admin-only by default and unlocks Admin-only + Campaign Documents on explicit opt-in", async () => {
  const deps = createFixtureDeps();

  const defaultIdx = await getMobileCampaignWikiIndex(CAMP_LONG_ID, "tok-admin", {}, deps);
  assert.equal(defaultIdx.status, 200);
  assert.deepEqual(
    (defaultIdx.body.entities as any[]).map((e) => e.id),
    [ENT_PUBLIC_ID, ENT_SECRET_ID],
  );
  assert.deepEqual(defaultIdx.body.documents, []);

  const optInIdx = await getMobileCampaignWikiIndex(
    CAMP_LONG_ID,
    "tok-admin",
    { includeAdminOnly: true, includeDocuments: true },
    deps,
  );
  assert.equal(optInIdx.status, 200);
  assert.deepEqual(
    (optInIdx.body.entities as any[]).map((e) => e.id),
    [ENT_PUBLIC_ID, ENT_SECRET_ID, ENT_ADMIN_ID],
  );
  assert.equal((optInIdx.body.documents as any[]).length, 1);
  assert.equal((optInIdx.body.documents as any[])[0].id, ENT_DOC_ID);

  const docDetail = await getMobileCampaignWikiEntityDetail(
    CAMP_LONG_ID,
    ENT_DOC_ID,
    "tok-admin",
    {},
    deps,
  );
  assert.equal(docDetail.status, 200);
});

test("Review GM account can access only its assigned demo campaign and gets 404 on other campaigns", async () => {
  const deps = createFixtureDeps();

  const allowed = await getMobileCampaignWikiIndex(CAMP_DEMO_ID, "tok-review-gm", {}, deps);
  assert.equal(allowed.status, 200);
  assert.equal((allowed.body.viewer as any).canReadGmContent, true);
  assert.equal((allowed.body.viewer as any).isAdmin, false);

  const rejected = await getMobileCampaignWikiIndex(CAMP_LONG_ID, "tok-review-gm", {}, deps);
  assert.equal(rejected.status, 404);
});

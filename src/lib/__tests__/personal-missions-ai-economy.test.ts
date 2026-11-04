import test from "node:test";
import assert from "node:assert/strict";
import {
  syncMissionToCampaignMemory,
  reindexCampaignMemory,
} from "../campaign-memory-indexer";
import {
  applyCloseSessionEconomy,
} from "../actions/campaign-economy-actions";

test("AI memory indexer excludes personal missions and purges residual chunks", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const campaignId = "11111111-1111-4111-8111-111111111111";
  const orgMissionId = "22222222-2222-4222-8222-222222222222";
  const personalMissionId = "33333333-3333-4333-8333-333333333333";

  const deletedSources: Array<{ campaignId: string; sourceType: string; sourceId: string }> = [];
  const upsertedChunks: Array<{ campaignId: string; sourceType: string; sourceId: string; count: number }> = [];

  const fakeAdminClient: any = {
    from(table: string) {
      const q: any = {};
      q.select = (_cols?: string) => q;
      q.eq = (col: string, val: any) => {
        q[col] = val;
        return q;
      };
      q.order = () => q;
      q.maybeSingle = async () => {
        if (table === "campaigns") {
          return { data: { id: campaignId, type: "long", name: "Campagna Long", updated_at: "2026-11-04" }, error: null };
        }
        if (table === "campaign_missions") {
          if (q.id === personalMissionId) {
            return {
              data: {
                id: personalMissionId,
                campaign_id: campaignId,
                mission_kind: "personal",
                title: "Trama Riservata",
                description: "Note segrete",
                points_reward: 0,
                status: "open",
                updated_at: "2026-11-04T12:00:00Z",
              },
              error: null,
            };
          }
          if (q.id === orgMissionId) {
            return {
              data: {
                id: orgMissionId,
                campaign_id: campaignId,
                mission_kind: "organization",
                grade: "B",
                title: "Missione Egida",
                committente: "Gilda",
                ubicazione: "Foresta",
                paga: "50 mo",
                urgenza: "Media",
                description: "Caccia ai mostri",
                points_reward: 3,
                status: "open",
                updated_at: "2026-11-04T12:00:00Z",
              },
              error: null,
            };
          }
        }
        return { data: null, error: null };
      };
      q.delete = () => {
        return {
          eq: (col1: string, val1: any) => ({
            eq: (col2: string, val2: any) => ({
              eq: (col3: string, val3: any) => {
                deletedSources.push({ campaignId: val1, sourceType: val2, sourceId: val3 });
                return Promise.resolve({ error: null });
              },
            }),
          }),
        };
      };
      q.upsert = (rows: any[]) => {
        if (rows.length > 0) {
          upsertedChunks.push({
            campaignId: rows[0].campaign_id,
            sourceType: rows[0].source_type,
            sourceId: rows[0].source_id,
            count: rows.length,
          });
        }
        return Promise.resolve({ error: null });
      };
      q.insert = q.upsert;
      q.then = (resolve: any) => {
        if (table === "campaign_missions") {
          return Promise.resolve({
            data: [
              {
                id: orgMissionId,
                campaign_id: campaignId,
                mission_kind: "organization",
                grade: "B",
                title: "Missione Egida",
                description: "Caccia ai mostri",
                points_reward: 3,
                status: "open",
                updated_at: "2026-11-04T12:00:00Z",
              },
              {
                id: personalMissionId,
                campaign_id: campaignId,
                mission_kind: "personal",
                title: "Trama Riservata",
                description: "Note segrete",
                points_reward: 0,
                status: "open",
                updated_at: "2026-11-04T12:00:00Z",
              },
            ],
            error: null,
          }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      };
      return q;
    },
  };

  try {
    // 1. Single sync of personal mission:
    // Must purge residual chunks and MUST NOT upsert any chunks
    await syncMissionToCampaignMemory(fakeAdminClient, personalMissionId);
    assert.equal(deletedSources.length, 1);
    assert.equal(deletedSources[0].sourceId, personalMissionId);
    assert.equal(upsertedChunks.filter((c) => c.sourceId === personalMissionId).length, 0);

    // 2. Single sync of organization mission:
    // Must upsert memory chunks
    await syncMissionToCampaignMemory(fakeAdminClient, orgMissionId);
    assert.equal(upsertedChunks.some((c) => c.sourceId === orgMissionId), true);

    // 3. Full campaign reindex:
    // Personal mission is purged, Organization mission chunks are indexed
    deletedSources.length = 0;
    upsertedChunks.length = 0;
    await reindexCampaignMemory(fakeAdminClient, campaignId);

    assert.equal(
      deletedSources.some((d) => d.sourceType === "mission" && d.sourceId === personalMissionId),
      true,
      "Personal mission residual chunks purged during reindex"
    );
    assert.equal(
      upsertedChunks.some((c) => c.sourceType === "mission" && c.sourceId === orgMissionId),
      true,
      "Organization mission chunks maintained during reindex"
    );
    assert.equal(
      upsertedChunks.some((c) => c.sourceType === "mission" && c.sourceId === personalMissionId),
      false,
      "Personal mission must never produce shared AI chunks"
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  }
});

test("Economy actions reject personal mission payouts and treasure sets", async () => {
  const campaignId = "11111111-1111-4111-8111-111111111111";
  const personalMissionId = "33333333-3333-4333-8333-333333333333";

  const fakeAdminClient: any = {
    from(table: string) {
      const q: any = {};
      q.select = () => q;
      q.eq = (col: string, val: any) => {
        q[col] = val;
        return q;
      };
      q.single = async () => {
        if (table === "campaign_missions" && q.id === personalMissionId) {
          return {
            data: {
              id: personalMissionId,
              campaign_id: campaignId,
              mission_kind: "personal",
              status: "completed",
              treasure_gp: 0,
              treasure_sp: 0,
              treasure_cp: 0,
            },
            error: null,
          };
        }
        return { data: null, error: { message: "Not found" } };
      };
      return q;
    },
  };

  // applyCloseSessionEconomy with personal mission payout must be rejected
  const payoutResult = await applyCloseSessionEconomy(fakeAdminClient, campaignId, {
    missionTreasurePayout: {
      missionId: personalMissionId,
      allocations: [{ characterId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", coins_gp: 50 }],
    },
  });

  assert.equal(payoutResult.success, false);
  assert.match(payoutResult.message, /fuori Egida non prevedono tesoretti/);
});

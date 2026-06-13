/**
 * Rimuove artifact E2E dalla campagna long sandbox (wiki e sessioni di test AI).
 *
 * Uso:
 *   npm run e2e:cleanup-artifacts
 *   PLAYWRIGHT_BASE_URL=https://dnd-manager-j8h5.vercel.app npm run e2e:cleanup-artifacts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createSupabaseAdminClient } from "../src/utils/supabase/admin";
import { deleteCampaignMemorySource } from "../src/lib/campaign-memory-indexer";
import { CAMPAIGN_NAMES } from "./e2e-provision-campaigns";
import { isProductionE2ETarget, loadEnvLocal } from "./e2e-env";

const WIKI_NAME_PREFIX = "E2E AI";
const SESSION_NOTES_PREFIX = "E2E Live";

function resolveLongCampaignId(admin: ReturnType<typeof createSupabaseAdminClient>): string | null {
  try {
    const credPath = path.join(process.cwd(), "tests/e2e/.auth/credentials.json");
    const cred = JSON.parse(readFileSync(credPath, "utf8")) as { campaigns?: { longId?: string } };
    if (cred.campaigns?.longId) return cred.campaigns.longId;
  } catch {
    // credentials opzionali in CI
  }
  return null;
}

export async function cleanupLongCampaignArtifacts(): Promise<{
  campaignId: string | null;
  wikiRemoved: number;
  sessionsRemoved: number;
}> {
  loadEnvLocal();
  const admin = createSupabaseAdminClient();

  let campaignId = resolveLongCampaignId(admin);
  if (!campaignId) {
    const { data } = await admin
      .from("campaigns")
      .select("id")
      .eq("name", CAMPAIGN_NAMES.long)
      .maybeSingle();
    campaignId = data?.id ?? null;
  }

  if (!campaignId) {
    console.log("[e2e:cleanup-artifacts] campagna long E2E non trovata — skip");
    return { campaignId: null, wikiRemoved: 0, sessionsRemoved: 0 };
  }

  const { data: wikiRows } = await admin
    .from("wiki_entities")
    .select("id, name")
    .eq("campaign_id", campaignId)
    .ilike("name", `${WIKI_NAME_PREFIX}%`);

  for (const row of wikiRows ?? []) {
    await deleteCampaignMemorySource(admin, campaignId, "wiki", row.id);
  }

  const wikiIds = (wikiRows ?? []).map((r) => r.id);
  let wikiRemoved = 0;
  if (wikiIds.length > 0) {
    const { data: deletedWiki } = await admin
      .from("wiki_entities")
      .delete()
      .eq("campaign_id", campaignId)
      .in("id", wikiIds)
      .select("id");
    wikiRemoved = deletedWiki?.length ?? 0;
  }

  const { data: sessionRows } = await admin
    .from("sessions")
    .select("id, notes")
    .eq("campaign_id", campaignId)
    .ilike("notes", `${SESSION_NOTES_PREFIX}%`);

  for (const row of sessionRows ?? []) {
    await deleteCampaignMemorySource(admin, campaignId, "session_summary", row.id);
    await deleteCampaignMemorySource(admin, campaignId, "session_note", row.id);
  }

  const sessionIds = (sessionRows ?? []).map((r) => r.id);
  let sessionsRemoved = 0;
  if (sessionIds.length > 0) {
    const { data: deletedSessions } = await admin
      .from("sessions")
      .delete()
      .eq("campaign_id", campaignId)
      .in("id", sessionIds)
      .select("id");
    sessionsRemoved = deletedSessions?.length ?? 0;
  }

  return { campaignId, wikiRemoved, sessionsRemoved };
}

async function main() {
  const force = process.env.E2E_CLEANUP_ARTIFACTS === "1";
  const onProd = isProductionE2ETarget();

  if (!onProd && !force) {
    console.log(
      "[e2e:cleanup-artifacts] skip — target non produzione. Usa PLAYWRIGHT_BASE_URL Vercel o E2E_CLEANUP_ARTIFACTS=1"
    );
    return;
  }

  const { campaignId, wikiRemoved, sessionsRemoved } = await cleanupLongCampaignArtifacts();
  if (!campaignId) return;

  console.log(
    `[e2e:cleanup-artifacts] campagna ${campaignId}: ${wikiRemoved} wiki, ${sessionsRemoved} sessioni rimosse`
  );
}

main().catch((err) => {
  console.error("[e2e:cleanup-artifacts] errore:", err);
  process.exit(1);
});

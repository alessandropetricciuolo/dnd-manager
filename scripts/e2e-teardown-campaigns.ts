/**
 * Dopo test E2E su produzione: rende private le campagne sandbox create dal provisioning.
 *
 * Uso manuale:
 *   npm run e2e:teardown
 *   PLAYWRIGHT_BASE_URL=https://barberanddragons.com npm run e2e:teardown
 *
 * Viene invocato automaticamente da global-teardown Playwright solo su produzione.
 */
import { createSupabaseAdminClient } from "../src/utils/supabase/admin";
import { E2E_CAMPAIGN_NAME_PREFIX } from "./e2e-provision-campaigns";
import { isProductionE2ETarget, loadEnvLocal } from "./e2e-env";

/** Solo campagne create dal provisioning E2E (prefisso nome), mai torneo/campagne reali. */
export async function privatizeE2ECampaigns(): Promise<{ updated: string[]; skipped: string[] }> {
  loadEnvLocal();
  const admin = createSupabaseAdminClient();

  const { data: rows, error } = await admin
    .from("campaigns")
    .select("id, name, is_public")
    .like("name", `${E2E_CAMPAIGN_NAME_PREFIX}%`);

  if (error) throw error;

  const updated: string[] = [];
  const skipped: string[] = [];

  for (const row of rows ?? []) {
    if (row.is_public === false) {
      skipped.push(row.name ?? row.id);
      continue;
    }

    const { data: patched, error: updateError } = await admin
      .from("campaigns")
      .update({ is_public: false } as never)
      .eq("id", row.id)
      .select("id, name")
      .maybeSingle();

    if (updateError) {
      console.error(`[e2e:teardown] errore campagna ${row.id}:`, updateError.message);
      continue;
    }

    if (patched?.id) {
      updated.push(patched.name ?? patched.id);
      console.log(`[e2e:teardown] privata: ${patched.name ?? patched.id}`);
    }
  }

  return { updated, skipped };
}

async function main() {
  const force = process.env.E2E_TEARDOWN_PRIVATE === "1";
  const onProd = isProductionE2ETarget();

  if (!onProd && !force) {
    console.log(
      "[e2e:teardown] skip — target non è produzione. Usa PLAYWRIGHT_BASE_URL=https://barberanddragons.com o E2E_TEARDOWN_PRIVATE=1"
    );
    return;
  }

  const { updated, skipped } = await privatizeE2ECampaigns();
  console.log(`[e2e:teardown] completato: ${updated.length} rese private, ${skipped.length} già private`);
}

main().catch((err) => {
  console.error("[e2e:teardown] errore:", err);
  process.exit(1);
});

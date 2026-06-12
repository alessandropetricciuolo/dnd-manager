/**
 * Crea o aggiorna gli account QA per Playwright (GM + Player).
 * Richiede .env.local con NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso: npm run e2e:provision
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createSupabaseAdminClient } from "../src/utils/supabase/admin";
import { provisionE2ECampaigns } from "./e2e-provision-campaigns";

const E2E_PASSWORD = process.env.E2E_PASSWORD?.trim() || "E2eBd2026!";

const E2E_USERS = [
  {
    key: "gm",
    email: process.env.E2E_GM_EMAIL?.trim() || "e2e-gm@barberandragons.qa",
    role: "gm" as const,
    firstName: "E2E",
    lastName: "GameMaster",
  },
  {
    key: "player",
    email: process.env.E2E_PLAYER_EMAIL?.trim() || "e2e-player@barberandragons.qa",
    role: "player" as const,
    firstName: "E2E",
    lastName: "Player",
  },
] as const;

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local opzionale se variabili già in ambiente
  }
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit?.id) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureE2EUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  spec: (typeof E2E_USERS)[number]
): Promise<string> {
  const existingId = await findUserIdByEmail(admin, spec.email);
  if (existingId) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: spec.role,
        first_name: spec.firstName,
        last_name: spec.lastName,
      } as never)
      .eq("id", existingId);
    if (profileError) throw profileError;

    const { error: pwdError } = await admin.auth.admin.updateUserById(existingId, {
      password: E2E_PASSWORD,
    });
    if (pwdError) throw pwdError;

    console.log(`[e2e:provision] aggiornato ${spec.role}: ${spec.email}`);
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: spec.email,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: spec.firstName,
      last_name: spec.lastName,
      role: spec.role,
    },
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error(`Utente creato senza id: ${spec.email}`);

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role: spec.role,
      first_name: spec.firstName,
      last_name: spec.lastName,
    } as never)
    .eq("id", data.user.id);
  if (profileError) throw profileError;

  console.log(`[e2e:provision] creato ${spec.role}: ${spec.email}`);
  return data.user.id;
}

async function main() {
  loadEnvLocal();

  const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim() || "testolone@gmail.com";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim() || "123456";

  const admin = createSupabaseAdminClient();
  const ids: Record<string, string> = {};

  for (const user of E2E_USERS) {
    ids[user.key] = await ensureE2EUser(admin, user);
  }

  const campaigns = await provisionE2ECampaigns(admin, ids.gm, ids.player);

  const authDir = resolve(process.cwd(), "tests/e2e/.auth");
  mkdirSync(authDir, { recursive: true });

  const credentials = {
    admin: { email: adminEmail, password: adminPassword },
    gm: { email: E2E_USERS[0].email, password: E2E_PASSWORD },
    player: { email: E2E_USERS[1].email, password: E2E_PASSWORD },
    userIds: ids,
    campaigns,
    provisionedAt: new Date().toISOString(),
  };

  writeFileSync(resolve(authDir, "credentials.json"), JSON.stringify(credentials, null, 2));
  console.log("[e2e:provision] credenziali salvate in tests/e2e/.auth/credentials.json");
  console.log(`  admin:  ${adminEmail}`);
  console.log(`  gm:     ${E2E_USERS[0].email}`);
  console.log(`  player: ${E2E_USERS[1].email}`);
  console.log(`  password (gm/player): ${E2E_PASSWORD}`);
}

main().catch((err) => {
  console.error("[e2e:provision] errore:", err);
  process.exit(1);
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvLocal() {
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

/** True se i test puntano a produzione Barber & Dragons. */
export function isProductionE2ETarget(baseURL?: string): boolean {
  const raw = (baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "").trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "").toLowerCase();
    return host === "barberanddragons.com";
  } catch {
    return false;
  }
}

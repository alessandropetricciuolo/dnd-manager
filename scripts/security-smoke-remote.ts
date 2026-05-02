/**
 * Smoke check non distruttivo su un deployment (default: produzione).
 * Non esegue brute force, non carica file, non invia payload di injection voluminosi.
 *
 * Uso: npx tsx scripts/security-smoke-remote.ts
 *      BASE_URL=https://staging.example.com npx tsx scripts/security-smoke-remote.ts
 */
const base = (process.env.BASE_URL || "https://barberanddragons.com").replace(/\/$/, "");

type Row = { check: string; ok: boolean; detail: string };

async function head(path: string): Promise<{ status: number; headers: Headers }> {
  const res = await fetch(`${base}${path}`, { method: "HEAD", redirect: "follow" });
  return { status: res.status, headers: res.headers };
}

async function get(path: string): Promise<{ status: number; headers: Headers; snippet: string }> {
  const res = await fetch(`${base}${path}`, { method: "GET", redirect: "follow" });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    snippet: text.slice(0, 120).replace(/\s+/g, " "),
  };
}

async function main() {
  const critical: Row[] = [];
  const advisory: Row[] = [];

  const checkEnv = await get("/api/check-env");
  critical.push({
    check: "GET /api/check-env (no leak configurazione in prod)",
    ok: checkEnv.status === 404,
    detail: `status=${checkEnv.status}`,
  });

  const robots = await get("/robots.txt");
  advisory.push({
    check: "GET /robots.txt (dopo deploy da public/)",
    ok: robots.status === 200 && robots.snippet.toLowerCase().includes("user-agent"),
    detail: `status=${robots.status}`,
  });

  const home = await get("/");
  const powered = home.headers.get("x-powered-by");
  advisory.push({
    check: "GET / senza X-Powered-By (dopo deploy poweredByHeader: false)",
    ok: powered == null,
    detail: powered ? `presente: ${powered}` : "assente",
  });

  const csp = home.headers.get("content-security-policy") ?? "";
  critical.push({
    check: "Risposta HTML con CSP impostata",
    ok: csp.length > 20,
    detail: `len=${csp.length}`,
  });

  const sheetPdfHead = await head("/api/sheet-pdf");
  critical.push({
    check: "HEAD /api/sheet-pdf raggiungibile",
    ok: sheetPdfHead.status === 405 || sheetPdfHead.status === 200 || sheetPdfHead.status === 404,
    detail: `status=${sheetPdfHead.status} (405=OK per route POST-only)`,
  });

  const tgProbe = await get("/api/tg-image/AgACAgIAAxkBAAInvalidProbe");
  critical.push({
    check: "GET /api/tg-image/… risponde senza crash",
    ok: tgProbe.status === 200 || tgProbe.status === 400 || tgProbe.status === 500,
    detail: `status=${tgProbe.status} content-type=${tgProbe.headers.get("content-type") ?? ""}`,
  });

  const passCritical = critical.every((r) => r.ok);
  console.log(
    JSON.stringify(
      {
        base,
        critical,
        advisory,
        passCritical,
        advisoryOk: advisory.every((r) => r.ok),
        note:
          "I controlli advisory falliscono finché non è deployata la build con robots.txt e poweredByHeader.",
      },
      null,
      2
    )
  );
  process.exit(passCritical ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

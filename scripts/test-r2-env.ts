/**
 * Verifica R2: legge .env.local dalla root del progetto e esegue HeadBucket.
 * Non stampa mai secret o access key.
 *
 * Uso: npx tsx scripts/test-r2-env.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

function loadEnvLocal(): void {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) {
    console.error("File .env.local non trovato nella root del progetto.");
    process.exit(1);
  }
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key.startsWith("R2_")) {
      process.env[key] = val;
    } else if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const required = [
    "R2_BUCKET",
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ] as const;
  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    console.error("Variabili R2 mancanti o vuote in .env.local:", missing.join(", "));
    process.exit(1);
  }

  const bucket = process.env.R2_BUCKET!.trim();
  let endpoint = process.env.R2_ENDPOINT!.trim();
  if (!endpoint.startsWith("https://")) {
    const stripped = endpoint.replace(/^https?:\/\//i, "").replace(/\.r2\.cloudflarestorage\.com.*$/i, "");
    const accountFromEndpoint = /^[a-f0-9]{32}$/i.test(stripped) ? stripped : stripped.split(".")[0] ?? stripped;
    if (!/^[a-f0-9]{32}$/i.test(accountFromEndpoint)) {
      console.error(
        "ERRORE: R2_ENDPOINT deve essere https://<ACCOUNT_ID>.r2.cloudflarestorage.com oppure solo i 32 caratteri dell'Account ID."
      );
      process.exit(1);
    }
    endpoint = `https://${accountFromEndpoint}.r2.cloudflarestorage.com`;
    console.warn("Nota: R2_ENDPOINT normalizzato in URL completo S3.");
  }
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!.trim();

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (accountId) {
    const expectedHost = `${accountId}.r2.cloudflarestorage.com`;
    if (!endpoint.includes(expectedHost)) {
      console.warn(
        `Avviso: R2_ENDPOINT non contiene "${expectedHost}". Controlla che coincida con R2_ACCOUNT_ID.`
      );
    }
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`OK — credenziali valide. Bucket "${bucket}" raggiungibile (HeadBucket 200).`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ERRORE — HeadBucket fallito:", msg);
    process.exit(1);
  }

  const pub = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (pub) {
    console.log(`OK — R2_PUBLIC_BASE_URL impostato (${pub.length} caratteri, non mostrato per intero).`);
  } else {
    console.log("Nota: R2_PUBLIC_BASE_URL vuoto (serve per URL pubblici nel browser, non per questo test API).");
  }
}

void main();

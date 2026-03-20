import { NextResponse } from "next/server";

/**
 * Debug temporaneo: verifica cosa Vercel espone a `process.env` (solo metadati, mai valori segreti).
 *
 * Uso produzione: imposta `DEBUG_ENV_SECRET` su Vercel (stringa casuale), redeploy, poi:
 *   GET /api/debug-env?secret=<stesso valore>
 *
 * Senza `DEBUG_ENV_SECRET` configurato → sempre 404 (endpoint disabilitato).
 * **Elimina questo file dopo il debug.**
 */
export const dynamic = "force-dynamic"; // Evita la cache di Vercel

export async function GET(request: Request) {
  const expected = process.env.DEBUG_ENV_SECRET?.trim();
  const provided = new URL(request.url).searchParams.get("secret")?.trim();
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // NON stampare il valore reale della chiave per sicurezza!
  // Stampa solo se esiste e la sua lunghezza, più l'ambiente attuale.

  const hfKey = process.env.HUGGINGFACE_API_KEY;
  const hfToken = process.env.HF_TOKEN;

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV || "non definito",
    has_huggingface_key: !!hfKey,
    huggingface_key_length: hfKey ? hfKey.length : 0,
    has_hf_token: !!hfToken,
    hf_token_length: hfToken ? hfToken.length : 0,
    all_keys_starting_with_h: Object.keys(process.env).filter((k) =>
      k.toLowerCase().startsWith("h")
    ),
  });
}

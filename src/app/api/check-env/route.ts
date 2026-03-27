import { NextResponse } from "next/server";

/**
 * Route temporanea per verificare che le variabili Supabase siano caricate.
 * Apri http://localhost:3001/api/check-env (o la tua porta).
 * Elimina questo file quando tutto funziona.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url ? "impostata" : "MANCANTE",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? "impostata" : "MANCANTE",
    ok: !!(url && anonKey),
  });
}

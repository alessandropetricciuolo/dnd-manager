import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hfKey = process.env.HUGGINGFACE_API_KEY;

  return NextResponse.json({
    status: "Sonda Attiva",
    environment: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV || "non definito",
    has_huggingface_key: !!hfKey,
    key_length: hfKey ? hfKey.length : 0,
    first_chars: hfKey ? hfKey.substring(0, 3) : "N/A",
  });
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  getDefaultImageProvider,
  listImageProviders,
} from "@/lib/ai/image-provider";

/**
 * Espone l'elenco dei provider immagine e quali sono effettivamente configurati
 * (chiave API presente) + il default lato server. Non restituisce MAI segreti.
 *
 * Accesso riservato ad utenti autenticati con ruolo `gm` o `admin`, in linea con
 * le altre server actions di generazione AI.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    default: getDefaultImageProvider(),
    providers: listImageProviders(),
  });
}

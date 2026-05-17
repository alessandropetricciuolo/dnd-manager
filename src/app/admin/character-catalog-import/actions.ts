"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  runCharacterCatalogImport,
  type CatalogJsonFile,
  type CatalogImportRunResult,
} from "@/lib/character-catalog/import-catalog-json.server";

export type ImportCharacterCatalogActionResult =
  | { success: true; result: CatalogImportRunResult }
  | { success: false; error: string };

export async function importCharacterCatalogJsonAction(
  jsonText: string
): Promise<ImportCharacterCatalogActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Non autenticato." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { success: false, error: "Solo gli amministratori possono importare nel catalogo PG." };
  }

  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { success: false, error: "Incolla un JSON non vuoto." };
  }

  let parsed: CatalogJsonFile;
  try {
    parsed = JSON.parse(trimmed) as CatalogJsonFile;
  } catch {
    return { success: false, error: "JSON non valido (errore di sintassi)." };
  }

  try {
    const result = await runCharacterCatalogImport(parsed, { mode: "admin" });
    revalidatePath("/admin/character-catalog-import");
    return { success: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore durante l’import.";
    return { success: false, error: msg };
  }
}

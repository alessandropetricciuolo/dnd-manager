import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AiAssistantArtifact } from "./contracts";
import { actionForArtifact, buildArtifactActionInput, executeAssistantArtifactAction } from "./action-bridge";
import { previewAction } from "@/modules/command-center/actions";

type PersistError = { code?: unknown; message?: unknown };

export function assistantSaveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const message = (error as PersistError).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Salvataggio non riuscito.";
}

function isMissingSaveReservationColumns(error: unknown): boolean {
  const candidate = error as PersistError | null;
  return candidate?.code === "PGRST204" &&
    typeof candidate.message === "string" &&
    /save_action_name|save_started_at/i.test(candidate.message);
}
export async function previewAssistantArtifactSave(artifact: AiAssistantArtifact, actionName?: string) {
  if (!artifact.campaignId) throw new Error("Seleziona una campagna prima di salvare.");
  const resolvedAction = actionName ?? actionForArtifact(artifact);
  const preview = await previewAction(resolvedAction, buildArtifactActionInput(artifact, resolvedAction), { actorType: "ai" });
  if (!preview.success) throw new Error(preview.error);
  return { actionName: resolvedAction, preview: preview.data };
}
export async function saveAssistantArtifact(supabase: SupabaseClient<Database>, artifact: AiAssistantArtifact, revision: number, actionName: string) {
  if (artifact.revision !== revision) throw new Error("La bozza è cambiata: ricarica la revisione corrente prima di salvare.");
  if (!artifact.campaignId) throw new Error("Seleziona una campagna prima di salvare.");
  if (actionName !== actionForArtifact(artifact)) throw new Error("L'action da confermare non corrisponde alla bozza preparata.");
  if (artifact.status === "saved" && artifact.savedEntity) return artifact.savedEntity;

  // Reserve the specific immutable revision before invoking the Action Registry.
  // This condition is the idempotency boundary for a double-click or retry.
  let reservation = await (supabase as any)
    .from("ai_assistant_artifacts")
    .update({ status: "saving", save_action_name: actionName, save_started_at: new Date().toISOString() })
    .eq("id", artifact.id)
    .eq("revision", revision)
    .in("status", ["draft", "ready_for_review", "approved", "failed"])
    .select("id")
    .maybeSingle();
  // Production can temporarily be one migration behind the application. The
  // reservation metadata is diagnostic only; preserve the idempotency state
  // transition until the additive columns reach the database.
  if (reservation.error && isMissingSaveReservationColumns(reservation.error)) {
    reservation = await (supabase as any)
      .from("ai_assistant_artifacts")
      .update({ status: "saving" })
      .eq("id", artifact.id)
      .eq("revision", revision)
      .in("status", ["draft", "ready_for_review", "approved", "failed"])
      .select("id")
      .maybeSingle();
  }
  if (reservation.error) throw reservation.error;
  if (!reservation.data) {
    const current = await (supabase as any)
      .from("ai_assistant_artifacts")
      .select("status, saved_entity")
      .eq("id", artifact.id)
      .eq("revision", revision)
      .maybeSingle();
    if (current.error) throw current.error;
    if (current.data?.status === "saved" && current.data.saved_entity) return current.data.saved_entity;
    if (current.data?.status === "saving") throw new Error("Il salvataggio è già in corso: attendi l'esito prima di riprovare.");
    throw new Error("La bozza è cambiata: ricarica la revisione corrente prima di salvare.");
  }

  try {
    const saved = await executeAssistantArtifactAction(artifact, actionName);
    const update = await (supabase as any)
      .from("ai_assistant_artifacts")
      .update({ status: "saved", saved_entity: saved })
      .eq("id", artifact.id)
      .eq("revision", revision)
      .eq("status", "saving")
      .select("*")
      .single();
    if (update.error) throw update.error;
    return saved;
  } catch (error) {
    await (supabase as any)
      .from("ai_assistant_artifacts")
      .update({ status: "failed" })
      .eq("id", artifact.id)
      .eq("revision", revision)
      .eq("status", "saving");
    throw error;
  }
}

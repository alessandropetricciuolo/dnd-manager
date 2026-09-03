import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AiAssistantArtifact } from "./contracts";
import { actionForArtifact, buildArtifactActionInput, executeAssistantArtifactAction } from "./action-bridge";
import { previewAction } from "@/modules/command-center/actions";
export async function previewAssistantArtifactSave(artifact: AiAssistantArtifact, actionName?: string) {
  if (!artifact.campaignId) throw new Error("Seleziona una campagna prima di salvare.");
  const resolvedAction = actionName ?? actionForArtifact(artifact);
  const preview = await previewAction(resolvedAction, buildArtifactActionInput(artifact, resolvedAction), { actorType: "ai" });
  if (!preview.success) throw new Error(preview.error);
  return { actionName: resolvedAction, preview: preview.data };
}
export async function saveAssistantArtifact(supabase: SupabaseClient<Database>, artifact: AiAssistantArtifact, revision: number, actionName: string) {
  if (artifact.revision !== revision) throw new Error("La bozza è cambiata: ricarica la revisione corrente prima di salvare."); if (!artifact.campaignId) throw new Error("Seleziona una campagna prima di salvare.");
  if (actionName !== actionForArtifact(artifact)) throw new Error("L'action da confermare non corrisponde alla bozza preparata.");
  const saved = await executeAssistantArtifactAction(artifact, actionName); const update = await (supabase as any).from("ai_assistant_artifacts").update({ status: "saved", saved_entity: saved }).eq("id", artifact.id).eq("revision", revision).select("*").single(); if (update.error) throw update.error; return saved;
}

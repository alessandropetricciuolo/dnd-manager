import { executeAction } from "@/modules/command-center/actions";
import { isAiDraftAllowedAction } from "@/modules/command-center/actions/action-catalog";
import type { AiAssistantArtifact } from "./contracts";
import { normalizeWikiArtifactActionInput } from "./wiki-artifact";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

const CANONICAL_SAVE_ACTIONS = new Set([
  "campaign.create", "campaign.update", "gm.note.create", "gm.note.update",
  "session.create", "session.update", "wiki.entity.create", "wiki.entity.update",
  "mission.create", "mission.update", "workspace.task.create",
  "character.create", "character.update",
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** The model may select an action, but never its transport shape. Each action
 * receives an explicit wrapper payload so missing required fields fail closed. */
export function buildArtifactActionInput(artifact: AiAssistantArtifact, actionName: string): Record<string, unknown> {
  const payload = record(artifact.payload);
  const supplied = record(payload.actionInput);
  const title = String(payload.title ?? supplied.title ?? "Bozza Assistente GM").trim();
  const content = String(payload.content ?? supplied.content ?? "");
  const campaignId = artifact.campaignId;
  if (!isAiDraftAllowedAction(actionName) || !CANONICAL_SAVE_ACTIONS.has(actionName)) throw new Error("Action di salvataggio non consentita per l'Assistente v2.");
  switch (actionName) {
    case "campaign.create": return { title, description: String(supplied.description ?? content), type: supplied.type, isPublic: false, playerPrimer: supplied.playerPrimer, imageUrl: supplied.imageUrl, tone: supplied.tone, gmNotes: supplied.gmNotes };
    case "campaign.update": return { campaignId, title, description: String(supplied.description ?? content), type: supplied.type };
    case "gm.note.create": return { campaignId, title, content, sessionId: supplied.sessionId };
    case "gm.note.update": return { noteId: supplied.noteId, title, content, sessionId: supplied.sessionId };
    case "workspace.task.create": return { campaignId, title, description: String(supplied.description ?? content), priority: supplied.priority, dueDate: supplied.dueDate, sessionId: supplied.sessionId };
    case "wiki.entity.create": case "wiki.entity.update": {
      const wiki = normalizeWikiArtifactActionInput(supplied);
      return {
        campaignId,
        ...(actionName === "wiki.entity.update" ? { entityId: wiki.entityId } : {}),
        title: wiki.title ?? title,
        type: wiki.type ?? "lore",
        content: wiki.content ?? content,
        visibility: wiki.visibility ?? "secret",
        ...(wiki.attributes !== undefined ? { attributes: wiki.attributes } : {}),
        ...(wiki.imageUrl !== undefined ? { imageUrl: wiki.imageUrl } : typeof payload.imageUrl === "string" ? { imageUrl: payload.imageUrl } : {}),
        ...(wiki.tags !== undefined ? { tags: wiki.tags } : {}),
        ...(wiki.audiences !== undefined ? { audiences: wiki.audiences } : {}),
        ...(wiki.relations !== undefined ? { relations: wiki.relations } : {}),
        ...(wiki.sortOrder !== undefined ? { sortOrder: wiki.sortOrder } : {}),
        ...(wiki.isCore !== undefined ? { isCore: wiki.isCore } : {}),
        ...(wiki.includeInCampaignAiMemory !== undefined ? { includeInCampaignAiMemory: wiki.includeInCampaignAiMemory } : {}),
        ...(wiki.linkedMissionId !== undefined ? { linkedMissionId: wiki.linkedMissionId } : {}),
        ...(wiki.xpValue !== undefined ? { xpValue: wiki.xpValue } : {}),
      };
    }
    case "mission.create": return { campaignId, grade: supplied.grade, title, committente: supplied.committente, ubicazione: supplied.ubicazione, paga: supplied.paga, urgenza: supplied.urgenza, description: String(supplied.description ?? content), pointsReward: supplied.pointsReward };
    case "mission.update": return { campaignId, missionId: supplied.missionId, grade: supplied.grade, title, committente: supplied.committente, ubicazione: supplied.ubicazione, paga: supplied.paga, urgenza: supplied.urgenza, description: String(supplied.description ?? content), pointsReward: supplied.pointsReward };
    case "session.create": return { campaignId, date: supplied.date, time: supplied.time, location: supplied.location, maxPlayers: supplied.maxPlayers, dmId: supplied.dmId, partyId: supplied.partyId, chapterTitle: supplied.chapterTitle };
    case "session.update": return { sessionId: supplied.sessionId, title, sessionSummary: supplied.sessionSummary ?? content, gmPrivateNotes: supplied.gmPrivateNotes };
    case "character.create": return {
      campaignId,
      name: supplied.name ?? title,
      characterClass: supplied.characterClass,
      classSubclass: supplied.classSubclass,
      level: supplied.level,
      background: supplied.background,
      raceSlug: supplied.raceSlug,
      subclass_slug: supplied.subclassSlug ?? supplied.subclass_slug,
      background_slug: supplied.backgroundSlug ?? supplied.background_slug,
      armorClass: supplied.armorClass,
      hitPoints: supplied.hitPoints,
      imageUrl: supplied.imageUrl,
      avatarImageBase64: supplied.avatarImageBase64,
      avatarImageMimeType: supplied.avatarImageMimeType,
      generatedSheetPdfBase64: supplied.generatedSheetPdfBase64,
      generatedSheetFileName: supplied.generatedSheetFileName,
      generatedSheetSpellcasting: supplied.generatedSheetSpellcasting,
    };
    case "character.update": return { characterId: supplied.characterId, campaignId, name: supplied.name ?? title, characterClass: supplied.characterClass, classSubclass: supplied.classSubclass, level: supplied.level, background: supplied.background };
    default: throw new Error("Action non mappata.");
  }
}

export function actionForArtifact(artifact: AiAssistantArtifact): string {
  if (artifact.kind === "mission_plan" || artifact.payload.planOnly === true) throw new Error("Un piano missioni deve essere prima approvato dal GM; non è direttamente salvabile.");
  const explicit = typeof artifact.payload.actionName === "string" ? artifact.payload.actionName : "";
  if (explicit === "character.update") throw new Error("L'Assistente può creare solo nuovi PG; modifica i PG esistenti dal percorso dedicato.");
  if (explicit && CANONICAL_SAVE_ACTIONS.has(explicit)) return explicit;
  switch (artifact.kind) {
    case "wiki": case "image": return "wiki.entity.create";
    case "action": return "campaign.update";
    default: return "gm.note.create";
  }
}

export async function executeAssistantArtifactAction(artifact: AiAssistantArtifact, actionName: string) {
  if (artifact.status === "saved" && artifact.savedEntity) return artifact.savedEntity;
  if (actionName === "campaign.create") {
    if (artifact.campaignId) throw new Error("Una nuova campagna deve partire da una chat senza campagna selezionata.");
    const input = record(artifact.payload.actionInput);
    if (typeof input.imageUrl !== "string" || !input.imageUrl.trim()) throw new Error("La copertina è obbligatoria prima di creare la campagna.");
  }
  if (actionName === "mission.create" || actionName === "mission.update") {
    if (!artifact.campaignId) throw new Error("Seleziona una campagna Long prima di salvare la missione.");
    const { data } = await createSupabaseAdminClient().from("campaigns").select("type").eq("id", artifact.campaignId).maybeSingle();
    if ((data as { type?: string } | null)?.type !== "long") throw new Error("Le missioni generate dall'Assistente sono disponibili solo per campagne Long.");
  }
  const result = await executeAction<Record<string, unknown>>(actionName, buildArtifactActionInput(artifact, actionName), { actorType: "ai", auditMetadata: { source: "ai_assistant_v2", artifactId: artifact.id, revision: artifact.revision } });
  if (!result.success) throw new Error(result.error);
  const id = typeof result.data?.id === "string" ? result.data.id : typeof result.data?.entityId === "string" ? result.data.entityId : typeof result.data?.campaignId === "string" ? result.data.campaignId : typeof result.data?.sessionId === "string" ? result.data.sessionId : typeof result.data?.missionId === "string" ? result.data.missionId : null;
  if (!id) throw new Error("L'action non ha restituito un identificatore verificabile; salvataggio non confermato.");
  return { id, type: actionName };
}

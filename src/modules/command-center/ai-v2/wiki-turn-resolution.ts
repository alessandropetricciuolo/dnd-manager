import type { AiAssistantArtifact } from "./contracts";
import type { OrchestratorOutput } from "./assistant-model-router";
import { extractNpcBuildParams } from "@/lib/ai/wiki-npc-params";
import { WIKI_NPC_CLASS_GROUPS, WIKI_NPC_CLASS_OPTIONS } from "@/lib/wiki-npc-ai-options";
import { detectWikiCreateRequest, resolveWikiVisibilityForAssistant } from "@/modules/command-center/ai-control-plane/wiki-request-detector";
import type { CanonicalReference } from "./canonical-references";

type MissionRow = { id: string; title: string };
export type MissionResolution =
  | { requested: false }
  | { requested: true; status: "resolved"; mission: MissionRow }
  | { requested: true; status: "missing"; name: string }
  | { requested: true; status: "ambiguous"; name: string; matches: MissionRow[] };

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function requestsStatblock(message: string): boolean {
  return /\bstat\s*block\b|\bstatblock\b/i.test(message);
}

function requestedStatblockSubject(message: string): string | null {
  const explicit = message.match(/\bstat\s*block\s+(?:di|del|della|per)\s+([^,.\n]+)/i)?.[1]?.trim();
  if (explicit) return explicit;
  return message.match(/\b(?:è|e)\s+(?:un|uno|una)\s+([^,.\n]+)/i)?.[1]?.trim() ?? null;
}

type NpcClassResolution =
  | { status: "recognized"; npcClass: string }
  | { status: "unsupported"; value: string }
  | { status: "missing" };

function unsupportedClassFromMessage(message: string): string | null {
  const match = message.match(/\b(?:classe\s+)?([a-zà-ÿ][a-zà-ÿ' -]{1,40}?)\s+(?:di\s+)?livello\s+\d{1,2}\b/i);
  const value = match?.[1]?.trim();
  if (!value || /^(?:un|uno|una|il|lo|la)\s+/i.test(value)) return null;
  return value;
}

/** Resolves a requested NPC class without treating a profession (for example, Artigiano) as a class. */
export function resolveNpcStatblockClass(message: string, previous: AiAssistantArtifact | null): NpcClassResolution {
  const requested = extractNpcBuildParams(message).npcClass;
  if (requested && WIKI_NPC_CLASS_OPTIONS.includes(requested)) return { status: "recognized", npcClass: requested };
  const mentioned = unsupportedClassFromMessage(message);
  if (mentioned) return { status: "unsupported", value: mentioned };
  const currentClass = record(record(previous?.payload.actionInput).attributes).class;
  if (typeof currentClass === "string" && currentClass.trim()) {
    if (WIKI_NPC_CLASS_OPTIONS.includes(currentClass.trim())) return { status: "recognized", npcClass: currentClass.trim() };
    return { status: "unsupported", value: currentClass.trim() };
  }
  return { status: "missing" };
}

function npcClassQuestion(resolution: Exclude<NpcClassResolution, { status: "recognized" }>): string {
  const available = WIKI_NPC_CLASS_GROUPS.map(({ label, options }) => `${label}: ${options.join(", ")}`).join(". ");
  const prefix = resolution.status === "unsupported"
    ? `“${resolution.value}” è un mestiere o una classe non disponibile per lo statblock.`
    : "Non ho riconosciuto una classe per lo statblock.";
  return `${prefix} Scegli una classe disponibile: ${available}.`;
}

/** Returns only a directly matched Manuale dei Mostri section; no fuzzy data is treated as a statblock source. */
export async function findOfficialStatblockContext(
  db: { from(table: "manuals_knowledge"): { select(columns: string): { ilike(column: string, pattern: string): { limit(count: number): PromiseLike<{ data: Array<{ content: string; metadata: Record<string, unknown> | null }> | null; error: { message: string } | null }> } } } },
  message: string,
  npcClass?: string | null
): Promise<string | null> {
  if (!requestsStatblock(message)) return null;
  // A request such as "statblock di Paolo, è un popolano" must search for
  // the official Popolano entry, not for the NPC's proper name.
  const subject = npcClass ?? requestedStatblockSubject(message);
  if (!subject || subject.length < 2) return null;
  const { data, error } = await db.from("manuals_knowledge").select("content, metadata").ilike("content", `%## ${subject.replace(/[%_]/g, "\\$&")}%`).limit(8);
  if (error) throw new Error(`Ricerca manuale non riuscita: ${error.message}`);
  const row = (data ?? []).find((candidate) => {
    const metadata = candidate.metadata ?? {};
    const book = String(metadata.manual_book_key ?? metadata.book_key ?? metadata.source_book ?? "").toLowerCase();
    return /mostri|monster|guida.*master|dungeon.*master|\bdm\b/.test(book) && new RegExp(`^#{1,2}\\s+${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im").test(candidate.content);
  });
  if (!row) return null;
  return `FONTE REGOLISTICA UFFICIALE — ${String((row.metadata ?? {}).title ?? (row.metadata ?? {}).manual_book_key ?? "Manuale ufficiale")}\n${row.content.slice(0, 12000)}`;
}

/** Handles the natural language used by the GM UI without accepting an ID from the model. */
export function requestedMissionName(message: string): string | null {
  const match = message.match(/\bcollega(?:re|lo|la)?\s+(?:alla?|con)\s+missione\s*[:,]?\s*["“']?([^"”'\n.]+?)["”']?(?:\s*$|[.])/i);
  return match?.[1]?.trim().replace(/[,:;]+$/, "") || null;
}

export async function resolveMissionReference(
  db: { from(table: "campaign_missions"): { select(columns: string): { eq(column: string, value: string): PromiseLike<{ data: MissionRow[] | null; error: { message: string } | null }> } } },
  campaignId: string,
  message: string
): Promise<MissionResolution> {
  const name = requestedMissionName(message);
  if (!name) return { requested: false };
  const { data, error } = await db.from("campaign_missions").select("id, title").eq("campaign_id", campaignId);
  if (error) throw new Error(`Ricerca missioni non riuscita: ${error.message}`);
  const exact = (data ?? []).filter((mission) => mission.title.trim().localeCompare(name, "it", { sensitivity: "base" }) === 0);
  if (exact.length === 1) return { requested: true, status: "resolved", mission: exact[0]! };
  if (exact.length > 1) return { requested: true, status: "ambiguous", name, matches: exact };
  return { requested: true, status: "missing", name };
}

function hasOfficialStatblockContext(context: string | undefined): boolean {
  return Boolean(context && /(?:manuale dei mostri|monster manual|fonte regolistica ufficiale|manuale ufficiale)/i.test(context));
}

function describeWikiChanges(before: Record<string, unknown>, after: Record<string, unknown>, contentChanged: boolean): string[] {
  const labels: Array<[string, string]> = [["visibility", "visibilità"], ["tags", "tag"], ["linkedMissionId", "missione"], ["isCore", "elemento core"], ["includeInCampaignAiMemory", "memoria IA"], ["relations", "relazioni"], ["audiences", "pubblico selettivo"]];
  const changed = labels.filter(([key]) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(([, label]) => label);
  if (contentChanged) changed.unshift("testo della bozza");
  const beforeAttributes = record(before.attributes); const afterAttributes = record(after.attributes);
  if (JSON.stringify(beforeAttributes) !== JSON.stringify(afterAttributes)) changed.push("dettagli specifici");
  return changed;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function relationList(value: unknown): Array<{ targetType: "wiki" | "map"; targetId: string; label: string }> {
  return Array.isArray(value) ? value.flatMap((item) => {
    const relation = record(item);
    const targetType = relation.targetType;
    const targetId = typeof relation.targetId === "string" ? relation.targetId.trim() : "";
    return (targetType === "wiki" || targetType === "map") && targetId
      ? [{ targetType, targetId, label: typeof relation.label === "string" && relation.label.trim() ? relation.label.trim() : "—" }]
      : [];
  }) : [];
}

function applyCanonicalReferences(
  actionInput: Record<string, unknown>,
  previousInput: Record<string, unknown>,
  references: CanonicalReference[],
): void {
  if (!references.length) return;
  const entityId = typeof actionInput.entityId === "string" ? actionInput.entityId : typeof previousInput.entityId === "string" ? previousInput.entityId : null;
  const safeReferences = references.filter((reference) => !(reference.targetType === "wiki" && reference.targetId === entityId));
  if (!safeReferences.length) return;
  actionInput.tags = [...new Set([...stringList(previousInput.tags), ...stringList(actionInput.tags), ...safeReferences.map((reference) => reference.name)])];
  const relations = new Map<string, { targetType: "wiki" | "map"; targetId: string; label: string }>();
  for (const relation of [...relationList(previousInput.relations), ...relationList(actionInput.relations)]) relations.set(`${relation.targetType}:${relation.targetId}`, relation);
  for (const reference of safeReferences) {
    const key = `${reference.targetType}:${reference.targetId}`;
    if (!relations.has(key)) relations.set(key, { targetType: reference.targetType, targetId: reference.targetId, label: `Riferimento canonico: ${reference.name}` });
  }
  actionInput.relations = [...relations.values()];
}

/**
 * Applies server-resolved references and produces an intentionally short chat
 * response. The full narrative belongs in the artifact card, never in every
 * conversational reply.
 */
export function finalizeWikiRevision(input: {
  message: string;
  context?: string;
  previous: AiAssistantArtifact | null;
  output: OrchestratorOutput;
  mission: MissionResolution;
  npcClass?: NpcClassResolution;
  canonicalReferences?: CanonicalReference[];
}): OrchestratorOutput {
  const previousInput = record(input.previous?.payload.actionInput);
  const actionInput = { ...record(input.output.actionInput) };
  const notices: string[] = [];
  const inferred = detectWikiCreateRequest(input.message);
  if (!actionInput.type) actionInput.type = previousInput.type ?? inferred?.entityType ?? "npc";
  // Every new or revised draft stays GM-only unless the current prompt says otherwise.
  actionInput.visibility = resolveWikiVisibilityForAssistant(input.message, input.message);
  const classResolution = input.npcClass ?? resolveNpcStatblockClass(input.message, input.previous);
  const isNpc = actionInput.type === "npc" || previousInput.type === "npc";
  if (isNpc && requestsStatblock(input.message) && classResolution.status !== "recognized") {
    return { ...input.output, intent: "ask_clarification", message: npcClassQuestion(classResolution) };
  }
  if (isNpc && requestsStatblock(input.message) && classResolution.status === "recognized") {
    actionInput.attributes = { ...record(actionInput.attributes), class: classResolution.npcClass };
  }
  if (input.mission.requested) {
    if (input.mission.status === "resolved") {
      actionInput.linkedMissionId = input.mission.mission.id;
      notices.push(`collegamento alla missione “${input.mission.mission.title}” accettato`);
    } else if (input.mission.status === "missing") {
      // Omit a speculative link so the deep merge preserves the existing one.
      delete actionInput.linkedMissionId;
      notices.push(`collegamento rifiutato: la missione “${input.mission.name}” non esiste in questa campagna`);
    } else {
      delete actionInput.linkedMissionId;
      notices.push(`collegamento rifiutato: “${input.mission.name}” corrisponde a più missioni`);
    }
  }
  applyCanonicalReferences(actionInput, previousInput, input.canonicalReferences ?? []);
  if (requestsStatblock(input.message) && !hasOfficialStatblockContext(input.context)) {
    const attributes = { ...record(actionInput.attributes) };
    delete attributes.statblock;
    const combat = { ...record(attributes.combat_stats) };
    for (const field of ["hp", "ac", "cr", "attacks"]) delete combat[field];
    if (Object.keys(combat).length) attributes.combat_stats = combat; else delete attributes.combat_stats;
    actionInput.attributes = attributes;
    delete actionInput.xpValue;
    notices.push("statblock non applicato: non ho una fonte regolistica ufficiale verificabile per questi dati");
  } else if (requestsStatblock(input.message)) {
    notices.push("statblock proposto dai dati della fonte regolistica ufficiale disponibile");
  }
  const content = typeof actionInput.content === "string" ? actionInput.content : input.output.content;
  const contentChanged = Boolean(content && content !== input.previous?.payload.content);
  const changes = describeWikiChanges(previousInput, actionInput, contentChanged);
  const accepted = changes.length ? `Ho applicato: ${changes.join(", ")}.` : "La bozza è invariata.";
  const feedback = [accepted, ...notices].join(" ");
  const actionName = input.output.actionName === "wiki.entity.update" || previousInput.entityId ? "wiki.entity.update" : "wiki.entity.create";
  return { ...input.output, actionName, message: feedback, actionInput };
}

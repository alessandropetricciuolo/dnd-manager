/** Catalogo Action Registry — tier e consentite per bozze AI. */

export const ACTION_TIERS = {
  tierA_workspace: [
    "command.note.create",
    "command.note.update",
    "command.link.create",
    "command.link.delete",
    "workspace.task.create",
    "workspace.task.update",
    "workspace.page.create",
    "workspace.page.update",
    "command.input.capture",
    "memory.reindex",
  ],
  tierB_campaign_ops: [
    "gm.note.create",
    "gm.note.update",
    "gm.note.delete",
    "session.create",
    "session.update",
    "wiki.entity.create",
    "wiki.entity.update",
    "wiki.relationship.create",
    "mission.create",
    "mission.update",
  ],
  tierC_high_impact: [
    "session.close",
    "campaign.create",
    "campaign.update",
    "wiki.entity.delete",
    "character.create",
    "character.update",
    "campaign.aiContext.generate",
    "ai.proposal.execute",
    "ai.proposal.reject",
  ],
} as const;

/** Action che l'assistente può proporre (bozza → conferma GM). */
export const AI_DRAFT_ALLOWED_ACTIONS = [
  // Workspace
  "workspace.task.create",
  "workspace.page.create",
  "command.input.capture",
  // Campagna & contenuti
  "campaign.create",
  "campaign.update",
  "gm.note.create",
  "gm.note.update",
  "session.create",
  "session.update",
  "session.close",
  "wiki.entity.create",
  "wiki.entity.update",
  "wiki.relationship.create",
  "wiki.entity.delete",
  "mission.create",
  "mission.update",
  "character.create",
  "character.update",
  "campaign.aiContext.generate",
  "memory.reindex",
] as const;

export type AiDraftAllowedAction = (typeof AI_DRAFT_ALLOWED_ACTIONS)[number];

/** Richiedono anteprima valida prima di Applica. */
export const AI_HIGH_IMPACT_ACTIONS: readonly string[] = [
  "session.close",
  "campaign.create",
  "campaign.update",
  "wiki.entity.delete",
  "character.create",
  "character.update",
  "campaign.aiContext.generate",
  "memory.reindex",
];

export const ACTION_INPUT_SCHEMAS: Record<string, string> = {
  "workspace.task.create":
    "{ title, description?, campaignId?, priority?, dueDate? }",
  "workspace.page.create":
    "{ title, contentMarkdown?, campaignId?, pageType?: note|doc|planning|idea|... }",
  "command.input.capture":
    "{ rawContent, source?: text|voice, transcript?, campaignId?, language? }",
  "campaign.create":
    "{ title, description?, type?: oneshot|quest|long|torneo, isPublic?: boolean }",
  "campaign.update": "{ campaignId, title, description?, type? }",
  "gm.note.create": "{ campaignId, title, content, sessionId? }",
  "gm.note.update": "{ noteId, title, content, sessionId? }",
  "session.create":
    "{ campaignId, date, time?, location?, maxPlayers?, chapterTitle? }",
  "session.update": "{ sessionId, title?, sessionSummary?, gmPrivateNotes? }",
  "session.close":
    "{ sessionId, summary, attendance, xpGained?, perPlayerXpAwards?, elapsedHours?, unlockContent?, unlockContentIds?, entityStatusUpdates?, gmPrivateNotes?, economy? }",
  "wiki.entity.create":
    "{ campaignId, title, type: npc|location|lore|item|monster, content, visibility? }",
  "wiki.entity.update":
    "{ entityId, campaignId, title, type, content, visibility? }",
  "wiki.relationship.create":
    "{ campaignId, sourceId, targetId?, targetMapId?, label, sourceName?, targetName?, targetKind? }",
  "wiki.entity.delete": "{ entityId, campaignId }",
  "mission.create":
    "{ campaignId, grade, title, committente, ubicazione, paga, urgenza, description, pointsReward? }",
  "mission.update":
    "{ campaignId, missionId, grade, title, committente, ubicazione, paga, urgenza, description, pointsReward? }",
  "character.create":
    "{ campaignId, name, characterClass?, classSubclass?, level?, background?, raceSlug?, armorClass?, hitPoints? }",
  "character.update":
    "{ characterId, campaignId, name, characterClass?, classSubclass?, level?, background? }",
  "campaign.aiContext.generate": "{ campaignId, description }",
  "memory.reindex": "{ campaignId }",
};

export function isAiDraftAllowedAction(actionName: string): actionName is AiDraftAllowedAction {
  return (AI_DRAFT_ALLOWED_ACTIONS as readonly string[]).includes(actionName);
}

export function buildInterpreterActionList(): string {
  return AI_DRAFT_ALLOWED_ACTIONS.map((name) => `- ${name}: ${ACTION_INPUT_SCHEMAS[name] ?? "{}"}`)
    .join("\n");
}

export function listAllRegisteredActionNamesFromCatalog(): string[] {
  return [
    ...ACTION_TIERS.tierA_workspace,
    ...ACTION_TIERS.tierB_campaign_ops,
    ...ACTION_TIERS.tierC_high_impact,
  ].sort();
}

export function normalizeProposalInput(
  actionName: string,
  input: Record<string, unknown>,
  campaignId: string | null
): Record<string, unknown> {
  const out = { ...input };
  if (campaignId) {
    if (actionName === "wiki.entity.create" || actionName === "gm.note.create") {
      out.campaignId = campaignId;
    }
    if (
      actionName === "workspace.task.create" ||
      actionName === "workspace.page.create" ||
      actionName === "mission.create" ||
      actionName === "mission.update" ||
      actionName === "wiki.entity.update" ||
      actionName === "wiki.entity.delete" ||
      actionName === "character.create" ||
      actionName === "character.update" ||
      actionName === "campaign.aiContext.generate" ||
      actionName === "memory.reindex" ||
      actionName === "session.update" ||
      actionName === "session.close"
    ) {
      if (out.campaignId === undefined) out.campaignId = campaignId;
    }
  }
  return out;
}

import type { AiAssistantArtifact, AiAssistantSourceRef, AiAssistantTurnResult } from "./contracts";
import type { AssistantModelRouter, OrchestratorOutput } from "./assistant-model-router";
import type { ThreadRepository } from "./thread-repository";
import { mergeWikiArtifactActionInput } from "./wiki-artifact";
import { extractMissionProposalSelection, isLongCampaignContext, isMissionPlanArtifact, normalizeMissionProposals } from "./mission-planning";

type Args = { repo: ThreadRepository; router: AssistantModelRouter; ownerUserId: string; campaignId: string | null; message: string; threadId?: string; context?: string; evidence?: AiAssistantSourceRef[]; finalizeOutput?: (input: { output: OrchestratorOutput; artifact: AiAssistantArtifact | null }) => Promise<OrchestratorOutput> | OrchestratorOutput };

export async function runAssistantTurn(args: Args): Promise<AiAssistantTurnResult> {
  const thread = await args.repo.getOrCreateThread(args.ownerUserId, args.campaignId, args.threadId);
  const turns = await args.repo.listTurns(thread.id);
  const artifactIds = turns.flatMap((turn) => turn.artifactIds);
  const current = artifactIds.at(-1);
  const currentArtifact = current ? await args.repo.getArtifact(current) : null;
  const planCandidates = await Promise.all([...new Set(artifactIds)].reverse().slice(0, 20).map((id) => args.repo.getArtifact(id)));
  const reusablePlan = planCandidates.find((candidate) => isMissionPlanArtifact(candidate));
  const artifact = reusablePlan && /\b(?:propost[ae]|mission[ie]|selezion|sviluppa|approva)\b/i.test(args.message) ? reusablePlan : currentArtifact;
  const proposals = isMissionPlanArtifact(artifact) ? normalizeMissionProposals((artifact?.payload.actionInput as Record<string, unknown> | undefined)?.proposals) : [];
  const selectedIds = extractMissionProposalSelection(args.message, proposals);
  const selectedPlan = selectedIds.length && artifact ? await args.repo.createRevision(artifact, { status: "draft", payload: { ...artifact.payload, selectedProposalIds: selectedIds } }) : null;
  const routerArtifact = selectedIds.length && artifact ? { ...artifact, payload: { ...artifact.payload, selectedProposalIds: selectedIds, selectedProposals: proposals.filter((proposal) => selectedIds.includes(proposal.id)) } } : artifact;
  const outputs = selectedIds.length && proposals.length ? await Promise.all(selectedIds.map((proposalId) => args.router.orchestrate({ message: `${args.message}\nSviluppa esclusivamente la proposta ${proposalId} come missione indipendente.`, turns, artifact: { ...routerArtifact, payload: { ...routerArtifact!.payload, selectedProposalIds: [proposalId], selectedProposals: proposals.filter((proposal) => proposal.id === proposalId) } }, context: args.context }))) : [await args.router.orchestrate({ message: args.message, turns, artifact: routerArtifact, context: args.context })];
  let out = outputs[0];
  if ((out.actionName === "mission.plan" || out.actionName === "mission.create" || out.actionName === "mission.update") && !isLongCampaignContext(args.context)) out = { intent: "ask_clarification", message: "Le missioni generate dall'Assistente sono disponibili solo per campagne Long. Seleziona una campagna Long per continuare." };
  if (selectedIds.length && out.actionName === "mission.create") out = { ...out, actionInput: { ...(out.actionInput ?? {}), proposalId: selectedIds[0], originPlanArtifactId: artifact?.id } };
  if (args.finalizeOutput) out = await args.finalizeOutput({ output: out, artifact });
  let next = artifact;
  const sourceRefs = args.evidence ?? [];
  const ops: AiAssistantTurnResult["artifactOperations"] = [];
  if (out.intent === "create" || (out.intent === "generate_image" && !artifact)) {
    next = { id: crypto.randomUUID(), threadId: thread.id, campaignId: thread.campaignId, kind: out.intent === "generate_image" ? "image" : (out.kind ?? "narrative"), status: "draft", revision: 1, parentArtifactId: selectedPlan?.id ?? null, payload: { title: out.title ?? "Bozza", content: out.content ?? "", ...(out.actionName ? { actionName: out.actionName, actionInput: out.actionInput ?? {} } : {}) }, sourceRefs, policyVersion: null, savedEntity: null };
    await args.repo.saveArtifact(next); ops.push({ op: "create", artifact: next });
    for (let index = 1; index < outputs.length; index += 1) {
      const extra = outputs[index];
      if (extra.actionName !== "mission.create" || extra.intent !== "create") continue;
      const proposalId = selectedIds[index];
      const extraArtifact: AiAssistantArtifact = { id: crypto.randomUUID(), threadId: thread.id, campaignId: thread.campaignId, kind: "narrative", status: "draft", revision: 1, parentArtifactId: selectedPlan?.id ?? null, payload: { title: extra.title ?? `Missione ${proposalId ?? index + 1}`, content: extra.content ?? "", actionName: "mission.create", actionInput: { ...(extra.actionInput ?? {}), proposalId, originPlanArtifactId: artifact?.id } }, sourceRefs, policyVersion: null, savedEntity: null };
      await args.repo.saveArtifact(extraArtifact); ops.push({ op: "create", artifact: extraArtifact });
    }
  } else if (out.intent === "generate_image" && artifact) {
    next = await args.repo.createRevision(artifact, { status: "draft", sourceRefs }); ops.push({ op: "revise", artifactId: next.id, patch: [] });
  } else if (out.intent === "revise" && artifact && out.patch) {
    const wasWiki = artifact.payload.actionName === "wiki.entity.create" || artifact.payload.actionName === "wiki.entity.update";
    const actionName = out.actionName ?? (wasWiki ? artifact.payload.actionName as string : undefined);
    const actionInput = actionName ? mergeWikiArtifactActionInput(artifact.payload.actionInput, out.actionInput ?? {}) : undefined;
    const content = typeof actionInput?.content === "string" ? actionInput.content : out.patch.value;
    next = await args.repo.createRevision(artifact, { status: "draft", sourceRefs, payload: { ...artifact.payload, content, ...(actionName ? { actionName, actionInput } : {}) } });
    ops.push({ op: "revise", artifactId: next.id, patch: [{ op: "replace", path: "/content", value: content }] });
  } else if (out.intent === "save" && artifact) ops.push({ op: "request_confirmation", artifactId: artifact.id, actionName: "assistant.artifact.save" });
  await args.repo.appendTurn({ threadId: thread.id, role: "user", content: args.message, intent: out.intent, artifactIds: next ? [next.id] : [] });
  await args.repo.appendTurn({ threadId: thread.id, role: "assistant", content: out.message, intent: out.intent, artifactIds: next ? [next.id] : [] });
  return { threadId: thread.id, assistantMessage: out.message, intent: out.intent, evidence: sourceRefs.length ? sourceRefs : next?.sourceRefs ?? [], artifactOperations: ops, clarification: { required: out.intent === "ask_clarification", question: out.intent === "ask_clarification" ? out.message : null }, artifact: next ?? undefined };
}

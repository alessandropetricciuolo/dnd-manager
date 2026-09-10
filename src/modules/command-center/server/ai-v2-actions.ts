"use server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTenantAdapter } from "@/modules/command-center/adapters";
import { openRouterAssistantRouter } from "../ai-v2/assistant-model-router";
import { SupabaseThreadRepository } from "../ai-v2/thread-repository";
import { runAssistantTurn } from "../ai-v2/orchestrator";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { loadAssistantContext } from "../ai-v2/context-service";
import { groundedNarrativeInstruction } from "../ai-v2/narrative-service";
import {
  assistantSaveErrorMessage,
  previewAssistantArtifactSave,
  saveAssistantArtifact,
} from "../ai-v2/save-service";
import { actionForArtifact } from "../ai-v2/action-bridge";
import { executeAction } from "@/modules/command-center/actions";
import { generateAssistantImage, resolveAssistantImageDescription } from "../ai-v2/image-service";
import { checkAiAssistantV2PilotAccess } from "../ai-v2/access";
import {
  finalizeWikiRevision,
  findOfficialStatblockContext,
  resolveMissionReference,
  resolveNpcStatblockClass,
} from "../ai-v2/wiki-turn-resolution";
import { detectWikiCreateRequest } from "../ai-control-plane/wiki-request-detector";
import { deriveAssistantThreadTitle } from "../ai-v2/thread-title";
import { loadManualQuestionContext } from "../ai-v2/manual-query";
import { isMissionPlanArtifact } from "../ai-v2/mission-planning";
import { appendCampaignCoverDirection, buildCampaignAssistantRoute } from "../ai-v2/campaign-onboarding";
import type { CharacterGeneratedSheetPayload } from "../ai-control-plane/draft-assistant.types";
async function authorizeCampaign(supabase: any, campaignId: string | null, role: string) {
  if (role === "admin") return true;
  if (!campaignId) return false;
  const { data, error } = await supabase.rpc("can_manage_campaign_as_gm", {
    p_campaign_id: campaignId,
  });
  return !error && data === true;
}
async function isLongCampaign(supabase: any, campaignId: string | null) {
  if (!campaignId) return false;
  const { data } = await supabase
    .from("campaigns")
    .select("type")
    .eq("id", campaignId)
    .maybeSingle();
  return (data as { type?: string } | null)?.type === "long";
}
async function auth() {
  const supabase = await createSupabaseServerClient();
  const access = await getTenantAdapter().assertCanAccessCommandCenter(supabase);
  return { supabase, access };
}
async function authorizePilotCampaign(
  supabase: any,
  input: { userId: string; role: "gm" | "admin"; campaignId: string | null },
) {
  if (input.campaignId && !(await authorizeCampaign(supabase, input.campaignId, input.role))) {
    return { ok: false as const, error: "Non sei autorizzato a gestire questa campagna." };
  }
  return checkAiAssistantV2PilotAccess(createSupabaseAdminClient(), input);
}
export async function runAiAssistantV2Turn(input: {
  campaignId?: string | null;
  message: string;
  threadId?: string;
}) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  const campaignId = input.campaignId ?? null;
  const authorized = await authorizePilotCampaign(supabase, {
    userId: access.ctx.userId,
    role: access.ctx.role,
    campaignId,
  });
  if (!authorized.ok) return { success: false as const, error: authorized.error };
  if (!input.message.trim())
    return { success: false as const, error: "Il messaggio non può essere vuoto." };
  try {
    const admin = createSupabaseAdminClient();
    const requestedNpcClass = resolveNpcStatblockClass(input.message, null);
    const [context, mission, officialStatblock] = await Promise.all([
      loadAssistantContext(admin, campaignId, input.message),
      campaignId
        ? resolveMissionReference(admin as never, campaignId, input.message)
        : Promise.resolve({ requested: false } as const),
      findOfficialStatblockContext(
        admin as never,
        input.message,
        requestedNpcClass.status === "recognized" ? requestedNpcClass.npcClass : null,
      ),
    ]);
    const manual = await loadManualQuestionContext(input.message);
    const groundedContext = [
      groundedNarrativeInstruction(context),
      manual?.instruction,
      officialStatblock,
    ]
      .filter(Boolean)
      .join("\n\n");
    const isWikiRequest = Boolean(detectWikiCreateRequest(input.message));
    const evidence = [...(context?.result.sources ?? []), ...(manual?.sources ?? [])].filter(
      (source, index, all) =>
        all.findIndex((item) => item.evidenceId === source.evidenceId) === index,
    );
    const result = await runAssistantTurn({
      repo: new SupabaseThreadRepository(admin),
      router: openRouterAssistantRouter,
      ownerUserId: access.ctx.userId,
      campaignId,
      message: input.message,
      threadId: input.threadId,
      context: groundedContext,
      evidence,
      finalizeOutput: ({ output, artifact }) =>
        isWikiRequest ||
        output.kind === "wiki" ||
        output.actionName === "wiki.entity.create" ||
        output.actionName === "wiki.entity.update" ||
        artifact?.kind === "wiki"
          ? finalizeWikiRevision({
              message: input.message,
              context: groundedContext,
              previous: artifact,
              output,
              mission,
              npcClass: resolveNpcStatblockClass(input.message, artifact),
              canonicalReferences: context?.canonicalReferences,
            })
          : output,
    });
    const threadId = result.threadId;
    await admin
      .from("ai_assistant_threads")
      .update({ title: deriveAssistantThreadTitle(input.message) } as never)
      .eq("id", threadId)
      .is("title", null);
    return { success: true as const, data: { ...result, evidence } };
  } catch (error) {
    console.error("[runAiAssistantV2Turn]", error);
    return {
      success: false as const,
      error: "Non è stato possibile completare il turno. La bozza precedente è rimasta invariata.",
    };
  }
}
export async function confirmAiAssistantV2Save(input: {
  artifactId: string;
  revision: number;
  actionName: string;
  saveAccess?: "secret" | "admin_only";
}) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  try {
    const admin = createSupabaseAdminClient();
    const repo = new SupabaseThreadRepository(admin);
    const artifact = await repo.getArtifact(input.artifactId);
    if (!artifact) return { success: false as const, error: "Artefatto non autorizzato." };
    const authorized = await authorizePilotCampaign(supabase, {
      userId: access.ctx.userId,
      role: access.ctx.role,
      campaignId: artifact.campaignId,
    });
    if (!authorized.ok) return { success: false as const, error: authorized.error };
    if (input.actionName === "wiki.entity.create" && !input.saveAccess) return { success: false as const, error: "Scegli Secret o Solo Admin prima di confermare." };
    if (input.saveAccess === "admin_only" && access.ctx.role !== "admin") return { success: false as const, error: "Solo un Admin può salvare una bozza Solo Admin." };
    const saved = await saveAssistantArtifact(admin, artifact, input.revision, input.actionName);
    if (input.actionName !== "campaign.create") return { success: true as const, data: { saved } };
    const campaignId = typeof saved?.id === "string" ? saved.id : null;
    if (!campaignId)
      return {
        success: true as const,
        data: {
          saved,
          warning:
            "Campagna salvata, ma non è stato possibile recuperare l'identificativo per aprire la conversazione.",
        },
      };
    const campaignInput = artifact.payload.actionInput && typeof artifact.payload.actionInput === "object"
      ? artifact.payload.actionInput as Record<string, unknown>
      : {};
    const tone = typeof campaignInput.tone === "string" ? campaignInput.tone.trim() : "";
    const gmNotes = typeof campaignInput.gmNotes === "string" ? campaignInput.gmNotes.trim() : "";
    if (tone || gmNotes) {
      const noteResult = await executeAction("gm.note.create", {
        campaignId,
        title: `Impostazione campagna: ${String(artifact.payload.title ?? "Nuova campagna")}`,
        content: [tone ? `Tono: ${tone}` : "", gmNotes ? `Note GM: ${gmNotes}` : ""].filter(Boolean).join("\n\n"),
      }, { actorType: "ai", auditMetadata: { source: "ai_assistant_v2", artifactId: artifact.id, revision: artifact.revision, phase: "campaign_post_save" } });
      if (!noteResult.success) return { success: true as const, data: { saved, campaignId, recovery: "campaign_notes" as const, warning: `Campagna salvata, ma le note GM non sono state registrate: ${noteResult.error}. Puoi riprovare.` } };
    }
    const thread: { error?: unknown; data?: { id?: string } | null } = await admin
      .from("ai_assistant_threads")
      .insert({
        owner_user_id: access.ctx.userId,
        campaign_id: campaignId,
        mode: "v2_pilot",
        status: "active",
        state_version: 1,
        title: String(artifact.payload.title ?? "Nuova campagna"),
      } as never)
      .select("id")
      .single() as unknown as { error?: unknown; data?: { id?: string } | null };
    if (thread.error || !thread.data?.id)
      return {
        success: true as const,
        data: {
          saved,
          campaignId,
          warning:
            "Campagna salvata. La conversazione dedicata non è stata creata: puoi aprirne una nuova dalla campagna.",
        },
      };
    return {
      success: true as const,
      data: {
        saved,
        campaignId,
        threadId: thread.data.id,
        route: buildCampaignAssistantRoute(campaignId, thread.data.id),
      },
    };
  } catch (error) {
    console.error("[confirmAiAssistantV2Save]", error);
    return { success: false as const, error: assistantSaveErrorMessage(error) };
  }
}

export async function retryAiAssistantV2CampaignNotes(input: { artifactId: string; campaignId: string }) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  try {
    const artifact = await new SupabaseThreadRepository(createSupabaseAdminClient()).getArtifact(input.artifactId);
    if (!artifact || artifact.payload.actionName !== "campaign.create") return { success: false as const, error: "Bozza campagna non trovata." };
    const authorized = await authorizePilotCampaign(supabase, { userId: access.ctx.userId, role: access.ctx.role, campaignId: input.campaignId });
    if (!authorized.ok) return { success: false as const, error: authorized.error };
    const actionInput = artifact.payload.actionInput && typeof artifact.payload.actionInput === "object" ? artifact.payload.actionInput as Record<string, unknown> : {};
    const tone = typeof actionInput.tone === "string" ? actionInput.tone.trim() : "";
    const gmNotes = typeof actionInput.gmNotes === "string" ? actionInput.gmNotes.trim() : "";
    if (!tone && !gmNotes) return { success: true as const, data: null };
    const result = await executeAction("gm.note.create", { campaignId: input.campaignId, title: `Impostazione campagna: ${String(artifact.payload.title ?? "Nuova campagna")}`, content: [tone ? `Tono: ${tone}` : "", gmNotes ? `Note GM: ${gmNotes}` : ""].filter(Boolean).join("\n\n") }, { actorType: "ai", auditMetadata: { source: "ai_assistant_v2", artifactId: artifact.id, revision: artifact.revision, phase: "campaign_post_save_retry" } });
    if (!result.success) return { success: false as const, error: result.error };
    return { success: true as const, data: result.data };
  } catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Le note GM non sono state registrate." }; }
}
export async function prepareAiAssistantV2Save(input: { artifactId: string; revision: number }) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  try {
    const artifact = await new SupabaseThreadRepository(createSupabaseAdminClient()).getArtifact(
      input.artifactId,
    );
    if (!artifact || artifact.revision !== input.revision)
      return { success: false as const, error: "Artefatto non autorizzato o non aggiornato." };
    const authorized = await authorizePilotCampaign(supabase, {
      userId: access.ctx.userId,
      role: access.ctx.role,
      campaignId: artifact.campaignId,
    });
    if (!authorized.ok) return { success: false as const, error: authorized.error };
    return {
      success: true as const,
      data: await previewAssistantArtifactSave(artifact, actionForArtifact(artifact)),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Anteprima non disponibile.",
    };
  }
}
export async function reviseAiAssistantV2Artifact(input: {
  artifactId: string;
  revision: number;
  content: string;
}) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  try {
    const repo = new SupabaseThreadRepository(createSupabaseAdminClient());
    const artifact = await repo.getArtifact(input.artifactId);
    if (!artifact || artifact.revision !== input.revision)
      return { success: false as const, error: "Bozza non autorizzata o già aggiornata." };
    const authorized = await authorizePilotCampaign(supabase, {
      userId: access.ctx.userId,
      role: access.ctx.role,
      campaignId: artifact.campaignId,
    });
    if (!authorized.ok) return { success: false as const, error: authorized.error };
    const updated = await repo.createRevision(artifact, {
      status: "draft",
      payload: { ...artifact.payload, content: input.content },
    });
    return { success: true as const, data: updated };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Modifica non salvata.",
    };
  }
}
export async function attachAiAssistantV2CharacterSheet(input: {
  artifactId: string;
  revision: number;
  sheet: CharacterGeneratedSheetPayload;
}) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  try {
    const admin = createSupabaseAdminClient();
    const repo = new SupabaseThreadRepository(admin);
    const artifact = await repo.getArtifact(input.artifactId);
    if (
      !artifact ||
      artifact.revision !== input.revision ||
      artifact.payload.actionName !== "character.create"
    )
      return { success: false as const, error: "Bozza PG non autorizzata o già aggiornata." };
    const authorized = await authorizePilotCampaign(supabase, {
      userId: access.ctx.userId,
      role: access.ctx.role,
      campaignId: artifact.campaignId,
    });
    if (!authorized.ok) return { success: false as const, error: authorized.error };
    if (
      !input.sheet.pdfBase64 ||
      !input.sheet.fileName ||
      !Number.isFinite(input.sheet.armorClass) ||
      !Number.isFinite(input.sheet.hitPoints)
    )
      return { success: false as const, error: "La scheda PDF non è completa." };
    const actionInput = {
      ...(artifact.payload.actionInput && typeof artifact.payload.actionInput === "object"
        ? artifact.payload.actionInput
        : {}),
      campaignId: artifact.campaignId,
      name: input.sheet.characterName || artifact.payload.title,
      characterClass: input.sheet.build.character_class || null,
      classSubclass: input.sheet.build.class_subclass || null,
      raceSlug: input.sheet.build.race_slug || null,
      subclassSlug: input.sheet.build.subclass_slug || null,
      backgroundSlug: input.sheet.build.background_slug || null,
      level: Number.parseInt(input.sheet.build.level, 10) || 1,
      background: input.sheet.characterStory ?? artifact.payload.content ?? null,
      armorClass: input.sheet.armorClass,
      hitPoints: input.sheet.hitPoints,
      generatedSheetPdfBase64: input.sheet.pdfBase64,
      generatedSheetFileName: input.sheet.fileName,
      generatedSheetSpellcasting: input.sheet.spellcasting
        ? JSON.stringify(input.sheet.spellcasting)
        : null,
    };
    const updated = await repo.createRevision(artifact, {
      status: "draft",
      payload: {
        ...artifact.payload,
        kind: "sheet",
        title: input.sheet.characterName || artifact.payload.title,
        actionName: "character.create",
        actionInput,
        generatedSheet: {
          fileName: input.sheet.fileName,
          armorClass: input.sheet.armorClass,
          hitPoints: input.sheet.hitPoints,
        },
      },
    });
    return { success: true as const, data: updated };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Scheda non collegata.",
    };
  }
}
export async function generateAiAssistantV2Image(input: {
  campaignId: string;
  artifactId: string;
}) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  const authorized = await authorizePilotCampaign(supabase, {
    userId: access.ctx.userId,
    role: access.ctx.role,
    campaignId: input.campaignId,
  });
  if (!authorized.ok) return { success: false as const, error: authorized.error };
  try {
    const admin = createSupabaseAdminClient();
    const repo = new SupabaseThreadRepository(admin);
    const previous = await repo.getArtifact(input.artifactId);
    if (!previous || previous.campaignId !== input.campaignId)
      return { success: false as const, error: "Bozza immagine non trovata." };
    const description = resolveAssistantImageDescription(previous.payload);
    if (!description)
      return {
        success: false as const,
        error: "La bozza non contiene una descrizione visiva da illustrare.",
      };
    const generated = await generateAssistantImage(admin, {
      campaignId: input.campaignId,
      description,
      entityType: "npc",
      entityTitle: String(previous.payload.title ?? ""),
      previousImageUrl:
        typeof previous.payload.imageUrl === "string" ? previous.payload.imageUrl : null,
      sourceRefs: previous.sourceRefs,
    });
    const updated = await repo.createRevision(previous, {
      status: "draft",
      payload: { ...previous.payload, imageUrl: generated.imageUrl },
      sourceRefs: generated.sources as never[],
      policyVersion: `${generated.policyVersion}:${generated.policyHash}`,
    });
    return { success: true as const, data: updated };
  } catch (error) {
    console.error("[generateAiAssistantV2Image]", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Generazione immagine non riuscita.",
    };
  }
}

export async function generateAiAssistantV2CampaignCover(input: {
  artifactId: string;
  revision: number;
  prompt?: string;
}) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  try {
    const admin = createSupabaseAdminClient();
    const repo = new SupabaseThreadRepository(admin);
    const artifact = await repo.getArtifact(input.artifactId);
    if (
      !artifact ||
      artifact.revision !== input.revision ||
      artifact.payload.actionName !== "campaign.create"
    )
      return { success: false as const, error: "Bozza campagna non autorizzata o già aggiornata." };
    const authorized = await authorizePilotCampaign(supabase, {
      userId: access.ctx.userId,
      role: access.ctx.role,
      campaignId: null,
    });
    if (!authorized.ok) return { success: false as const, error: authorized.error };
    const actionInput =
      artifact.payload.actionInput && typeof artifact.payload.actionInput === "object"
        ? (artifact.payload.actionInput as Record<string, unknown>)
        : {};
    const { generateCampaignCoverDraftImageAction } = await import("@/lib/actions/ai-generator");
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    const description = appendCampaignCoverDirection(
      String(actionInput.description ?? artifact.payload.content ?? ""),
      prompt,
    );
    const generated = await generateCampaignCoverDraftImageAction(
      String(artifact.payload.title ?? "Campagna"),
      description,
    );
    if (!generated.success || !generated.publicUrl)
      return {
        success: false as const,
        error: "message" in generated ? generated.message : "Generazione copertina non riuscita.",
      };
    const updated = await repo.createRevision(artifact, {
      status: "draft",
      payload: {
        ...artifact.payload,
        imageUrl: generated.publicUrl,
        actionInput: { ...actionInput, imageUrl: generated.publicUrl, description },
      },
    });
    return { success: true as const, data: updated };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Generazione copertina non riuscita.",
    };
  }
}

export async function prepareAiAssistantV2MissionBatch(input: { artifactIds: string[] }) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  const admin = createSupabaseAdminClient();
  const repo = new SupabaseThreadRepository(admin);
  const items = [] as Array<{ artifactId: string; ok: boolean; preview?: unknown; error?: string }>;
  for (const artifactId of [...new Set(input.artifactIds)].slice(0, 20)) {
    try {
      const artifact = await repo.getArtifact(artifactId);
      if (!artifact || artifact.payload.actionName !== "mission.create")
        throw new Error("Bozza missione non valida.");
      if (!(await isLongCampaign(supabase, artifact.campaignId)))
        throw new Error("Le missioni generate sono disponibili solo per campagne Long.");
      const authorized = await authorizePilotCampaign(supabase, {
        userId: access.ctx.userId,
        role: access.ctx.role,
        campaignId: artifact.campaignId,
      });
      if (!authorized.ok) throw new Error(authorized.error);
      items.push({
        artifactId,
        ok: true,
        preview: await previewAssistantArtifactSave(artifact, "mission.create"),
      });
    } catch (error) {
      items.push({
        artifactId,
        ok: false,
        error: error instanceof Error ? error.message : "Anteprima non disponibile.",
      });
    }
  }
  return { success: true as const, data: { items } };
}

export async function confirmAiAssistantV2MissionBatch(input: { artifactIds: string[] }) {
  const { supabase, access } = await auth();
  if (!access.ok) return { success: false as const, error: access.error };
  const admin = createSupabaseAdminClient();
  const repo = new SupabaseThreadRepository(admin);
  const items = [] as Array<{ artifactId: string; ok: boolean; data?: unknown; error?: string }>;
  for (const artifactId of [...new Set(input.artifactIds)].slice(0, 20)) {
    try {
      const artifact = await repo.getArtifact(artifactId);
      if (!artifact || artifact.payload.actionName !== "mission.create")
        throw new Error("Bozza missione non valida.");
      const authorized = await authorizePilotCampaign(supabase, {
        userId: access.ctx.userId,
        role: access.ctx.role,
        campaignId: artifact.campaignId,
      });
      if (!authorized.ok) throw new Error(authorized.error);
      const data = await saveAssistantArtifact(
        admin,
        artifact,
        artifact.revision,
        "mission.create",
      );
      items.push({ artifactId, ok: true, data });
    } catch (error) {
      items.push({
        artifactId,
        ok: false,
        error: error instanceof Error ? error.message : "Salvataggio non riuscito.",
      });
    }
  }
  return { success: true as const, data: { items } };
}

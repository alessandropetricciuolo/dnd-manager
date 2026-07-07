import type { ChatPendingPhase, ChatPendingProposalPayload, ChatWikiBatchMeta, ChatWikiBatchItem } from "./draft-assistant.types";
import { formatNpcBatchIntro } from "./wiki-npc-batch";
import { supportsWikiContextualImage } from "./wiki-proposal-builder";

export function isNpcBatchPending(pending: ChatPendingProposalPayload | null | undefined): boolean {
  return Boolean(pending?.wikiBatchMeta && pending.wikiBatchMeta.items.length > 1);
}

export function batchSavedCount(batch: ChatWikiBatchMeta): number {
  return batch.items.filter((i) => i.status === "saved").length;
}

export function batchRemainingItems(batch: ChatWikiBatchMeta): ChatWikiBatchItem[] {
  return batch.items.filter((i) => i.status !== "saved" && i.status !== "skipped");
}

export function findNextBatchIndex(batch: ChatWikiBatchMeta): number | null {
  const idx = batch.items.findIndex((i) => i.status !== "saved" && i.status !== "skipped");
  return idx >= 0 ? idx : null;
}

/** Salva lo stato corrente del pending nell'item attivo del batch. */
export function persistActiveBatchItem(pending: ChatPendingProposalPayload): ChatPendingProposalPayload {
  const batch = pending.wikiBatchMeta;
  if (!batch) return pending;

  const idx = batch.activeIndex;
  const items = [...batch.items];
  const current = items[idx];
  if (!current || current.status === "saved") return pending;

  items[idx] = {
    ...current,
    entityTitle: typeof pending.input.title === "string" ? pending.input.title : current.entityTitle,
    wikiMeta: pending.wikiMeta ?? current.wikiMeta,
    input: { ...pending.input },
    preview_payload: { ...pending.preview_payload },
    phase: pending.phase,
  };

  return {
    ...pending,
    wikiBatchMeta: { ...batch, items },
  };
}

export function activateBatchItem(
  pending: ChatPendingProposalPayload,
  index: number
): ChatPendingProposalPayload {
  const batch = pending.wikiBatchMeta;
  if (!batch) return pending;

  const item = batch.items[index];
  if (!item) return pending;

  return {
    ...pending,
    action_name: "wiki.entity.create",
    input: { ...item.input },
    preview_payload: { ...item.preview_payload },
    wikiMeta: item.wikiMeta,
    phase: item.phase ?? "text",
    wikiBatchMeta: { ...batch, activeIndex: index },
  };
}

function hasWikiImage(pending: ChatPendingProposalPayload): boolean {
  const url = pending.input.imageUrl ?? pending.preview_payload.imageUrl;
  return typeof url === "string" && url.trim().length > 0;
}

export function applyWikiImageOfferPhaseForBatchItem(
  pending: ChatPendingProposalPayload
): ChatPendingProposalPayload {
  if (!supportsWikiContextualImage("npc")) return { ...pending, phase: pending.phase ?? "text" };
  if (hasWikiImage(pending)) return { ...pending, phase: "text" };
  return { ...pending, phase: "awaiting_image" };
}

export function wikiBatchImageOfferReply(pending: ChatPendingProposalPayload): string {
  const batch = pending.wikiBatchMeta;
  const title =
    typeof pending.input.title === "string" ? pending.input.title : batch?.items[batch.activeIndex]?.entityTitle;
  const progress = batch ? ` (${batch.activeIndex + 1}/${batch.items.length})` : "";
  return `Testo pronto per **${title || "l'NPC"}**${progress}.\n\nVuoi generare un'immagine per questo PNG? Ogni personaggio ha la propria immagine.\n\nScrivi **sì** o **no**.`;
}

export function markBatchItemStatus(
  pending: ChatPendingProposalPayload,
  index: number,
  status: ChatWikiBatchItem["status"],
  savedEntityId?: string
): ChatPendingProposalPayload {
  const batch = pending.wikiBatchMeta;
  if (!batch) return pending;

  const items = [...batch.items];
  const item = items[index];
  if (!item) return pending;

  items[index] = { ...item, status, savedEntityId: savedEntityId ?? item.savedEntityId };

  return {
    ...pending,
    wikiBatchMeta: { ...batch, items },
  };
}

export function advanceBatchAfterAction(
  pending: ChatPendingProposalPayload,
  options: { savedEntityId?: string; skipped?: boolean }
): ChatPendingProposalPayload | null {
  const batch = pending.wikiBatchMeta;
  if (!batch) return null;

  const idx = batch.activeIndex;
  let withStatus = markBatchItemStatus(
    pending,
    idx,
    options.skipped ? "skipped" : "saved",
    options.savedEntityId
  );

  const nextIndex = findNextBatchIndex(withStatus.wikiBatchMeta!);
  if (nextIndex == null) return null;

  withStatus = activateBatchItem(withStatus, nextIndex);
  return applyWikiImageOfferPhaseForBatchItem(withStatus);
}

export function formatBatchSaveReply(
  savedTitle: string,
  batch: ChatWikiBatchMeta,
  nextPending: ChatPendingProposalPayload | null
): string {
  const saved = batchSavedCount(batch);
  const total = batch.items.length;
  const base = `PNG **${savedTitle}** salvato (${saved}/${total}).`;

  if (!nextPending?.wikiBatchMeta) {
    const skipped = batch.items.filter((i) => i.status === "skipped").length;
    const suffix =
      skipped > 0 ? ` ${skipped} saltati.` : "";
    return `${base}\n\nBatch completato: tutti gli NPC del gruppo sono stati elaborati.${suffix}`;
  }

  const intro = formatNpcBatchIntro(
    batch.roles,
    batch.locationName,
    nextPending.wikiBatchMeta.activeIndex
  );
  const imageHint =
    nextPending.phase === "awaiting_image"
      ? `\n\n${wikiBatchImageOfferReply(nextPending)}`
      : "\n\nPuoi affinare il testo in chat, poi **conferma** per salvare.";

  return `${base}\n\n${intro}${imageHint}`;
}

export function syncBatchItemPhase(
  pending: ChatPendingProposalPayload,
  phase: ChatPendingPhase
): ChatPendingProposalPayload {
  return persistActiveBatchItem({ ...pending, phase });
}

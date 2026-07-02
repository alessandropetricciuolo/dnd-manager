"use client";

import { useRef } from "react";
import Image from "next/image";
import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, GitBranch, ImageIcon, Sparkles } from "lucide-react";

import { SheetGeneratorEmbed } from "@/components/sheet-generator/sheet-generator-embed";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { attachGeneratedSheetToCharacterProposal } from "@/modules/command-center/ai-control-plane/character-proposal-shared";
import type {
  CharacterGeneratedSheetPayload,
  ChatPendingProposalPayload,
} from "@/modules/command-center/ai-control-plane/draft-assistant.types";
import type { SessionCloseMissingField } from "@/modules/command-center/ai-control-plane/session-close.types";

const ACTION_LABELS: Record<string, string> = {
  "wiki.entity.create": "Entità wiki",
  "gm.note.create": "Nota GM",
  "mission.create": "Missione",
  "session.create": "Sessione",
  "workspace.task.create": "Task",
  "workspace.page.create": "Pagina",
  "campaign.create": "Campagna",
  "character.create": "Personaggio",
  "wiki.relationship.create": "Relazione wiki",
  "session.close": "Chiusura sessione",
};

type AiAssistantCanvasProps = {
  pendingProposal: ChatPendingProposalPayload | null;
  executedSummary: string | null;
  isThinking: boolean;
  campaignName?: string | null;
  campaignId?: string | null;
  onPendingProposalChange?: (next: ChatPendingProposalPayload) => void;
};

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function readFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function AiAssistantCanvas({
  pendingProposal,
  executedSummary,
  isThinking,
  campaignName,
  campaignId,
  onPendingProposalChange,
}: AiAssistantCanvasProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (executedSummary) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center">
        <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" />
        <p className="font-serif text-lg text-barber-paper">{executedSummary}</p>
        <p className="mt-2 text-sm text-barber-paper/60">Puoi continuare a chattare per preparare altro.</p>
      </div>
    );
  }

  if (!pendingProposal) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-barber-gold/25 bg-barber-dark/30 p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-barber-gold/30 bg-barber-gold/10">
          <Sparkles className="h-7 w-7 text-barber-gold" />
        </div>
        <h3 className="font-serif text-lg text-barber-paper">Anteprima generazione</h3>
        <p className="mt-2 max-w-sm text-sm text-barber-paper/55">
          {isThinking
            ? "Sto elaborando la richiesta…"
            : "Qui comparirà il risultato: testo wiki, missioni, schede PG e immagini generate dall'assistente."}
        </p>
        {campaignName ? (
          <p className="mt-4 text-xs text-barber-gold/70">Campagna: {campaignName}</p>
        ) : (
          <p className="mt-4 text-xs text-amber-400/80">Seleziona una campagna per contenuti contestuali.</p>
        )}
      </div>
    );
  }

  const preview = pendingProposal.preview_payload;
  const input = pendingProposal.input;
  const wikiDraft = pendingProposal.wikiMeta?.markdownDraft;
  const isCharacter = pendingProposal.action_name === "character.create";
  const isRelationship = pendingProposal.action_name === "wiki.relationship.create";
  const attendanceResolved = Array.isArray(preview.attendanceResolved)
    ? (preview.attendanceResolved as { playerName: string; status: string }[])
    : [];
  const relationshipPreview =
    pendingProposal.relationshipMeta?.resolved ??
    (isRelationship
      ? {
          sourceName: pickText(preview.sourceName, input.sourceName) ?? "Sorgente",
          targetName: pickText(preview.targetName, input.targetName) ?? "Bersaglio",
          label: pickText(preview.label, input.label) ?? "relazione",
          targetKind:
            preview.targetKind === "map" || input.targetKind === "map"
              ? ("map" as const)
              : ("wiki" as const),
        }
      : null);

  const title =
    pickText(
      preview.title,
      preview.name,
      input.title,
      input.name,
      pendingProposal.characterMeta?.characterName,
      pendingProposal.campaignMeta?.draft.title,
      pendingProposal.missionMeta?.draft.title,
      pendingProposal.wikiMeta?.entityTitle
    ) || "Senza titolo";

  const type = pickText(
    preview.type,
    input.type,
    pendingProposal.wikiMeta?.entityType,
    pendingProposal.campaignMeta?.draft.type,
    pendingProposal.missionMeta?.draft.grade ? `Grado ${pendingProposal.missionMeta.draft.grade}` : ""
  );

  const characterStory =
    pendingProposal.characterMeta?.storyDraft.characterStory ||
    pickText(preview.characterStory, input.background);

  const content =
    pendingProposal.campaignMeta?.draft.description ||
    pendingProposal.missionMeta?.draft.description ||
    (isCharacter ? characterStory : null) ||
    wikiDraft?.description ||
    pickText(preview.assistantPreview, preview.content, preview.contentMarkdown, preview.description, input.content, input.description);

  const playerPrimer =
    pendingProposal.campaignMeta?.draft.playerPrimer ||
    pickText(preview.playerPrimer, input.playerPrimer);
  const statblock = wikiDraft?.statblock?.trim() || "";
  const imageUrl = pickText(preview.imageUrl, input.imageUrl) || null;
  const actionLabel = ACTION_LABELS[pendingProposal.action_name] ?? pendingProposal.action_name;
  const sheetReady = Boolean(pendingProposal.characterMeta?.generatedSheet?.pdfBase64);

  function handleSheetReady(sheet: CharacterGeneratedSheetPayload) {
    if (!onPendingProposalChange || !campaignId || !pendingProposal) return;
    const { proposal, characterMeta } = attachGeneratedSheetToCharacterProposal(
      pendingProposal,
      campaignId,
      sheet
    );
    onPendingProposalChange({
      ...proposal,
      rationale: pendingProposal.rationale,
      phase: "text",
      characterMeta,
    });
  }

  async function handleAvatarFile(file: File | null) {
    if (!file || !onPendingProposalChange || !pendingProposal) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return;
    const base64 = await readFileAsBase64(file);
    onPendingProposalChange({
      ...pendingProposal,
      input: {
        ...pendingProposal.input,
        avatarImageBase64: base64,
        avatarImageMimeType: file.type,
      },
      preview_payload: {
        ...pendingProposal.preview_payload,
        avatarReady: true,
      },
    });
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-barber-gold/25 bg-gradient-to-b from-barber-dark/60 to-barber-dark/90">
      <div className="border-b border-barber-gold/15 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-barber-gold/70">
              {actionLabel}
            </p>
            <h3 className="truncate font-serif text-xl font-semibold text-barber-paper">{title}</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {type ? (
              <span className="rounded-full border border-barber-gold/30 bg-barber-gold/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-barber-gold">
                {type}
              </span>
            ) : null}
            {pendingProposal.phase === "awaiting_sheet" ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-[10px] text-sky-200">
                Scheda richiesta
              </span>
            ) : pendingProposal.phase === "awaiting_avatar" ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-300">
                Ritratto opzionale
              </span>
            ) : pendingProposal.phase === "awaiting_image" ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-300">
                Decisione immagine
              </span>
            ) : pendingProposal.phase === "awaiting_architect" ? (
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[10px] text-violet-200">
                Decisione Architect
              </span>
            ) : pendingProposal.phase === "awaiting_close_info" ? (
              <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-[10px] text-orange-200">
                Dati mancanti
              </span>
            ) : sheetReady && isCharacter ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] text-emerald-300">
                Scheda collegata
              </span>
            ) : (
              <span className="rounded-full border border-barber-paper/20 bg-barber-paper/5 px-2.5 py-0.5 text-[10px] text-barber-paper/60">
                In revisione
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {imageUrl ? (
          <div className="mb-4 overflow-hidden rounded-lg border border-barber-gold/20">
            <div className="relative aspect-[4/3] w-full max-h-56 bg-barber-dark">
              <Image src={imageUrl} alt={title} fill className="object-cover" unoptimized />
            </div>
          </div>
        ) : pendingProposal.phase === "awaiting_image" ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-barber-gold/25 bg-barber-dark/50 px-3 py-2 text-xs text-barber-paper/50">
            <ImageIcon className="h-4 w-4 shrink-0" />
            Immagine non ancora generata — rispondi in chat.
          </div>
        ) : null}

        {isCharacter && content ? (
          <section className="mb-4 space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              <BookOpen className="h-3.5 w-3.5" />
              Storia (AI)
            </h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">{content}</p>
            </div>
          </section>
        ) : null}

        {isCharacter && campaignId ? (
          <section className="mb-4 rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-3">
            <SheetGeneratorEmbed
              initial={{
                characterName: pendingProposal.characterMeta?.characterName ?? title,
                characterStory: characterStory ?? "",
                includeBackgroundStoryInPdf: true,
              }}
              sheetReady={sheetReady}
              onSheetReady={handleSheetReady}
            />
          </section>
        ) : null}

        {isCharacter && pendingProposal.phase === "awaiting_avatar" ? (
          <section className="mb-4 space-y-2 rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-3">
            <h4 className="text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              Carica ritratto (opzionale)
            </h4>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void handleAvatarFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-barber-gold/40 text-barber-gold"
              onClick={() => avatarInputRef.current?.click()}
            >
              Scegli immagine
            </Button>
            {typeof input.avatarImageBase64 === "string" && input.avatarImageBase64 ? (
              <p className="text-xs text-emerald-300/90">
                Immagine caricata. Scrivi **conferma** in chat per creare il PG.
              </p>
            ) : null}
          </section>
        ) : null}

        {!isCharacter && content ? (
          <section className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              <BookOpen className="h-3.5 w-3.5" />
              {playerPrimer ? "Descrizione (GM)" : "Contenuto"}
            </h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">{content}</p>
            </div>
          </section>
        ) : null}

        {pendingProposal.missionMeta ? (
          <section className="mt-4 space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-barber-gold/80">Scheda missione</h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4 text-sm text-barber-paper/85">
              <p>Committente: {pendingProposal.missionMeta.draft.committente}</p>
              <p>Ubicazione: {pendingProposal.missionMeta.draft.ubicazione}</p>
              <p>
                Paga: {pendingProposal.missionMeta.draft.paga} · Urgenza:{" "}
                {pendingProposal.missionMeta.draft.urgenza} · Punti:{" "}
                {pendingProposal.missionMeta.draft.pointsReward}
              </p>
            </div>
          </section>
        ) : null}

        {pendingProposal.sessionMeta ? (
          <section className="mt-4 space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              <CalendarDays className="h-3.5 w-3.5" />
              Scheda sessione
            </h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4 text-sm text-barber-paper/85">
              <p>
                Data: {pendingProposal.sessionMeta.draft.date} ore{" "}
                {pendingProposal.sessionMeta.draft.time}
              </p>
              {pendingProposal.sessionMeta.draft.chapterTitle ? (
                <p>Capitolo: {pendingProposal.sessionMeta.draft.chapterTitle}</p>
              ) : null}
              {pendingProposal.sessionMeta.partyLabel ||
              pendingProposal.sessionMeta.draft.partyName ? (
                <p>
                  Party:{" "}
                  {pendingProposal.sessionMeta.partyLabel ??
                    pendingProposal.sessionMeta.draft.partyName}
                </p>
              ) : null}
              {pendingProposal.sessionMeta.draft.location ? (
                <p>Luogo: {pendingProposal.sessionMeta.draft.location}</p>
              ) : null}
              <p>Posti max: {pendingProposal.sessionMeta.draft.maxPlayers}</p>
            </div>
          </section>
        ) : null}

        {pendingProposal.sessionCloseMeta ? (
          <section className="mt-4 space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Checklist chiusura — {pendingProposal.sessionCloseMeta.sessionLabel || "sessione"}
            </h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4 text-sm text-barber-paper/85 space-y-2">
              <p>
                <span className="text-barber-gold/80">XP base:</span>{" "}
                {pendingProposal.sessionCloseMeta.resolved.xpGained} ·{" "}
                <span className="text-barber-gold/80">Ore:</span>{" "}
                {pendingProposal.sessionCloseMeta.resolved.elapsedHours}
              </p>
              <p>
                <span className="text-barber-gold/80">Presenze:</span>{" "}
                {(attendanceResolved.length
                  ? attendanceResolved
                  : Object.entries(pendingProposal.sessionCloseMeta.resolved.attendance).map(
                      ([pid, st]) => ({ playerName: pid.slice(0, 8), status: st })
                    )
                )
                  .map((a) => `${a.playerName} (${a.status === "attended" ? "presente" : "assente"})`)
                  .join(", ") || "—"}
              </p>
              {pendingProposal.sessionCloseMeta.resolved.unlockContentIds.length > 0 ? (
                <p>
                  <span className="text-barber-gold/80">Sblocchi:</span>{" "}
                  {pendingProposal.sessionCloseMeta.resolved.unlockContentIds
                    .map((u: { name: string }) => u.name)
                    .join(", ")}
                </p>
              ) : null}
              {Object.keys(pendingProposal.sessionCloseMeta.resolved.entityStatusUpdates).length >
              0 ? (
                <p>
                  <span className="text-barber-gold/80">Mondo:</span>{" "}
                  {Object.entries(
                    pendingProposal.sessionCloseMeta.resolved.entityStatusUpdates
                  )
                    .map(([, st]) => st)
                    .join(", ")}
                </p>
              ) : null}
              {pendingProposal.sessionCloseMeta.missingFields.length > 0 ? (
                <ul className="mt-2 list-disc pl-4 text-xs text-amber-200/90">
                  {pendingProposal.sessionCloseMeta.missingFields.map((f: SessionCloseMissingField) => (
                    <li key={f.id}>{f.question}</li>
                  ))}
                </ul>
              ) : null}
              {pendingProposal.sessionCloseMeta.missingFields.some(
                (f: SessionCloseMissingField) => f.id === "economy_wizard"
              ) ? (
                <p className="text-xs text-barber-paper/55">
                  Wizard economia/trofei:{" "}
                  <a
                    href={pendingProposal.sessionCloseMeta.wizardEconomyUrl}
                    className="text-barber-gold underline"
                  >
                    GM Screen
                  </a>
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {relationshipPreview ? (
          <section className="mt-4 space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              <GitBranch className="h-3.5 w-3.5" />
              Mappa concettuale
            </h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4">
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-barber-paper/90">
                <span className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-3 py-2 font-medium">
                  {relationshipPreview.sourceName}
                </span>
                <span className="text-barber-gold/70">
                  —[{relationshipPreview.label}]→
                </span>
                <span className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-3 py-2 font-medium">
                  {relationshipPreview.targetName}
                  {relationshipPreview.targetKind === "map" ? " (mappa)" : ""}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {playerPrimer ? (
          <section className="mt-4 space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              Guida del giocatore
            </h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">{playerPrimer}</p>
            </div>
          </section>
        ) : null}

        {statblock ? (
          <section className="mt-4 space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-barber-gold/80">Meccanica</h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-barber-paper/80">
                {statblock}
              </pre>
            </div>
          </section>
        ) : null}

        {pendingProposal.rationale ? (
          <p className={cn("text-xs text-barber-paper/45", content || statblock ? "mt-4" : "")}>
            {pendingProposal.rationale}
          </p>
        ) : null}
      </div>
    </div>
  );
}

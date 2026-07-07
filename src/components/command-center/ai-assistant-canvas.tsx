"use client";

import { useRef, type ComponentType, type ReactNode } from "react";
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
import type { PreviewTextSelection } from "@/modules/command-center/ai-control-plane/preview-text-selection";
import { PreviewSelectableText } from "@/components/command-center/preview-selectable-text";

function PreviewSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <h4 className="flex items-center gap-1.5 text-[11px] font-medium text-barber-gold/75">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {title}
      </h4>
      <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-inset ring-white/[0.06] sm:p-4">
        {children}
      </div>
    </section>
  );
}

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
  previewTextSelection?: PreviewTextSelection | null;
  onPreviewTextSelect?: (selection: PreviewTextSelection) => void;
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
  previewTextSelection,
  onPreviewTextSelect,
  onPendingProposalChange,
}: AiAssistantCanvasProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (executedSummary) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto rounded-2xl bg-emerald-950/15 p-8 text-center ring-1 ring-emerald-500/20">
        <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" />
        <p className="font-serif text-lg text-barber-paper">{executedSummary}</p>
        <p className="mt-2 text-sm text-barber-paper/60">Puoi continuare a chattare per preparare altro.</p>
      </div>
    );
  }

  if (!pendingProposal) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto rounded-2xl bg-barber-dark/25 p-8 text-center ring-1 ring-dashed ring-barber-gold/15">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-barber-gold/10 ring-1 ring-barber-gold/20">
          <Sparkles className="h-7 w-7 text-barber-gold" />
        </div>
        <h3 className="font-serif text-lg text-barber-paper">Anteprima generazione</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-barber-paper/55">
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
  const isCampaign = pendingProposal.action_name === "campaign.create";
  const isWiki = pendingProposal.action_name === "wiki.entity.create";
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
  const visibilityLabel = pickText(preview.visibilityLabel, preview.visibility, input.visibility);
  const sheetReady = Boolean(pendingProposal.characterMeta?.generatedSheet?.pdfBase64);
  const sessionSummary =
    pendingProposal.sessionCloseMeta?.aiDraft.summary?.trim() ||
    pickText(preview.summary, input.summary);

  const selectionDisabled =
    isThinking ||
    !onPreviewTextSelect ||
    pendingProposal.phase === "awaiting_campaign_type" ||
    pendingProposal.phase === "awaiting_npc_mechanics" ||
    pendingProposal.phase === "awaiting_image" ||
    pendingProposal.phase === "awaiting_avatar" ||
    pendingProposal.phase === "awaiting_sheet" ||
    pendingProposal.phase === "awaiting_architect";

  function isFieldActive(field: PreviewTextSelection["field"]): boolean {
    return previewTextSelection?.field === field;
  }

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-barber-dark/45 via-barber-dark/60 to-barber-dark/80 ring-1 ring-barber-gold/10">
      <div className="shrink-0 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-barber-gold/60">
              {actionLabel}
            </p>
            <h3 className="truncate font-serif text-xl font-semibold text-barber-paper sm:text-2xl">
              {title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {type ? (
              <span className="rounded-full border border-barber-gold/30 bg-barber-gold/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-barber-gold">
                {type}
              </span>
            ) : null}
            {pendingProposal.action_name === "wiki.entity.create" && visibilityLabel ? (
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] text-violet-200">
                {visibilityLabel === "secret"
                  ? "Solo GM"
                  : visibilityLabel === "public"
                    ? "Pubblico"
                    : visibilityLabel === "selective"
                      ? "Selettivo"
                      : visibilityLabel}
              </span>
            ) : null}
            {pendingProposal.phase === "awaiting_campaign_type" ? (
              <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-[10px] text-sky-200">
                Tipo evento
              </span>
            ) : pendingProposal.phase === "awaiting_npc_mechanics" ? (
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[10px] text-violet-200">
                Statblock NPC
              </span>
            ) : pendingProposal.wikiBatchMeta ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] text-emerald-200">
                Batch {pendingProposal.wikiBatchMeta.activeIndex + 1}/{pendingProposal.wikiBatchMeta.items.length}
              </span>
            ) : pendingProposal.phase === "awaiting_sheet" ? (
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

      <div className="scrollbar-barber-y min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-5 pt-1 sm:space-y-5 sm:px-5 sm:pb-6">
        {isCampaign && pendingProposal.phase === "awaiting_campaign_type" ? (
          <PreviewSection title="Tipo di evento" icon={BookOpen}>
            <p className="text-sm leading-relaxed text-barber-paper/75">
              Scegli il formato in chat: oneshot, quest, campagna lunga o torneo. Poi l&apos;assistente
              ti aiuterà a scrivere la descrizione che diventerà la memoria della campagna.
            </p>
          </PreviewSection>
        ) : null}

        {isWiki && pendingProposal.phase === "awaiting_npc_mechanics" ? (
          <PreviewSection title="Statblock NPC" icon={BookOpen}>
            <p className="text-sm leading-relaxed text-barber-paper/75">
              Indica in chat <strong>razza</strong>, <strong>classe</strong> e <strong>livello</strong>{" "}
              (es. halfling ladro livello 5). L&apos;assistente genererà narrativa e meccanica dai manuali
              indicizzati.
            </p>
          </PreviewSection>
        ) : null}

        {isCharacter && content ? (
          <PreviewSection title="Storia (AI)" icon={BookOpen}>
            <PreviewSelectableText
              text={content}
              field="character_story"
              sectionLabel="Storia PG"
              onSelectExcerpt={onPreviewTextSelect ?? (() => {})}
              disabled={selectionDisabled}
              active={isFieldActive("character_story")}
            />
          </PreviewSection>
        ) : null}

        {isCharacter && campaignId ? (
          <section className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06]">
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
          <PreviewSection title="Carica ritratto (opzionale)">
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
          </PreviewSection>
        ) : null}

        {!isCharacter && content ? (
          <PreviewSection
            title={playerPrimer ? "Descrizione (GM)" : isWiki && wikiDraft ? "Descrizione" : "Contenuto"}
            icon={BookOpen}
          >
            <PreviewSelectableText
              text={content}
              field={isWiki && wikiDraft ? "wiki_description" : "content"}
              sectionLabel={
                isWiki && wikiDraft
                  ? "Descrizione wiki"
                  : pendingProposal.campaignMeta
                    ? "Descrizione campagna"
                    : pendingProposal.missionMeta
                      ? "Descrizione missione"
                      : "Contenuto"
              }
              onSelectExcerpt={onPreviewTextSelect ?? (() => {})}
              disabled={selectionDisabled}
              active={isFieldActive(isWiki && wikiDraft ? "wiki_description" : "content")}
            />
          </PreviewSection>
        ) : null}

        {pendingProposal.missionMeta ? (
          <PreviewSection title="Scheda missione">
            <div className="space-y-1 text-sm leading-relaxed text-barber-paper/85">
              <p>Committente: {pendingProposal.missionMeta.draft.committente}</p>
              <p>Ubicazione: {pendingProposal.missionMeta.draft.ubicazione}</p>
              <p>
                Paga: {pendingProposal.missionMeta.draft.paga} · Urgenza:{" "}
                {pendingProposal.missionMeta.draft.urgenza} · Punti:{" "}
                {pendingProposal.missionMeta.draft.pointsReward}
              </p>
            </div>
          </PreviewSection>
        ) : null}

        {pendingProposal.sessionMeta ? (
          <PreviewSection title="Scheda sessione" icon={CalendarDays}>
            <div className="space-y-1 text-sm leading-relaxed text-barber-paper/85">
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
          </PreviewSection>
        ) : null}

        {pendingProposal.sessionCloseMeta ? (
          <PreviewSection
            title={`Checklist chiusura — ${pendingProposal.sessionCloseMeta.sessionLabel || "sessione"}`}
            icon={ClipboardCheck}
          >
            <div className="space-y-2 text-sm leading-relaxed text-barber-paper/85">
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
          </PreviewSection>
        ) : null}

        {relationshipPreview ? (
          <PreviewSection title="Mappa concettuale" icon={GitBranch}>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-barber-paper/90">
              <span className="rounded-lg bg-white/[0.04] px-3 py-2 font-medium ring-1 ring-white/[0.08]">
                {relationshipPreview.sourceName}
              </span>
              <span className="text-barber-gold/70">—[{relationshipPreview.label}]→</span>
              <span className="rounded-lg bg-white/[0.04] px-3 py-2 font-medium ring-1 ring-white/[0.08]">
                {relationshipPreview.targetName}
                {relationshipPreview.targetKind === "map" ? " (mappa)" : ""}
              </span>
            </div>
          </PreviewSection>
        ) : null}

        {playerPrimer ? (
          <PreviewSection title="Guida del giocatore">
            <PreviewSelectableText
              text={playerPrimer}
              field="player_primer"
              sectionLabel="Guida del giocatore"
              onSelectExcerpt={onPreviewTextSelect ?? (() => {})}
              disabled={selectionDisabled}
              active={isFieldActive("player_primer")}
            />
          </PreviewSection>
        ) : null}

        {sessionSummary && pendingProposal.sessionCloseMeta ? (
          <PreviewSection title="Riepilogo sessione">
            <PreviewSelectableText
              text={sessionSummary}
              field="session_summary"
              sectionLabel="Riepilogo chiusura"
              onSelectExcerpt={onPreviewTextSelect ?? (() => {})}
              disabled={selectionDisabled}
              active={isFieldActive("session_summary")}
            />
          </PreviewSection>
        ) : null}

        {statblock ? (
          <PreviewSection title="Meccanica">
            <PreviewSelectableText
              text={statblock}
              field="wiki_statblock"
              sectionLabel="Meccanica"
              onSelectExcerpt={onPreviewTextSelect ?? (() => {})}
              disabled={selectionDisabled}
              active={isFieldActive("wiki_statblock")}
              className="font-sans text-barber-paper/80"
            />
          </PreviewSection>
        ) : null}

        {isWiki || isCampaign ? (
          <PreviewSection
            title={isCampaign ? "Copertina" : "Immagine contestuale"}
            icon={ImageIcon}
          >
            {imageUrl ? (
              <div className="flex justify-center overflow-hidden rounded-lg bg-barber-dark/50 p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={title}
                  className={cn(
                    "w-full object-contain",
                    isCampaign ? "max-h-[min(50vh,28rem)] object-cover" : "max-h-[min(65vh,40rem)]"
                  )}
                />
              </div>
            ) : isThinking && pendingProposal.phase === "awaiting_image" ? (
              <div className="flex items-center gap-2 text-xs text-barber-paper/60">
                <ImageIcon className="h-4 w-4 shrink-0 animate-pulse text-barber-gold/70" />
                {isCampaign ? "Generazione copertina in corso…" : "Generazione immagine in corso…"}
              </div>
            ) : pendingProposal.phase === "awaiting_image" ? (
              <div className="flex items-center gap-2 text-xs text-barber-paper/50">
                <ImageIcon className="h-4 w-4 shrink-0" />
                {isCampaign
                  ? "Rispondi in chat (**sì** / **no**) per generare o saltare la copertina."
                  : "Rispondi in chat (**sì** / **no**) per generare o saltare l'immagine."}
              </div>
            ) : null}
          </PreviewSection>
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

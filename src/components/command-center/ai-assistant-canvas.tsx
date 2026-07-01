"use client";

import Image from "next/image";
import { BookOpen, CheckCircle2, ImageIcon, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChatPendingProposalPayload } from "@/modules/command-center/ai-control-plane/draft-assistant.types";

const ACTION_LABELS: Record<string, string> = {
  "wiki.entity.create": "Entità wiki",
  "gm.note.create": "Nota GM",
  "mission.create": "Missione",
  "session.create": "Sessione",
  "workspace.task.create": "Task",
  "workspace.page.create": "Pagina",
  "campaign.create": "Campagna",
};

type AiAssistantCanvasProps = {
  pendingProposal: ChatPendingProposalPayload | null;
  executedSummary: string | null;
  isThinking: boolean;
  campaignName?: string | null;
};

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function AiAssistantCanvas({
  pendingProposal,
  executedSummary,
  isThinking,
  campaignName,
}: AiAssistantCanvasProps) {
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
            : "Qui comparirà il risultato: testo wiki, missioni, note e immagini generate dall'assistente."}
        </p>
        {campaignName ? (
          <p className="mt-4 text-xs text-barber-gold/70">Campagna: {campaignName}</p>
        ) : (
          <p className="mt-4 text-xs text-amber-400/80">Seleziona una campagna per le voci wiki contestuali.</p>
        )}
      </div>
    );
  }

  const preview = pendingProposal.preview_payload;
  const input = pendingProposal.input;
  const wikiDraft = pendingProposal.wikiMeta?.markdownDraft;

  const title =
    pickText(preview.title, preview.name, input.title, pendingProposal.wikiMeta?.entityTitle) ||
    "Senza titolo";
  const type = pickText(preview.type, input.type, pendingProposal.wikiMeta?.entityType);
  const content =
    wikiDraft?.description ||
    pickText(preview.content, preview.contentMarkdown, input.content);
  const statblock = wikiDraft?.statblock?.trim() || "";
  const imageUrl = pickText(preview.imageUrl, input.imageUrl) || null;
  const actionLabel = ACTION_LABELS[pendingProposal.action_name] ?? pendingProposal.action_name;

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
            {pendingProposal.phase === "awaiting_image" ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] text-amber-300">
                Decisione immagine
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
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        ) : pendingProposal.phase === "awaiting_image" ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-barber-gold/25 bg-barber-dark/50 px-3 py-2 text-xs text-barber-paper/50">
            <ImageIcon className="h-4 w-4 shrink-0" />
            Immagine non ancora generata — rispondi in chat.
          </div>
        ) : null}

        {content ? (
          <section className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-barber-gold/80">
              <BookOpen className="h-3.5 w-3.5" />
              Contenuto
            </h4>
            <div className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">{content}</p>
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

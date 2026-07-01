"use client";

import { useTransition } from "react";
import { Bot, CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AiActionRequestRow } from "@/modules/command-center/types";
import {
  executeAiProposalAction,
  rejectAiProposalAction,
} from "@/modules/command-center/server/actions";

const ACTION_LABELS: Record<string, string> = {
  "workspace.task.create": "Nuovo task",
  "workspace.page.create": "Nuova pagina",
  "command.input.capture": "Input grezzo",
  "campaign.create": "Nuova campagna",
  "campaign.update": "Aggiorna campagna",
  "gm.note.create": "Nota GM",
  "gm.note.update": "Aggiorna nota GM",
  "session.create": "Nuova sessione",
  "session.update": "Aggiorna sessione",
  "session.close": "Chiudi sessione",
  "wiki.entity.create": "Entità wiki",
  "wiki.entity.update": "Aggiorna wiki",
  "wiki.entity.delete": "Elimina wiki",
  "mission.create": "Nuova missione",
  "mission.update": "Aggiorna missione",
  "character.create": "Nuovo PG",
  "character.update": "Aggiorna PG",
  "campaign.aiContext.generate": "Contesto AI campagna",
  "memory.reindex": "Reindicizza memoria",
};

type AiProposalPanelProps = {
  proposals: AiActionRequestRow[];
  onProposalRejected?: (id: string) => void;
  onProposalExecuted?: (id: string, actionName: string) => void;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolvePreviewData(
  preview: Record<string, unknown>,
  input: Record<string, unknown>
): { fields: Record<string, unknown>; error: string | null } {
  const nestedInput = asRecord(preview.input);
  if (typeof preview.error === "string" && preview.error) {
    return { fields: { ...input, ...nestedInput }, error: preview.error };
  }
  if (nestedInput) {
    return { fields: { ...nestedInput, ...preview }, error: null };
  }
  return { fields: { ...input, ...preview }, error: null };
}

function pickText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function summarizeInput(actionName: string, input: Record<string, unknown>): string {
  const title = pickText(input.title, input.name);
  if (title) return title;
  if (actionName === "wiki.entity.create" && typeof input.type === "string") {
    return `Wiki ${input.type}`;
  }
  return "Dettagli in anteprima";
}

function hasPreviewError(preview: Record<string, unknown>): boolean {
  return typeof preview.error === "string" && preview.error.trim().length > 0;
}

function PreviewBlock({
  actionName,
  preview,
  input,
}: {
  actionName: string;
  preview: Record<string, unknown>;
  input: Record<string, unknown>;
}) {
  const { fields, error } = resolvePreviewData(preview, input);

  if (error) {
    return <p className="text-[10px] text-red-400/90">{error}</p>;
  }

  const title = pickText(fields.title, fields.name);
  const body = pickText(
    fields.content,
    fields.contentMarkdown,
    fields.contentPreview,
    fields.description
  );

  const meta: string[] = [];
  if (typeof fields.pageType === "string" && fields.pageType) meta.push(`Tipo: ${fields.pageType}`);
  if (typeof fields.type === "string" && fields.type) meta.push(`Tipo: ${fields.type}`);
  if (typeof fields.priority === "string" && fields.priority) meta.push(`Priorità: ${fields.priority}`);
  if (typeof fields.target === "string" && fields.target) meta.push(`Destinazione: ${fields.target}`);
  if (typeof fields.visibility === "string" && fields.visibility) {
    meta.push(`Visibilità: ${fields.visibility}`);
  }

  if (!title && !body && meta.length === 0) {
    const summary = Object.entries(input)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 80) : JSON.stringify(v)}`)
      .join(" · ");
    return (
      <p className="text-[10px] text-barber-paper/50">
        {summary || "Anteprima non disponibile per questa action."}
      </p>
    );
  }

  return (
    <div className="text-[10px] text-barber-paper/60">
      {title ? <p className="font-medium text-barber-paper/80">{title}</p> : null}
      {body ? <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap">{body}</p> : null}
      {meta.length > 0 ? (
        <p className="mt-1 text-barber-paper/40">{meta.join(" · ")}</p>
      ) : null}
      {actionName === "workspace.page.create" && !body ? (
        <p className="mt-1 italic text-barber-paper/40">Pagina senza contenuto markdown ancora.</p>
      ) : null}
    </div>
  );
}

export function AiProposalPanel({
  proposals,
  onProposalRejected,
  onProposalExecuted,
}: AiProposalPanelProps) {
  const [isPending, startTransition] = useTransition();
  const open = proposals.filter((p) => p.status === "proposed");

  function handleReject(id: string) {
    startTransition(async () => {
      const res = await rejectAiProposalAction(id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Proposta scartata");
      onProposalRejected?.(id);
    });
  }

  function handleExecute(proposal: AiActionRequestRow) {
    const label = ACTION_LABELS[proposal.action_name] ?? proposal.action_name;
    const title = summarizeInput(proposal.action_name, proposal.input_payload);
    const ok = window.confirm(
      `Applicare questa bozza AI?\n\n${label}: ${title}\n\nL'azione verrà eseguita nel database.`
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await executeAiProposalAction(proposal.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Bozza applicata");
      onProposalExecuted?.(proposal.id, proposal.action_name);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium text-barber-paper">
        <Bot className="h-4 w-4 text-barber-gold" />
        Bozze AI
        {open.length > 0 ? (
          <span className="rounded-full bg-barber-gold/20 px-1.5 text-[10px] text-barber-gold">
            {open.length}
          </span>
        ) : null}
      </div>
      <p className="text-[10px] text-barber-paper/40">
        Livello 2 — conferma GM richiesta per applicare
      </p>

      <ScrollArea className="max-h-64 pr-1">
        {open.length === 0 ? (
          <p className="text-xs text-barber-paper/50">Nessuna bozza in attesa.</p>
        ) : (
          <ul className="space-y-2">
            {open.map((proposal) => {
              const previewInvalid = hasPreviewError(proposal.preview_payload);
              return (
                <li
                  key={proposal.id}
                  className="rounded-md border border-barber-gold/20 bg-barber-dark/60 p-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-barber-paper">
                        {ACTION_LABELS[proposal.action_name] ?? proposal.action_name}
                      </p>
                      <p className="text-barber-paper/50">
                        {summarizeInput(proposal.action_name, proposal.input_payload)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-barber-paper/30">
                      {new Date(proposal.created_at).toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {proposal.rationale ? (
                    <p className="mt-1 text-[10px] italic text-barber-gold/70">{proposal.rationale}</p>
                  ) : null}

                  <div className="mt-2 rounded border border-barber-gold/10 bg-barber-dark/40 p-1.5">
                    <p className="mb-1 text-[9px] uppercase tracking-wide text-barber-paper/40">
                      Anteprima
                    </p>
                    <PreviewBlock
                      actionName={proposal.action_name}
                      preview={proposal.preview_payload}
                      input={proposal.input_payload}
                    />
                  </div>

                  <div className="mt-2 flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 flex-1 text-[10px]"
                      disabled={isPending || previewInvalid}
                      onClick={() => handleExecute(proposal)}
                    >
                      {isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1 h-3 w-3" />
                      )}
                      Applica
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 flex-1 text-[10px] text-barber-paper/60 hover:text-red-400"
                      disabled={isPending}
                      onClick={() => handleReject(proposal.id)}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Scarta
                    </Button>
                  </div>
                  {previewInvalid ? (
                    <p className="mt-1 text-[10px] text-red-400/80">
                      Anteprima non valida: correggi o scarta la bozza.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

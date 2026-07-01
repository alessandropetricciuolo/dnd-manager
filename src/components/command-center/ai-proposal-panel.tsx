"use client";

import { useTransition } from "react";
import { Bot, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AiActionRequestRow } from "@/modules/command-center/types";
import { rejectAiProposalAction } from "@/modules/command-center/server/actions";

const ACTION_LABELS: Record<string, string> = {
  "workspace.task.create": "Nuovo task",
  "workspace.page.create": "Nuova pagina",
  "wiki.entity.create": "Entità wiki",
  "gm.note.create": "Nota GM",
};

type AiProposalPanelProps = {
  proposals: AiActionRequestRow[];
  onProposalRejected?: (id: string) => void;
};

function summarizeInput(actionName: string, input: Record<string, unknown>): string {
  const title =
    (typeof input.title === "string" && input.title) ||
    (typeof input.name === "string" && input.name) ||
    null;
  if (title) return title;
  if (actionName === "wiki.entity.create" && typeof input.type === "string") {
    return `Wiki ${input.type}`;
  }
  return "Dettagli in anteprima";
}

function PreviewBlock({ preview }: { preview: Record<string, unknown> }) {
  if (preview.error) {
    return <p className="text-[10px] text-red-400/90">{String(preview.error)}</p>;
  }
  const title =
    (typeof preview.title === "string" && preview.title) ||
    (typeof preview.name === "string" && preview.name) ||
    null;
  const content =
    (typeof preview.content === "string" && preview.content.slice(0, 120)) ||
    (typeof preview.contentMarkdown === "string" && preview.contentMarkdown.slice(0, 120)) ||
    (typeof preview.description === "string" && preview.description.slice(0, 120)) ||
    null;

  return (
    <div className="text-[10px] text-barber-paper/60">
      {title ? <p className="font-medium text-barber-paper/80">{title}</p> : null}
      {content ? <p className="mt-0.5 line-clamp-3">{content}</p> : null}
    </div>
  );
}

export function AiProposalPanel({ proposals, onProposalRejected }: AiProposalPanelProps) {
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
        Livello 1 — approvazione ed esecuzione in Fase 4
      </p>

      <ScrollArea className="max-h-64 pr-1">
        {open.length === 0 ? (
          <p className="text-xs text-barber-paper/50">Nessuna bozza in attesa.</p>
        ) : (
          <ul className="space-y-2">
            {open.map((proposal) => (
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
                  <PreviewBlock preview={proposal.preview_payload} />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 w-full text-[10px] text-barber-paper/60 hover:text-red-400"
                  disabled={isPending}
                  onClick={() => handleReject(proposal.id)}
                >
                  {isPending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  Scarta bozza
                </Button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

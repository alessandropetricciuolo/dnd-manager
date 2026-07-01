"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AiActionRequestRow } from "@/modules/command-center/types";
import { runAiDraftAssistantAction } from "@/modules/command-center/server/actions";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intentSummary?: string;
  proposalIds?: string[];
};

type AiAssistantPanelProps = {
  campaignId: string | null;
  noteId?: string | null;
  onProposalsCreated?: (proposals: AiActionRequestRow[]) => void;
};

export function AiAssistantPanel({
  campaignId,
  noteId,
  onProposalsCreated,
}: AiAssistantPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Sono in modalità bozza (Livello 1). Descrivi cosa vuoi preparare: task, pagine workspace, note GM o entità wiki. Propongo azioni senza eseguirle.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleSend() {
    const text = input.trim();
    if (!text || isPending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      const res = await runAiDraftAssistantAction({
        message: text,
        campaignId,
        noteId: noteId ?? null,
      });

      if (!res.success) {
        toast.error(res.error);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: res.error,
          },
        ]);
        return;
      }

      const { reply, intentSummary, proposals } = res.data!;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
          intentSummary,
          proposalIds: proposals.map((p) => p.id),
        },
      ]);

      if (proposals.length > 0) {
        toast.success(
          proposals.length === 1
            ? "1 proposta in bozza"
            : `${proposals.length} proposte in bozza`
        );
        onProposalsCreated?.(proposals);
      }

      router.refresh();
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-barber-gold" />
        <div>
          <h2 className="font-serif text-lg font-semibold text-barber-paper">Assistente GM</h2>
          <p className="text-xs text-barber-paper/50">
            Solo bozze · nessuna scrittura automatica
            {campaignId ? " · campagna selezionata" : ""}
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-[240px] flex-1 rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-3">
        <ul className="space-y-3">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-auto bg-barber-gold/20 text-barber-paper"
                  : "bg-barber-dark/80 text-barber-paper/90"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.intentSummary ? (
                <p className="mt-1 text-[10px] text-barber-paper/40">Intento: {msg.intentSummary}</p>
              ) : null}
              {msg.proposalIds?.length ? (
                <p className="mt-1 text-[10px] text-barber-gold/80">
                  {msg.proposalIds.length} proposta/e nel pannello a destra
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <div ref={scrollRef} />
      </ScrollArea>

      <div className="mt-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Es. Prepara un NPC mercante per la prossima sessione…"
          rows={3}
          disabled={isPending}
          className="min-h-0 flex-1 resize-none border-barber-gold/30 bg-barber-dark/80"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={isPending || !input.trim()}
          className="shrink-0 self-end"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

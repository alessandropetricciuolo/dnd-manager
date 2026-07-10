"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CharacterAiStoryDraft } from "@/lib/ai/character-text-generator";
import {
  chatCharacterStoryAction,
  type CharacterTextChatTurn,
} from "@/lib/actions/character-text-chat";

export type CharacterTextGenChatMessage = CharacterTextChatTurn & { id: string };

type CharacterTextGenChatProps = {
  campaignId: string;
  characterName: string;
  seedStory?: string | null;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  emptyHint?: string;
  onLoadingChange?: (loading: boolean) => void;
  onDraftChange?: (draft: CharacterAiStoryDraft | null) => void;
  onResolvedName?: (name: string) => void;
};

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CharacterTextGenChat({
  campaignId,
  characterName,
  seedStory,
  disabled = false,
  className,
  placeholder = "Descrivi il personaggio o chiedi una modifica alla storia…",
  emptyHint = "Scrivi il prompt iniziale e premi Invia. Poi potrai affinare la storia come in una chat.",
  onLoadingChange,
  onDraftChange,
  onResolvedName,
}: CharacterTextGenChatProps) {
  const [messages, setMessages] = useState<CharacterTextGenChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [storyDraft, setStoryDraft] = useState<CharacterAiStoryDraft | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || disabled) return;

    const userMessage: CharacterTextGenChatMessage = {
      id: newMessageId(),
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const turns: CharacterTextChatTurn[] = nextMessages.map(({ role, content }) => ({ role, content }));
      const result = await chatCharacterStoryAction(
        campaignId,
        characterName,
        turns,
        storyDraft,
        messages.length === 0 ? { seedStory } : undefined
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const assistantMessage: CharacterTextGenChatMessage = {
        id: newMessageId(),
        role: "assistant",
        content: result.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setStoryDraft(result.draft);
      onDraftChange?.(result.draft);
      if (result.resolvedName) {
        onResolvedName?.(result.resolvedName);
      }
    } catch {
      toast.error("Errore durante la chat AI.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="rounded-lg border border-barber-gold/30 bg-barber-dark/50">
        <ScrollArea className="h-[min(280px,40vh)]">
          <div className="space-y-3 p-3">
            {!messages.length && !loading ? (
              <p className="text-xs leading-relaxed text-barber-paper/55">{emptyHint}</p>
            ) : null}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-6 border border-barber-gold/25 bg-barber-gold/10 text-barber-paper"
                    : "mr-6 border border-barber-gold/15 bg-barber-dark/80 text-barber-paper/90"
                )}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-barber-gold/70">
                  {msg.role === "user" ? "Tu" : "IA"}
                </p>
                <div className="whitespace-pre-wrap text-xs sm:text-sm">{msg.content}</div>
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 px-1 text-xs text-barber-paper/70">
                <Loader2 className="h-4 w-4 animate-spin text-barber-gold" />
                Generazione in corso…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="min-h-[72px] flex-1 resize-y border-barber-gold/30 bg-barber-dark text-barber-paper"
        />
        <Button
          type="button"
          className="h-auto shrink-0 self-end bg-barber-red text-barber-paper hover:bg-barber-red/90"
          disabled={disabled || loading || !input.trim()}
          onClick={() => void handleSend()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="mr-1.5 h-4 w-4" />
              Invia
            </>
          )}
        </Button>
      </div>

      {messages.length > 0 ? (
        <p className="flex items-center gap-1.5 text-[11px] text-barber-paper/50">
          <Sparkles className="h-3 w-3 text-barber-gold/70" />
          La bozza riguarda solo la storia narrativa; razza, classe e background PHB restano nel form.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Send, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import {
  refineWikiImageAction,
  type WikiImageChatTurn,
} from "@/lib/actions/wiki-image-chat";

export type WikiImageRefineChatMessage = WikiImageChatTurn & { id: string };

type WikiImageRefineChatProps = {
  campaignId: string;
  entityType: WikiImageEntityKind;
  baseDescription: string;
  imageUrl: string;
  onImageChange: (url: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

function newMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function WikiImageRefineChat({
  campaignId,
  entityType,
  baseDescription,
  imageUrl,
  onImageChange,
  disabled = false,
  className,
}: WikiImageRefineChatProps) {
  const [messages, setMessages] = useState<WikiImageRefineChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentImageUrl(imageUrl);
  }, [imageUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || disabled) return;

    const userMessage: WikiImageRefineChatMessage = {
      id: newMessageId(),
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const turns: WikiImageChatTurn[] = nextMessages.map(({ role, content }) => ({ role, content }));
      const result = await refineWikiImageAction(
        campaignId,
        entityType,
        currentImageUrl,
        baseDescription,
        turns
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const assistantMessage: WikiImageRefineChatMessage = {
        id: newMessageId(),
        role: "assistant",
        content: result.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentImageUrl(result.publicUrl);
      await onImageChange(result.publicUrl);
      toast.success("Immagine aggiornata.");
    } catch {
      toast.error("Errore durante la modifica immagine.");
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
    <div className={cn("space-y-3 rounded-lg border border-barber-gold/25 bg-barber-dark/45 p-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-barber-paper">
        <Wand2 className="h-4 w-4 text-barber-gold" />
        Modifica immagine via prompt
      </div>
      <p className="text-xs text-barber-paper/60">
        La prima generazione resta ancorata al testo wiki. Qui puoi chiedere aggiustamenti visivi
        («più luce calda», «aggiungi una cicatrice», «sfondo più cupo»…).
      </p>

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-barber-gold/30 bg-black/40">
        <Image
          src={currentImageUrl}
          alt="Anteprima immagine corrente"
          fill
          className="object-contain"
          unoptimized
        />
      </div>

      {messages.length > 0 ? (
        <ScrollArea className="h-[min(160px,24vh)] rounded-md border border-barber-gold/20">
          <div className="space-y-2 p-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-md px-2.5 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "ml-4 border border-barber-gold/25 bg-barber-gold/10 text-barber-paper"
                    : "mr-4 border border-barber-gold/15 bg-barber-dark/80 text-barber-paper/85"
                )}
              >
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-barber-gold/70">
                  {msg.role === "user" ? "Tu" : "IA"}
                </p>
                {msg.content}
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 px-1 text-xs text-barber-paper/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-barber-gold" />
                Applicazione modifica…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      ) : null}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Es: aggiungi una cicatrice sul viso, luce più calda, mantieni la stessa posa…"
          disabled={disabled || loading}
          className="min-h-[64px] flex-1 resize-y border-barber-gold/30 bg-barber-dark text-barber-paper text-sm"
        />
        <Button
          type="button"
          className="h-auto shrink-0 self-end bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
          disabled={disabled || loading || !input.trim()}
          onClick={() => void handleSend()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

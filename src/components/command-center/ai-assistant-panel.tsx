"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatPendingProposalPayload } from "@/modules/command-center/ai-control-plane/draft-assistant.types";
import { runAiChatAssistantAction } from "@/modules/command-center/server/actions";
import { buildCommandInputFromVoice } from "@/modules/command-center/voice/command-input-voice";
import { useVoiceDictation } from "@/modules/command-center/voice/use-voice-dictation";
import {
  VoiceInterimHint,
  VoiceMicButton,
} from "@/components/command-center/voice-capture-button";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  fromVoice?: boolean;
  intentSummary?: string;
  hasPendingProposal?: boolean;
};

type AiAssistantPanelProps = {
  campaignId: string | null;
  noteId?: string | null;
};

export function AiAssistantPanel({ campaignId, noteId }: AiAssistantPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [pendingProposal, setPendingProposal] = useState<ChatPendingProposalPayload | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Sono l'assistente GM del Command Center. Descrivi cosa vuoi creare o modificare — ti rispondo in chat con la proposta completa. Conferma con «conferma» o «applica», annulla con «annulla», oppure chiedi modifiche.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const voice = useVoiceDictation({
    language: "it-IT",
    onFinalTranscript: (transcript, durationMs) => {
      if (!transcript.trim() || isPending) return;
      submitMessage(transcript, buildCommandInputFromVoice(transcript, { durationMs }));
    },
  });

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error]);

  function submitMessage(
    text: string,
    voicePayload?: ReturnType<typeof buildCommandInputFromVoice>
  ) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      fromVoice: Boolean(voicePayload),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const currentPending = pendingProposal;

    startTransition(async () => {
      const res = await runAiChatAssistantAction({
        message: trimmed,
        campaignId,
        noteId: noteId ?? null,
        pendingProposal: currentPending,
        source: voicePayload?.source ?? "text",
        transcript: voicePayload?.transcript ?? null,
        language: voicePayload?.language ?? "it",
        voiceMetadata: voicePayload?.metadata,
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

      const { reply, intentSummary, pendingProposal: nextPending, executed, clearedPending } =
        res.data!;

      if (clearedPending) {
        setPendingProposal(null);
      } else if (nextPending) {
        setPendingProposal(nextPending);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
          intentSummary,
          hasPendingProposal: Boolean(nextPending) && !clearedPending,
        },
      ]);

      if (executed) {
        toast.success("Proposta applicata");
      }

      router.refresh();
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  function handleSend() {
    submitMessage(input);
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-barber-gold" />
        <div>
          <h2 className="font-serif text-lg font-semibold text-barber-paper">Assistente GM</h2>
          <p className="text-xs text-barber-paper/50">
            Testo o voce · conferma in chat
            {campaignId ? " · campagna selezionata" : ""}
            {pendingProposal ? " · proposta in attesa" : ""}
          </p>
        </div>
      </div>

      <ScrollArea className="min-h-[280px] flex-1 rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-3">
        <ul className="space-y-3">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={cn(
                "max-w-[95%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "ml-auto bg-barber-gold/20 text-barber-paper"
                  : "bg-barber-dark/80 text-barber-paper/90"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.fromVoice ? (
                <p className="mt-1 text-[10px] text-barber-paper/40">Input vocale</p>
              ) : null}
              {msg.intentSummary ? (
                <p className="mt-1 text-[10px] text-barber-paper/40">Intento: {msg.intentSummary}</p>
              ) : null}
              {msg.hasPendingProposal ? (
                <p className="mt-2 text-[10px] text-barber-gold/80">
                  In attesa: scrivi conferma, annulla o descrivi modifiche.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <div ref={scrollRef} />
      </ScrollArea>

      <VoiceInterimHint
        listening={voice.isListening}
        interim={voice.interimTranscript}
        finalPreview={voice.finalTranscript}
      />

      <div className="mt-2 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            pendingProposal
              ? "conferma, annulla o descrivi modifiche…"
              : "Scrivi o usa il microfono…"
          }
          rows={3}
          disabled={isPending || voice.isListening}
          className="min-h-0 flex-1 resize-none border-barber-gold/30 bg-barber-dark/80"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex shrink-0 flex-col gap-1 self-end">
          <VoiceMicButton voice={voice} disabled={isPending} />
          <Button type="button" onClick={handleSend} disabled={isPending || !input.trim() || voice.isListening}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

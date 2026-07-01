"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ChatPendingProposalPayload } from "@/modules/command-center/ai-control-plane/draft-assistant.types";
import { runAiChatAssistantAction } from "@/modules/command-center/server/actions";
import { buildCommandInputFromVoice } from "@/modules/command-center/voice/command-input-voice";
import { useVoiceDictation } from "@/modules/command-center/voice/use-voice-dictation";
import {
  VoiceInterimHint,
  VoiceMicButton,
} from "@/components/command-center/voice-capture-button";
import { AiAssistantCanvas } from "@/components/command-center/ai-assistant-canvas";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  fromVoice?: boolean;
  intentSummary?: string;
  hasPendingProposal?: boolean;
  pendingPhase?: "text" | "awaiting_image";
};

type AiAssistantPanelProps = {
  campaignId: string | null;
  campaigns?: { id: string; name: string }[];
  noteId?: string | null;
  onCampaignChange?: (campaignId: string | null) => void;
  fullBleed?: boolean;
};

export function AiAssistantPanel({
  campaignId,
  campaigns = [],
  noteId,
  onCampaignChange,
  fullBleed = false,
}: AiAssistantPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [pendingProposal, setPendingProposal] = useState<ChatPendingProposalPayload | null>(null);
  const [executedSummary, setExecutedSummary] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Descrivi cosa vuoi creare. Per le voci wiki uso lo stesso motore del form di creazione. L'anteprima completa è nel pannello a destra.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const campaignName =
    campaignId && campaigns.length
      ? campaigns.find((c) => c.id === campaignId)?.name ?? null
      : null;

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

  useEffect(() => {
    if (isPending) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isPending, messages.length]);

  function submitMessage(
    text: string,
    voicePayload?: ReturnType<typeof buildCommandInputFromVoice>
  ) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    setExecutedSummary(null);

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

      if (executed) {
        const title =
          typeof currentPending?.input?.title === "string"
            ? currentPending.input.title
            : null;
        setExecutedSummary(
          title ? `«${title}» applicato con successo.` : "Proposta applicata con successo."
        );
        toast.success("Proposta applicata");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply,
          intentSummary,
          hasPendingProposal: Boolean(nextPending) && !clearedPending,
          pendingPhase: nextPending?.phase,
        },
      ]);

      router.refresh();
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  function handleSend() {
    submitMessage(input);
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-[calc(100vh-12rem)] flex-col",
        fullBleed ? "w-full" : "mx-auto w-full max-w-6xl"
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-barber-gold" />
          <div>
            <h2 className="font-serif text-lg font-semibold text-barber-paper">Assistente GM</h2>
            <p className="text-xs text-barber-paper/50">
              Chat a sinistra · anteprima a destra
              {pendingProposal?.phase === "awaiting_image"
                ? " · decisione immagine"
                : pendingProposal
                  ? " · proposta attiva"
                  : ""}
            </p>
          </div>
        </div>
        {campaigns.length > 0 && onCampaignChange ? (
          <Select
            value={campaignId ?? "all"}
            onValueChange={(v) => onCampaignChange(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[220px] border-barber-gold/30 bg-barber-dark/80 text-sm">
              <SelectValue placeholder="Campagna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le campagne</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
        {/* Chat */}
        <div className="relative flex min-h-[360px] flex-col rounded-xl border border-barber-gold/20 bg-barber-dark/40">
          <ScrollArea className="min-h-0 flex-1 p-3">
            <ul className="space-y-3 pb-2">
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
                      {msg.pendingPhase === "awaiting_image"
                        ? "→ Rispondi sì/no per l'immagine"
                        : "→ Vedi anteprima a destra"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div ref={scrollRef} />
          </ScrollArea>

          {isPending ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-10 flex justify-center px-3"
              aria-live="polite"
            >
              <div className="animate-pulse rounded-full border border-barber-gold/40 bg-barber-dark/95 px-4 py-2 text-sm text-barber-gold shadow-lg backdrop-blur-sm">
                Sto pensando…
              </div>
            </div>
          ) : null}

          <div className="border-t border-barber-gold/15 p-3">
            <VoiceInterimHint
              listening={voice.isListening}
              interim={voice.interimTranscript}
              finalPreview={voice.finalTranscript}
            />
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  pendingProposal?.phase === "awaiting_image"
                    ? "sì / no / annulla…"
                    : pendingProposal
                      ? "conferma, annulla o modifiche…"
                      : "Scrivi o usa il microfono…"
                }
                rows={2}
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
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isPending || !input.trim() || voice.isListening}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <AiAssistantCanvas
          pendingProposal={pendingProposal}
          executedSummary={executedSummary}
          isThinking={isPending}
          campaignName={campaignName}
        />
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ChatPendingPhase, ChatPendingProposalPayload } from "@/modules/command-center/ai-control-plane/draft-assistant.types";
import {
  truncateSelectionPreview,
  type PreviewTextSelection,
} from "@/modules/command-center/ai-control-plane/preview-text-selection";
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
  pendingPhase?: ChatPendingPhase;
};

type AiAssistantPanelProps = {
  campaignId: string | null;
  campaigns?: { id: string; name: string }[];
  noteId?: string | null;
  onCampaignChange?: (campaignId: string | null) => void;
  fullBleed?: boolean;
  hideCampaignSelector?: boolean;
};

export function AiAssistantPanel({
  campaignId,
  campaigns = [],
  noteId,
  onCampaignChange,
  fullBleed = false,
  hideCampaignSelector = false,
}: AiAssistantPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [pendingProposal, setPendingProposal] = useState<ChatPendingProposalPayload | null>(null);
  const [previewTextSelection, setPreviewTextSelection] = useState<PreviewTextSelection | null>(
    null
  );
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (!pendingProposal) {
      setPreviewTextSelection(null);
    }
  }, [pendingProposal]);

  function handlePreviewTextSelect(selection: PreviewTextSelection) {
    setPreviewTextSelection(selection);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

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

    const currentSelection = previewTextSelection;

    startTransition(async () => {
      const res = await runAiChatAssistantAction({
        message: trimmed,
        campaignId,
        noteId: noteId ?? null,
        pendingProposal: currentPending,
        previewTextSelection: currentSelection,
        recentUserMessages: messages
          .filter((m) => m.role === "user" && m.id !== userMsg.id)
          .slice(-4)
          .map((m) => m.content),
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
        setPreviewTextSelection(null);
      } else if (nextPending) {
        setPendingProposal(nextPending);
        if (currentSelection && intentSummary?.includes("Modifica mirata")) {
          setPreviewTextSelection(null);
        }
      }

      if (executed) {
        const title =
          typeof currentPending?.input?.title === "string"
            ? currentPending.input.title
            : typeof currentPending?.input?.name === "string"
              ? currentPending.input.name
              : typeof currentPending?.input?.sourceName === "string" &&
                  typeof currentPending?.input?.targetName === "string"
                ? `${currentPending.input.sourceName} → ${currentPending.input.targetName}`
                : typeof currentPending?.preview_payload?.scheduledAt === "string"
                  ? String(currentPending.preview_payload.scheduledAt)
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
        "flex h-full min-h-0 flex-col",
        fullBleed ? "w-full" : "mx-auto w-full max-w-6xl"
      )}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        {!(fullBleed && hideCampaignSelector) ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-barber-gold/10 ring-1 ring-barber-gold/20">
              <Sparkles className="h-4 w-4 text-barber-gold" />
            </div>
            <div>
              <h2 className="font-serif text-base font-semibold text-barber-paper sm:text-lg">
                Assistente GM
              </h2>
              <p className="text-[11px] text-barber-paper/50">
                Chat · anteprima live
                {pendingProposal?.phase === "awaiting_sheet"
                  ? " · scheda PDF"
                  : pendingProposal?.phase === "awaiting_avatar"
                    ? " · ritratto"
                    : pendingProposal?.phase === "awaiting_image"
                      ? " · immagine"
                      : pendingProposal?.phase === "awaiting_architect"
                        ? " · paletti IA"
                        : pendingProposal
                          ? " · in revisione"
                          : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-barber-paper/45">
            {pendingProposal?.phase === "awaiting_image"
              ? "Rispondi in chat per l'immagine"
              : pendingProposal
                ? "Conferma o modifica dall'anteprima"
                : "Descrivi cosa vuoi creare"}
          </p>
        )}
        {!hideCampaignSelector && campaigns.length > 0 && onCampaignChange ? (
          <Select
            value={campaignId ?? "all"}
            onValueChange={(v) => onCampaignChange(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9 w-[200px] border-barber-gold/20 bg-barber-dark/60 text-sm ring-1 ring-white/5">
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

      <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(200px,36%)_minmax(0,1fr)] gap-2.5 lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)] lg:grid-rows-none lg:gap-3">
        {/* Chat */}
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-barber-dark/35 ring-1 ring-inset ring-white/[0.06]">
          <div className="scrollbar-barber-y min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <ul className="space-y-2.5 pb-2">
              {messages.map((msg) => (
                <li
                  key={msg.id}
                  className={cn(
                    "max-w-[92%] text-sm leading-relaxed",
                    msg.role === "user" ? "ml-auto" : "mr-auto"
                  )}
                >
                  <div
                    className={cn(
                      "px-3.5 py-2.5",
                      msg.role === "user"
                        ? "rounded-2xl rounded-br-md bg-barber-gold/12 text-barber-paper ring-1 ring-barber-gold/15"
                        : "rounded-2xl rounded-bl-md bg-white/[0.04] text-barber-paper/90 ring-1 ring-white/[0.06]"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.fromVoice ? (
                    <p className="mt-1 px-1 text-[10px] text-barber-paper/40">Input vocale</p>
                  ) : null}
                  {msg.intentSummary ? (
                    <p className="mt-1 px-1 text-[10px] text-barber-paper/40">Intento: {msg.intentSummary}</p>
                  ) : null}
                  {msg.hasPendingProposal ? (
                    <p className="mt-1.5 px-1 text-[10px] text-barber-gold/75">
                      {msg.pendingPhase === "awaiting_image"
                        ? "→ Rispondi sì/no per l'immagine"
                        : msg.pendingPhase === "awaiting_architect"
                          ? "→ Rispondi sì/no per i paletti IA"
                          : "→ Vedi anteprima a destra"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div ref={scrollRef} />
          </div>

          {isPending ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-[5.5rem] z-10 flex justify-center px-3"
              aria-live="polite"
            >
              <div className="animate-pulse rounded-full border border-barber-gold/30 bg-barber-dark/95 px-4 py-2 text-sm text-barber-gold shadow-lg backdrop-blur-sm">
                Sto pensando…
              </div>
            </div>
          ) : null}

          <div className="shrink-0 border-t border-white/[0.06] bg-barber-dark/40 p-3 backdrop-blur-sm">
            {previewTextSelection ? (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-barber-gold/30 bg-barber-gold/10 px-3 py-2 text-xs text-barber-paper/90">
                <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-barber-gold" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-barber-gold">
                    Modifica selezione
                    {previewTextSelection.sectionLabel
                      ? ` · ${previewTextSelection.sectionLabel}`
                      : ""}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-barber-paper/70">
                    «{truncateSelectionPreview(previewTextSelection.selectedText)}»
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-barber-paper/50 hover:text-barber-paper"
                  onClick={() => setPreviewTextSelection(null)}
                  aria-label="Annulla selezione"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <VoiceInterimHint
              listening={voice.isListening}
              interim={voice.interimTranscript}
              finalPreview={voice.finalTranscript}
            />
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  previewTextSelection
                    ? "Descrivi come modificare il testo selezionato…"
                    : pendingProposal?.phase === "awaiting_image" ||
                  pendingProposal?.phase === "awaiting_avatar"
                    ? "sì / no / annulla…"
                    : pendingProposal?.phase === "awaiting_architect"
                      ? "sì / no / annulla…"
                      : pendingProposal?.phase === "awaiting_sheet"
                        ? "completa la scheda a destra, poi conferma…"
                    : pendingProposal
                      ? "conferma, annulla o modifiche…"
                      : "Scrivi o usa il microfono…"
                }
                rows={2}
                disabled={isPending || voice.isListening}
                className="min-h-0 flex-1 resize-none border-barber-gold/20 bg-barber-dark/50 ring-1 ring-white/5"
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
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <AiAssistantCanvas
          pendingProposal={pendingProposal}
          executedSummary={executedSummary}
          isThinking={isPending}
          campaignName={campaignName}
          campaignId={campaignId}
          previewTextSelection={previewTextSelection}
          onPreviewTextSelect={handlePreviewTextSelect}
          onPendingProposalChange={setPendingProposal}
        />
        </div>
      </div>
    </div>
  );
}

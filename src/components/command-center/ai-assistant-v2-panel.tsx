"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle, MapPin, ScrollText, Send, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { confirmAiAssistantV2Save, generateAiAssistantV2Image, prepareAiAssistantV2Save, reviseAiAssistantV2Artifact, runAiAssistantV2Turn } from "@/modules/command-center/server/ai-v2-actions";
import type { AiAssistantArtifact, AiAssistantSourceRef } from "@/modules/command-center/ai-v2/contracts";
import { AiAssistantV2ArtifactCard } from "./ai-assistant-v2-artifact-card";
import { AiAssistantV2Sources } from "./ai-assistant-v2-sources";

type Message = { role: "user" | "assistant"; content: string };
type MobileView = "chat" | "draft";

const welcomeMessage: Message = { role: "assistant", content: "Cosa prepariamo per la campagna?" };
const quickPrompts = [
  { label: "NPC", prompt: "Crea un NPC", icon: UserRound },
  { label: "Luogo", prompt: "Crea un luogo", icon: MapPin },
  { label: "Statblock", prompt: "Genera uno statblock", icon: ScrollText },
] as const;

export function AiAssistantV2Panel({ campaignId }: { campaignId: string | null }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [artifact, setArtifact] = useState<AiAssistantArtifact | null>(null);
  const [sources, setSources] = useState<AiAssistantSourceRef[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [preparedAction, setPreparedAction] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setThreadId(null); setArtifact(null); setSources([]); setPreparedAction(null); setMobileView("chat"); setMessages([welcomeMessage]);
  }, [campaignId]);

  function send(message = input) {
    const value = message.trim();
    if (!value || isPending) return;
    setInput(""); setPreparedAction(null); setMessages((current) => [...current, { role: "user", content: value }]);
    startTransition(async () => {
      const res = await runAiAssistantV2Turn({ campaignId, message: value, threadId: threadId ?? undefined });
      if (!res.success) { toast.error(res.error); return; }
      setThreadId(res.data.threadId);
      let next = res.data.artifact;
      if (res.data.intent === "generate_image" && next && campaignId) {
        const image = await generateAiAssistantV2Image({ campaignId, artifactId: next.id });
        if (!image.success) toast.error(image.error); else next = image.data;
      }
      const reply = res.data.assistantMessage;
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      if (next) { setArtifact(next); setMobileView("draft"); }
      setSources(res.data.evidence.filter((source) => reply.includes(`[${source.evidenceId}]`)));
    });
  }

  function chooseQuickPrompt(prompt: string) {
    setInput((current) => current.trim() ? `${current.trim()} ${prompt.toLowerCase()}` : prompt);
    inputRef.current?.focus();
  }

  function prepareSave() {
    if (!artifact) return;
    startTransition(async () => {
      const content = String(artifact.payload.content ?? "");
      const persisted = await reviseAiAssistantV2Artifact({ artifactId: artifact.id, revision: artifact.revision, content });
      if (!persisted.success) { toast.error(persisted.error); return; }
      setArtifact(persisted.data);
      const res = await prepareAiAssistantV2Save({ artifactId: persisted.data.id, revision: persisted.data.revision });
      if (!res.success) { toast.error(res.error); return; }
      setPreparedAction(res.data.actionName); toast.success("Anteprima pronta: conferma per salvare nella campagna");
    });
  }

  function confirmSave() {
    if (!artifact || !preparedAction) return;
    startTransition(async () => {
      const res = await confirmAiAssistantV2Save({ artifactId: artifact.id, revision: artifact.revision, actionName: preparedAction });
      if (!res.success) { toast.error(res.error); return; }
      setArtifact({ ...artifact, status: "saved", savedEntity: res.data }); toast.success("Artefatto salvato nella campagna");
    });
  }

  const hasDraft = Boolean(artifact);
  const draftPanel = artifact ? <div className="min-h-0 flex-1 overflow-y-auto pr-1"><AiAssistantV2ArtifactCard artifact={artifact} prepared={Boolean(preparedAction)} onEdit={(content) => { setPreparedAction(null); setArtifact({ ...artifact, payload: { ...artifact.payload, content } }); }} onRegenerate={() => send("Rigenera questa bozza mantenendo il contesto")} onDiscard={() => { setPreparedAction(null); setArtifact(null); setMobileView("chat"); toast.message("Bozza scartata"); }} onPrepare={prepareSave} onConfirm={confirmSave} />{sources.length ? <div className="mt-3"><AiAssistantV2Sources sources={sources} /></div> : null}</div> : null;

  return <div className="flex h-full min-h-0 flex-col bg-gradient-to-br from-[#17131a] via-[#100e14] to-[#0b0a10]">
    <header className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-2.5 sm:px-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-barber-gold" aria-hidden="true" /><p className="text-sm font-medium text-barber-paper">Assistente</p></div><span className="rounded-full border border-barber-gold/25 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-barber-gold">{campaignId ? "Campagna" : "Scegli campagna"}</span></header>
    {hasDraft ? <div className="flex shrink-0 border-b border-white/[0.07] p-2 lg:hidden" role="tablist" aria-label="Vista assistente"><button type="button" role="tab" aria-selected={mobileView === "chat"} aria-controls="assistant-chat-panel" onClick={() => setMobileView("chat")} className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-colors ${mobileView === "chat" ? "bg-white/[0.08] text-barber-paper" : "text-barber-paper/50"}`}>Chat</button><button type="button" role="tab" aria-selected={mobileView === "draft"} aria-controls="assistant-draft-panel" onClick={() => setMobileView("draft")} className={`relative min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-colors ${mobileView === "draft" ? "bg-barber-gold/15 text-barber-gold" : "text-barber-paper/50"}`}>Bozza<span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-barber-gold align-middle" aria-label="Bozza pronta" /></button></div> : null}
    <div className={`flex min-h-0 flex-1 p-3 sm:p-4 lg:p-5 ${hasDraft ? "lg:grid lg:grid-cols-2 lg:gap-5 lg:overflow-hidden" : ""}`}>
      <section id="assistant-chat-panel" role="tabpanel" className={`${hasDraft && mobileView !== "chat" ? "hidden lg:flex" : "flex"} min-h-0 flex-1 flex-col rounded-2xl border border-white/[0.07] bg-black/10 p-3 sm:p-4`} aria-label="Conversazione con l'assistente">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-barber-gold/15 px-3 py-2 text-sm leading-6 text-barber-paper" : "max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-sm leading-6 text-barber-paper/80"}>{message.content}</div>)}{isPending ? <div className="flex max-w-[92%] items-center gap-2 rounded-2xl rounded-bl-sm border border-barber-gold/20 bg-barber-gold/10 px-3 py-2 text-sm text-barber-paper/80" role="status"><LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-barber-gold" aria-hidden="true" /><span>Sto preparando la bozza…</span><span className="sr-only">Attendi prima di inviare una nuova richiesta.</span></div> : null}</div>
        <div className="mt-3 shrink-0 border-t border-white/[0.07] pt-3">{campaignId ? <div className="mb-2 flex gap-2 overflow-x-auto pb-1" aria-label="Azioni rapide">{quickPrompts.map(({ label, prompt, icon: Icon }) => <button key={label} type="button" onClick={() => chooseQuickPrompt(prompt)} disabled={isPending} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-barber-paper/70 transition-colors hover:border-barber-gold/35 hover:text-barber-gold disabled:opacity-50"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</button>)}</div> : null}<div className="flex gap-2"><Textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Scrivi una richiesta…" className="min-h-12 resize-none border-white/10 bg-barber-dark/70" disabled={isPending} aria-describedby={isPending ? "ai-assistant-pending" : undefined} /><Button onClick={() => send()} disabled={isPending || !input.trim()} className="h-12 self-end px-3" aria-label={isPending ? "L'assistente sta lavorando" : "Invia richiesta"}>{isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}</Button></div>{isPending ? <p id="ai-assistant-pending" className="sr-only" aria-live="polite">Elaborazione in corso.</p> : null}</div>
      </section>
      {hasDraft ? <section id="assistant-draft-panel" role="tabpanel" className={`${mobileView !== "draft" ? "hidden lg:flex" : "flex"} min-h-0 flex-1 flex-col pt-3 lg:pt-0`} aria-label="Bozza corrente">{draftPanel}</section> : null}
    </div>
  </div>;
}

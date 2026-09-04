"use client";

import { Check, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AiAssistantArtifact } from "@/modules/command-center/ai-v2/contracts";

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : "—";
const labelFor: Record<string, string> = { race: "Razza", class: "Classe", age: "Età", statblock: "Statblock", relationships: "Rapporti", loot: "Loot", gm_notes: "Note GM", is_chapter: "È capitolo", summary: "Riassunto", hp: "PF", ac: "CA", cr: "GS", attacks: "Attacchi e azioni" };

function Field({ label, value }: { label: string; value: unknown }) {
  return <div className="min-w-0 rounded-lg border border-white/[0.07] bg-black/10 px-2.5 py-2"><dt className="text-[10px] font-medium uppercase tracking-wide text-barber-paper/45">{label}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-barber-paper/85">{typeof value === "boolean" ? (value ? "Sì" : "No") : text(value)}</dd></div>;
}

function WikiPreview({ payload }: { payload: Record<string, unknown> }) {
  const input = asRecord(payload.actionInput); const attributes = asRecord(input.attributes); const stats = asRecord(attributes.combat_stats); const audiences = asRecord(input.audiences); const relations = Array.isArray(input.relations) ? input.relations : []; const tags = Array.isArray(input.tags) ? input.tags.filter((tag): tag is string => typeof tag === "string") : [];
  const detailKeys = input.type === "monster" ? ["statblock", "loot", "gm_notes"] : input.type === "npc" ? ["race", "class", "age", "statblock", "relationships", "loot", "gm_notes"] : input.type === "location" ? ["loot", "gm_notes"] : input.type === "lore" ? ["is_chapter", "summary", "gm_notes"] : ["gm_notes"];
  return <div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><Field label="Tipo" value={input.type} /><Field label="Visibilità" value={input.visibility} /><Field label="Tag" value={tags.length ? tags.join(", ") : "—"} /><Field label="Ordine / capitolo" value={input.sortOrder} /><Field label="Elemento core" value={input.isCore} /><Field label="Memoria IA" value={input.includeInCampaignAiMemory} /><Field label="Missione collegata" value={input.linkedMissionId} /><Field label="PE" value={input.type === "monster" ? input.xpValue : "—"} /></div>{input.type === "monster" ? <dl className="grid gap-2 sm:grid-cols-3">{["hp", "ac", "cr", "attacks"].map((key) => <Field key={key} label={labelFor[key]} value={stats[key]} />)}</dl> : null}<dl className="grid gap-2 sm:grid-cols-2">{detailKeys.map((key) => <Field key={key} label={labelFor[key]} value={attributes[key]} />)}</dl><Field label="Pubblico selettivo" value={`Utenti: ${(Array.isArray(audiences.userIds) ? audiences.userIds.length : 0)} · Gruppi: ${(Array.isArray(audiences.partyIds) ? audiences.partyIds.length : 0)}`} /><Field label="Relazioni Wiki / mappa" value={relations.length ? relations.map((relation) => { const row = asRecord(relation); return `${text(row.label)} · ${row.targetType === "map" ? "Mappa" : "Wiki"}`; }).join("\n") : "—"} /><div className="rounded-lg border border-white/[0.07] bg-black/10 px-2.5 py-2"><p className="text-[10px] font-medium uppercase tracking-wide text-barber-paper/45">Testo Markdown</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-barber-paper/85">{text(input.content ?? payload.content)}</p></div></div>;
}

export function AiAssistantV2ArtifactCard({ artifact, prepared, onRegenerate, onDiscard, onPrepare, onConfirm }: { artifact: AiAssistantArtifact; prepared: boolean; onEdit: (content: string) => void; onRegenerate: () => void; onDiscard: () => void; onPrepare: () => void; onConfirm: () => void }) {
  const wiki = artifact.kind === "wiki" || artifact.payload.actionName === "wiki.entity.create" || artifact.payload.actionName === "wiki.entity.update";
  const actionInput = asRecord(artifact.payload.actionInput);
  const actionImageUrl = actionInput.imageUrl;
  const imageUrl: string | null = typeof artifact.payload.imageUrl === "string"
    ? artifact.payload.imageUrl
    : typeof actionImageUrl === "string"
      ? actionImageUrl
      : null;
  return <article className="rounded-2xl border border-barber-gold/25 bg-barber-dark/70 p-4 shadow-[0_12px_35px_rgba(0,0,0,.18)]"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-barber-gold">Bozza · revisione {artifact.revision}</p><h3 className="mt-1 font-serif text-lg text-barber-paper">{String(artifact.payload.title ?? "Artefatto narrativo")}</h3><p className="mt-1 text-xs text-barber-paper/45">{wiki ? "Anteprima completa: modifica anche un solo campo scrivendolo in chat." : "Per cambiarla, scrivi la modifica in chat."}</p></div><span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-200">{artifact.status === "saved" ? "Salvato" : prepared ? "Pronta per conferma" : "Non salvato"}</span></div>{imageUrl ? <img src={imageUrl} alt={String(artifact.payload.title ?? "Immagine generata")} className="mb-3 aspect-square w-full rounded-xl object-cover" /> : null}{wiki ? <WikiPreview payload={artifact.payload} /> : null}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={onRegenerate}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Rigenera</Button><Button size="sm" variant="outline" onClick={onDiscard}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Scarta</Button><Button size="sm" variant="outline" onClick={onPrepare} disabled={artifact.status === "saved"}><Save className="mr-1.5 h-3.5 w-3.5" />Prepara salvataggio</Button><Button size="sm" onClick={onConfirm} disabled={!prepared || artifact.status === "saved"}><Check className="mr-1.5 h-3.5 w-3.5" />Conferma e salva</Button></div></article>;
}

"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Sparkles, Loader2, ImageIcon } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageSourceField } from "@/components/ui/image-source-field";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "@/components/wiki/tags-input";
import {
  createEntity,
  generateWikiQuickAiAction,
  type WikiGeneratorEntityType,
} from "@/app/campaigns/wiki-actions";
import { generateFullAiWikiEntity } from "@/lib/actions/ai-wiki-chain";
import { generateContextualPortraitAction } from "@/lib/actions/ai-generator";
import { generateWikiMarkdownAction } from "@/lib/ai/wiki-text-generator";
import { getWikiEntitiesForCampaign, getMapsForCampaign } from "@/app/campaigns/entity-graph-actions";
import { getEmptyAttributes } from "@/types/wiki";
import { CHALLENGE_RATING_OPTIONS } from "@/lib/dnd-constants";

const ENTITY_TYPES = [
  { value: "npc", label: "NPC" },
  { value: "location", label: "Luogo" },
  { value: "monster", label: "Mostro" },
  { value: "item", label: "Oggetto" },
  { value: "lore", label: "Lore" },
] as const;

/** Tipi supportati dal generatore rapido AI (Fase 2). */
const MAGIC_ENTITY_TYPES: { value: WikiGeneratorEntityType; label: string }[] = [
  { value: "npc", label: "NPC" },
  { value: "location", label: "Luogo" },
  { value: "item", label: "Oggetto" },
  { value: "lore", label: "Lore" },
];

function appendCombatStatsToMarkdown(
  content: string,
  hp: string | null,
  ac: string | null
): string {
  const parts = [hp ? `**PF:** ${hp}` : "", ac ? `**CA:** ${ac}` : ""].filter(Boolean);
  if (!parts.length) return content;
  return `${content}\n\n---\n${parts.join(" · ")}`;
}

type EntityType = (typeof ENTITY_TYPES)[number]["value"];

const VISIBILITY_OPTIONS = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
] as const;

type CreateEntityDialogProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  eligiblePlayers?: { id: string; label: string }[];
};

const defaultAttributes = (type: EntityType) =>
  getEmptyAttributes(type) as Record<string, unknown>;

const ITEM_RARITY_OPTIONS = [
  "Comune",
  "Non Comune",
  "Raro",
  "Molto Raro",
  "Leggendario",
  "Artefatto",
] as const;

export function CreateEntityDialog({
  campaignId,
  campaignType,
  eligiblePlayers = [],
}: CreateEntityDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<EntityType>("npc");
  const [attributes, setAttributes] = useState<Record<string, unknown>>(defaultAttributes("npc"));
  const [sortOrder, setSortOrder] = useState<string>("");
  const [visibility, setVisibility] = useState<string>("public");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isCore, setIsCore] = useState(false);
  const showCoreCheckbox = campaignType === "long" && (type === "npc" || type === "monster");
  const [monsterXp, setMonsterXp] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [titleValue, setTitleValue] = useState("");
  const [contentValue, setContentValue] = useState("");
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState("");
  const [magicEntityType, setMagicEntityType] = useState<WikiGeneratorEntityType>("npc");
  const [magicLoading, setMagicLoading] = useState(false);
  const [aiTextLoading, setAiTextLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiCr, setAiCr] = useState("");
  const [aiRarity, setAiRarity] = useState("");
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [wikiImageUrlPreset, setWikiImageUrlPreset] = useState<string | null>(null);
  const [magicPortraitPreview, setMagicPortraitPreview] = useState<string | null>(null);
  /** Fasi UX durante la catena server (testo → immagine) per NPC/Luogo. */
  const [magicChainPhase, setMagicChainPhase] = useState<"text" | "image">("text");
  type RelationRow = { targetType: "wiki" | "map"; targetId: string; label: string };
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [wikiOptions, setWikiOptions] = useState<{ id: string; name: string }[]>([]);
  const [mapOptions, setMapOptions] = useState<{ id: string; name: string }[]>([]);

  function onTypeChange(newType: string) {
    const t = newType as EntityType;
    setType(t);
    const next = defaultAttributes(t) as Record<string, unknown>;
    const currentGmNotes = attributes.gm_notes ?? "";
    if (typeof currentGmNotes === "string") next.gm_notes = currentGmNotes;
    setAttributes(next);
    setSortOrder("");
    if (t === "monster") setMonsterXp(0);
  }

  function setAttr(path: string, value: unknown) {
    setAttributes((prev) => {
      const next = { ...prev };
      if (path.includes(".")) {
        const [key, sub] = path.split(".");
        const obj = (next[key] as Record<string, unknown>) ?? {};
        (next as Record<string, unknown>)[key] = { ...obj, [sub]: value };
      } else {
        (next as Record<string, unknown>)[path] = value;
      }
      return next;
    });
  }

  function getAttr(path: string): string {
    const parts = path.split(".");
    let v: unknown = attributes;
    for (const p of parts) v = (v as Record<string, unknown>)?.[p];
    return String(v ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("campaign_id", campaignId);
    formData.set("title", titleValue.trim());
    formData.set("content", contentValue);
    formData.set("attributes", JSON.stringify(attributes));
    formData.set("visibility", visibility);
    formData.set("allowed_user_ids", JSON.stringify(visibility === "selective" ? selectedPlayerIds : []));
    if (sortOrder.trim() !== "") formData.set("sort_order", sortOrder.trim());
    if (showCoreCheckbox && isCore) formData.set("is_core", "on");
    formData.set("relations", JSON.stringify(relations));

    setIsLoading(true);
    try {
      const result = await createEntity(campaignId, formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        form.reset();
        setTitleValue("");
        setContentValue("");
        setType("npc");
        setAttributes(defaultAttributes("npc"));
        setSortOrder("");
        setTags([]);
        setRelations([]);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  async function injectGeneratedImageAsFile(imageUrl: string) {
    const formEl = formRef.current;
    if (!formEl) throw new Error("Form non disponibile.");

    const targetInput = formEl.querySelector<HTMLInputElement>('input[type="file"][name="image"]');
    if (!targetInput) throw new Error("Input file originale non trovato.");

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Immagine AI non scaricabile.");
    const blob = await response.blob();
    const file = new File([blob], `ai-generated-${Date.now()}.png`, {
      type: blob.type || "image/png",
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    targetInput.files = dataTransfer.files;
    targetInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function handleAssistGenerateText() {
    if (aiTextLoading || isLoading) return;
    const safeName = titleValue.trim();
    if (!safeName) {
      toast.error("Inserisci prima il Titolo dell'elemento.");
      return;
    }
    if (type !== "monster" && type !== "item") {
      toast.error("Assistente testo disponibile per Mostri e Oggetti.");
      return;
    }
    setAiTextLoading(true);
    try {
      const result = await generateWikiMarkdownAction(
        campaignId,
        type === "monster" ? "monster" : "magic_item",
        safeName,
        type === "monster" ? { cr: aiCr.trim() } : { rarity: aiRarity.trim() }
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setContentValue(result.markdown);
      toast.success("Markdown IA generato e inserito nel contenuto.");
    } catch {
      toast.error("Errore durante la generazione del testo AI.");
    } finally {
      setAiTextLoading(false);
    }
  }

  async function handleAssistGenerateImage() {
    if (aiImageLoading || isLoading) return;
    const description = contentValue.trim() || titleValue.trim();
    if (!description) {
      toast.error("Compila almeno titolo o descrizione prima di generare l'immagine.");
      return;
    }
    setAiImageLoading(true);
    try {
      const imageEntityType: "npc" | "location" = type === "location" ? "location" : "npc";
      const result = await generateContextualPortraitAction(campaignId, description, imageEntityType);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      await injectGeneratedImageAsFile(result.publicUrl);
      setAiImagePreview(result.publicUrl);
      setWikiImageUrlPreset(null);
      setMagicPortraitPreview(null);
      toast.success("Immagine AI generata e caricata nel file input originale.");
    } catch {
      toast.error("Errore durante la generazione/iniezione immagine AI.");
    } finally {
      setAiImageLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      getWikiEntitiesForCampaign(campaignId).then((r) => r.success && setWikiOptions(r.data));
      getMapsForCampaign(campaignId).then((r) => r.success && setMapOptions(r.data));
    } else {
      setTitleValue("");
      setContentValue("");
      setMagicOpen(false);
      setMagicPrompt("");
      setMagicEntityType("npc");
      setWikiImageUrlPreset(null);
      setMagicPortraitPreview(null);
      setAiImagePreview(null);
      setAiCr("");
      setAiRarity("");
    }
  }

  function handleMagicDialogOpenChange(next: boolean) {
    setMagicOpen(next);
    if (!next) {
      setMagicPortraitPreview(null);
      setMagicChainPhase("text");
    }
  }

  useEffect(() => {
    if (!magicLoading) return;
    const fullChain = magicEntityType === "npc" || magicEntityType === "location";
    if (!fullChain) {
      setMagicChainPhase("text");
      return;
    }
    setMagicChainPhase("text");
    const id = window.setTimeout(() => setMagicChainPhase("image"), 4500);
    return () => window.clearTimeout(id);
  }, [magicLoading, magicEntityType]);

  async function handleMagicGenerate() {
    if (magicLoading) return;
    const p = magicPrompt.trim();
    if (!p) {
      toast.error("Descrivi cosa vuoi creare.");
      return;
    }
    setMagicLoading(true);
    setMagicChainPhase("text");
    try {
      const fullChain = magicEntityType === "npc" || magicEntityType === "location";

      if (fullChain) {
        const res = await generateFullAiWikiEntity(campaignId, p, magicEntityType);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        const { title, content, hp, ac, imageUrl, imageWarning } = res.data;
        onTypeChange(magicEntityType);
        const body = appendCombatStatsToMarkdown(content, hp, ac);
        setTitleValue(title);
        setContentValue(body);
        if (imageUrl) {
          setWikiImageUrlPreset(imageUrl);
          setMagicPortraitPreview(imageUrl);
        } else {
          setWikiImageUrlPreset(null);
          setMagicPortraitPreview(null);
        }
        if (imageWarning) {
          toast.warning(`Immagine non generata: ${imageWarning}`, { duration: 8000 });
        }
        toast.success(
          "Bozza completa pronta. Controlla titolo, testo e immagine nel form sottostante, poi premi Crea."
        );
        return;
      }

      const res = await generateWikiQuickAiAction(campaignId, p, magicEntityType);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      const { title, content, hp, ac } = res.data;
      onTypeChange(magicEntityType);
      const body = appendCombatStatsToMarkdown(content, hp, ac);
      setTitleValue(title);
      setContentValue(body);
      setWikiImageUrlPreset(null);
      setMagicPortraitPreview(null);
      toast.success("Bozza testo pronta. Controlla il form sottostante e premi Crea.");
    } catch {
      toast.error("Errore durante la generazione.");
    } finally {
      setMagicLoading(false);
      setMagicChainPhase("text");
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Nuova voce
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col gap-2 border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader className="shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <DialogTitle className="text-left">Nuova voce wiki</DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-violet-500/50 text-violet-200 hover:bg-violet-500/15 hover:text-violet-100"
              onClick={() => setMagicOpen(true)}
              disabled={isLoading}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              🪄 Generazione Magica AI
            </Button>
          </div>
          <DialogDescription className="text-barber-paper/70">
            Aggiungi un NPC, un luogo, un mostro, un oggetto o una voce di lore. Usa la bacchetta per
            una bozza guidata dall&apos;AI (consigliato configurare prima &quot;L&apos;Anima della Campagna&quot; nel tab Solo GM).
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-scroll overflow-x-hidden py-1 pr-1">
          <div className="space-y-2">
            <Label htmlFor="entity-title">Titolo</Label>
            <Input
              id="entity-title"
              name="title"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Es. Taverna del Drago"
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity-type">Tipo</Label>
            <select
              id="entity-type"
              name="type"
              required
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              disabled={isLoading}
            >
              {ENTITY_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {showCoreCheckbox && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="entity-is-core"
                checked={isCore}
                onChange={(e) => setIsCore(e.target.checked)}
                className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
              />
              <Label htmlFor="entity-is-core" className="text-barber-paper/90">
                NPC/Mostro Core (stato vita/morte condiviso nella campagna)
              </Label>
            </div>
          )}

          <ImageSourceField
            fileInputName="image"
            urlFieldName="image_url"
            label="Immagine (opzionale)"
            disabled={isLoading}
            presetUrl={wikiImageUrlPreset}
            fileExtraAction={
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleAssistGenerateImage()}
                disabled={isLoading || aiImageLoading}
                className="border-violet-500/50 text-violet-200 hover:bg-violet-500/15 hover:text-violet-100"
              >
                {aiImageLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>✨ Genera Immagine con IA (Opzionale)</>
                )}
              </Button>
            }
          />
          {aiImagePreview && (
            <p className="text-xs text-violet-200/85">
              Immagine IA pronta: è stata iniettata nel file input originale.
            </p>
          )}

          <TagsInput value={tags} onChange={setTags} disabled={isLoading} />

          {/* Relazioni & Mappe */}
          <div className="space-y-2">
            <Label className="text-barber-paper/90">Relazioni &amp; Mappe</Label>
            <p className="text-xs text-barber-paper/60">
              Collega questa voce ad altre voci wiki o a mappe. Le relazioni appariranno nella Mappa Concettuale (Solo GM).
            </p>
            {relations.map((rel, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/80 p-2">
                <div className="flex-1 min-w-[100px]">
                  <Label className="text-xs">Tipo bersaglio</Label>
                  <select
                    value={rel.targetType}
                    onChange={(e) =>
                      setRelations((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], targetType: e.target.value as "wiki" | "map", targetId: "" };
                        return next;
                      })
                    }
                    className="mt-0.5 flex h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                    disabled={isLoading}
                  >
                    <option value="wiki">Voce Wiki</option>
                    <option value="map">Mappa</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Label className="text-xs">Bersaglio</Label>
                  <select
                    value={rel.targetId}
                    onChange={(e) =>
                      setRelations((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], targetId: e.target.value };
                        return next;
                      })
                    }
                    className="mt-0.5 flex h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                    disabled={isLoading}
                  >
                    <option value="">— Seleziona —</option>
                    {rel.targetType === "wiki"
                      ? wikiOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))
                      : mapOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[100px]">
                  <Label className="text-xs">Etichetta legame</Label>
                  <Input
                    value={rel.label}
                    onChange={(e) =>
                      setRelations((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], label: e.target.value };
                        return next;
                      })
                    }
                    placeholder="Es. Vive qui, Nascondiglio"
                    className="mt-0.5 h-9 bg-barber-dark border-barber-gold/30 text-barber-paper text-sm"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-barber-paper/60 hover:text-barber-red"
                  onClick={() => setRelations((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-barber-gold/40 text-barber-paper/90"
              onClick={() => setRelations((prev) => [...prev, { targetType: "wiki", targetId: "", label: "" }])}
              disabled={isLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi relazione
            </Button>
          </div>

          {/* Contenuto principale (storia/descrizione) */}
          <div className="space-y-2">
            <Label htmlFor="entity-content">
              {type === "lore" ? "Testo" : "Storia / Descrizione"}
            </Label>
            {(type === "monster" || type === "item") && (
              <div className="rounded-md border border-violet-500/30 bg-violet-950/20 p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="space-y-2">
                    {type === "monster" ? (
                      <>
                        <Label htmlFor="assist-cr" className="text-xs text-violet-100">
                          Grado di Sfida (CR) opzionale
                        </Label>
                        <Input
                          id="assist-cr"
                          value={aiCr}
                          onChange={(e) => setAiCr(e.target.value)}
                          placeholder="Es. 5"
                          disabled={isLoading || aiTextLoading}
                          className="bg-barber-dark border-violet-500/35 text-barber-paper"
                        />
                      </>
                    ) : (
                      <>
                        <Label htmlFor="assist-rarity" className="text-xs text-violet-100">
                          Rarità oggetto opzionale
                        </Label>
                        <select
                          id="assist-rarity"
                          value={aiRarity}
                          onChange={(e) => setAiRarity(e.target.value)}
                          disabled={isLoading || aiTextLoading}
                          className="flex h-10 w-full rounded-md border border-violet-500/35 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="">— Scegli rarità —</option>
                          {ITEM_RARITY_OPTIONS.map((rarity) => (
                            <option key={rarity} value={rarity}>
                              {rarity}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleAssistGenerateText()}
                    disabled={isLoading || aiTextLoading}
                    className="border-violet-500/50 text-violet-200 hover:bg-violet-500/15 hover:text-violet-100"
                  >
                    {aiTextLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generazione...
                      </>
                    ) : (
                      <>✨ Genera Testo con IA (Opzionale)</>
                    )}
                  </Button>
                </div>
              </div>
            )}
            <Textarea
              id="entity-content"
              name="content"
              value={contentValue}
              onChange={(e) => setContentValue(e.target.value)}
              placeholder="Descrizione in Markdown..."
              className="min-h-[120px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          {/* Campi dinamici per tipo */}
          {type === "npc" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="attr-relationships">Rapporti interpersonali</Label>
                <Textarea
                  id="attr-relationships"
                  value={getAttr("relationships")}
                  onChange={(e) => setAttr("relationships", e.target.value)}
                  placeholder="Relazioni con altri NPC, fazioni..."
                  className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-loot-npc">Loot</Label>
                <Textarea
                  id="attr-loot-npc"
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  placeholder="Oggetti che può avere o lasciare..."
                  className="min-h-[60px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "location" && (
            <div className="space-y-2">
              <Label htmlFor="attr-loot-location">Loot</Label>
              <Textarea
                id="attr-loot-location"
                value={getAttr("loot")}
                onChange={(e) => setAttr("loot", e.target.value)}
                placeholder="Tesori nascosti, oggetti nel luogo..."
                className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
          )}

          {type === "monster" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="attr-hp">HP</Label>
                  <Input
                    id="attr-hp"
                    value={getAttr("combat_stats.hp")}
                    onChange={(e) => setAttr("combat_stats.hp", e.target.value)}
                    placeholder="Es. 45"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr-ac">AC</Label>
                  <Input
                    id="attr-ac"
                    value={getAttr("combat_stats.ac")}
                    onChange={(e) => setAttr("combat_stats.ac", e.target.value)}
                    placeholder="Es. 15"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr-cr">Grado di Sfida (GS)</Label>
                  <select
                    id="attr-cr"
                    value={getAttr("combat_stats.cr")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAttr("combat_stats.cr", val);
                      const xp = CHALLENGE_RATING_OPTIONS.find((o) => o.value === val)?.xp;
                      if (xp != null) setMonsterXp(xp);
                    }}
                    className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
                    disabled={isLoading}
                  >
                    <option value="">— Scegli GS —</option>
                    {CHALLENGE_RATING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monster-xp">Punti Esperienza (PE)</Label>
                  <Input
                    id="monster-xp"
                    name="xp_value"
                    type="number"
                    min={0}
                    value={monsterXp || ""}
                    onChange={(e) => setMonsterXp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="Da GS o manuale"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-barber-paper/60">Impostati dal GS sopra; modificabili a mano se serve.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-attacks">Attacchi / Azioni speciali</Label>
                <Textarea
                  id="attr-attacks"
                  value={getAttr("combat_stats.attacks")}
                  onChange={(e) => setAttr("combat_stats.attacks", e.target.value)}
                  placeholder="Descrizione attacchi e azioni..."
                  className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-loot-monster">Loot</Label>
                <Textarea
                  id="attr-loot-monster"
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  placeholder="Tesoro che può lasciare..."
                  className="min-h-[60px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "lore" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="entity-sort-order">Numero capitolo</Label>
                <Input
                  id="entity-sort-order"
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="Es. 1 (per ordinare come Capitolo 1)"
                  className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
                <p className="text-xs text-barber-paper/60">
                  Opzionale. Usato per mostrare le voci Lore come indice (Capitolo 1, 2, 3...).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-summary">Riassunto</Label>
                <Textarea
                  id="attr-summary"
                  value={getAttr("summary")}
                  onChange={(e) => setAttr("summary", e.target.value)}
                  placeholder="Breve riassunto (box collassabile nella lettura)..."
                  className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Visibilità</Label>
            <select
              name="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-barber-paper"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {visibility === "selective" && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-barber-gold/30 bg-barber-dark/60 p-2">
                <p className="mb-2 text-xs font-medium text-barber-paper/80">Giocatori che possono vedere questa voce</p>
                {eligiblePlayers.length === 0 ? (
                  <p className="text-xs text-barber-paper/50">Nessun giocatore iscritto alla campagna.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {eligiblePlayers.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper">
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.includes(p.id)}
                          onChange={() =>
                            setSelectedPlayerIds((prev) =>
                              prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                            )
                          }
                          className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity-gm-notes" className="text-barber-gold/90">
              Note GM (solo visibili a te e agli admin)
            </Label>
            <Textarea
              id="entity-gm-notes"
              value={getAttr("gm_notes")}
              onChange={(e) => setAttr("gm_notes", e.target.value)}
              placeholder="Appunti, reminder, idee per la sessione..."
              className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/40"
              disabled={isLoading}
            />
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-barber-gold/20 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="border-barber-gold/40 text-barber-paper/80"
            >
              Annulla
            </Button>
            <SubmitButton
              pending={isLoading}
              loadingText="Creazione..."
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              Crea
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={magicOpen} onOpenChange={handleMagicDialogOpenChange}>
      <DialogContent className="border-violet-500/40 bg-barber-dark text-barber-paper sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-100">
            <Sparkles className="h-5 w-5 text-violet-300" />
            Generazione Magica AI
          </DialogTitle>
          <DialogDescription className="text-barber-paper/65">
            Un solo passaggio: per NPC e Luoghi generiamo testo dettagliato e immagine coerente con quel testo
            (non con la tua frase iniziale). Oggetto e Lore: solo testo. Poi controlli tutto nel form e premi
            Crea.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="magic-prompt">Cosa vuoi creare?</Label>
            <Textarea
              id="magic-prompt"
              value={magicPrompt}
              onChange={(e) => setMagicPrompt(e.target.value)}
              placeholder="Es: Un oste burbero"
              className="min-h-[80px] resize-y border-barber-gold/30 bg-barber-dark text-barber-paper"
              disabled={magicLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="magic-entity-type">Tipo di entità</Label>
            <select
              id="magic-entity-type"
              value={magicEntityType}
              onChange={(e) => setMagicEntityType(e.target.value as WikiGeneratorEntityType)}
              disabled={magicLoading}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
            >
              {MAGIC_ENTITY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {magicLoading && (
            <div
              className="flex items-start gap-3 rounded-lg border border-violet-500/35 bg-violet-950/30 p-3 text-sm text-violet-100"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-violet-300" />
              <div>
                <p className="font-medium">
                  {magicEntityType === "npc" || magicEntityType === "location"
                    ? magicChainPhase === "text"
                      ? "Tessendo la trama (generazione testo)…"
                      : "Dipingendo il volto (generazione immagine coerente col testo)…"
                    : "Tessendo la trama (generazione testo)…"}
                </p>
                <p className="mt-1 text-xs text-barber-paper/70">
                  Non chiudere questa finestra: al termine i campi del form si compileranno da soli.
                </p>
              </div>
            </div>
          )}

          {!magicLoading && magicPortraitPreview && (magicEntityType === "npc" || magicEntityType === "location") && (
            <div className="space-y-2 rounded-lg border border-barber-gold/25 bg-barber-dark/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-barber-paper">
                <ImageIcon className="h-4 w-4 text-violet-300" />
                Anteprima immagine (già nel form)
              </div>
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-barber-gold/30 bg-black/40">
                <Image
                  src={magicPortraitPreview}
                  alt="Anteprima generazione AI"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="border-barber-gold/40 text-barber-paper"
            onClick={() => setMagicOpen(false)}
            disabled={magicLoading}
          >
            Chiudi
          </Button>
          <Button
            type="button"
            className="bg-violet-600 text-white hover:bg-violet-500"
            onClick={() => void handleMagicGenerate()}
            disabled={magicLoading}
          >
            {magicLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Attendere…
              </>
            ) : magicEntityType === "npc" || magicEntityType === "location" ? (
              <>✨ GENERA ENTITÀ COMPLETA (TESTO + IMMAGINE)</>
            ) : (
              <>✨ GENERA BOZZA AI (SOLO TESTO)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageSourceField } from "@/components/ui/image-source-field";
import { TagsInput } from "@/components/wiki/tags-input";
import { updateEntity, setWikiEntityGlobalStatus } from "@/app/campaigns/wiki-actions";
import { getWikiEntitiesForCampaign, getMapsForCampaign, getWikiRelationshipsForEntity } from "@/app/campaigns/entity-graph-actions";
import { getEmptyAttributes } from "@/types/wiki";
import type { WikiEntity } from "@/app/campaigns/wiki-actions";
import { CHALLENGE_RATING_OPTIONS } from "@/lib/dnd-constants";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { type WikiEntityType, WIKI_ENTITY_OPTIONS } from "@/lib/wiki/entity-types";
import { generateContextualPortraitAction } from "@/lib/actions/ai-generator";
import { AiImageProviderSelect } from "@/components/ai/ai-image-provider-select";
import { useAiImageProvider } from "@/lib/hooks/use-ai-image-provider";

type EntityType = WikiEntityType;

const VISIBILITY_OPTIONS = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
] as const;

type EditEntityDialogProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  entity: WikiEntity;
  contentBody: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
  initialVisibility?: string;
  initialAllowedUserIds?: string[];
  initialAllowedPartyIds?: string[];
};

const defaultAttributes = (type: EntityType) =>
  getEmptyAttributes(type) as Record<string, unknown>;

function mergeAttributes(
  type: EntityType,
  existing: Record<string, unknown> | null
): Record<string, unknown> {
  const def = defaultAttributes(type);
  if (!existing || typeof existing !== "object") return def;
  const merged = { ...def };
  for (const [k, v] of Object.entries(existing)) {
    if (v !== undefined && v !== null) {
      if (typeof v === "object" && !Array.isArray(v) && merged[k] && typeof merged[k] === "object") {
        (merged as Record<string, unknown>)[k] = { ...(merged[k] as object), ...(v as object) };
      } else {
        (merged as Record<string, unknown>)[k] = v;
      }
    }
  }
  return merged;
}

export function EditEntityDialog({
  campaignId,
  campaignType,
  entity,
  contentBody,
  open,
  onOpenChange,
  eligiblePlayers = [],
  eligibleParties = [],
  initialVisibility = "public",
  initialAllowedUserIds = [],
  initialAllowedPartyIds = [],
}: EditEntityDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const { provider: aiImageProvider, setProvider: setAiImageProvider } = useAiImageProvider();
  const [type, setType] = useState<EntityType>((entity.type as EntityType) || "npc");
  const [attributes, setAttributes] = useState<Record<string, unknown>>(() =>
    mergeAttributes((entity.type as EntityType) || "npc", entity.attributes)
  );
  const [sortOrder, setSortOrder] = useState<string>(
    entity.sort_order != null ? String(entity.sort_order) : ""
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [visibility, setVisibility] = useState<string>(initialVisibility);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialAllowedUserIds);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>(initialAllowedPartyIds);
  const [isCore, setIsCore] = useState<boolean>(entity.is_core ?? false);
  const [globalStatus, setGlobalStatus] = useState<"alive" | "dead">(
    entity.global_status === "dead" ? "dead" : "alive"
  );
  const [statusLoading, setStatusLoading] = useState(false);
  const [monsterXp, setMonsterXp] = useState<number>(entity.xp_value ?? 0);
  const [tags, setTags] = useState<string[]>(Array.isArray(entity.tags) ? entity.tags : []);
  type RelationRow = { targetType: "wiki" | "map"; targetId: string; label: string };
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [wikiOptions, setWikiOptions] = useState<{ id: string; name: string }[]>([]);
  const [mapOptions, setMapOptions] = useState<{ id: string; name: string }[]>([]);
  const isLongCampaign = campaignType === "long";
  const showCoreFields = isLongCampaign && (type === "npc" || type === "monster");
  const [includeInAiMemory, setIncludeInAiMemory] = useState(
    () => entity.include_in_campaign_ai_memory ?? false
  );

  useEffect(() => {
    if (open) {
      setType((entity.type as EntityType) || "npc");
      setAttributes(mergeAttributes((entity.type as EntityType) || "npc", entity.attributes));
      setSortOrder(entity.sort_order != null ? String(entity.sort_order) : "");
      setRemoveImage(false);
      setVisibility(initialVisibility);
      setSelectedPlayerIds(initialAllowedUserIds);
      setSelectedPartyIds(initialAllowedPartyIds);
      setIsCore(entity.is_core ?? false);
      setGlobalStatus(entity.global_status === "dead" ? "dead" : "alive");
      setMonsterXp(entity.xp_value ?? 0);
      setIncludeInAiMemory(entity.include_in_campaign_ai_memory ?? false);
      getWikiEntitiesForCampaign(campaignId).then((r) => r.success && setWikiOptions(r.data));
      getMapsForCampaign(campaignId).then((r) => r.success && setMapOptions(r.data));
      getWikiRelationshipsForEntity(campaignId, entity.id).then((r) => r.success && setRelations(r.data));
    }
  }, [
    open,
    campaignId,
    entity.id,
    entity.type,
    entity.attributes,
    entity.sort_order,
    entity.is_core,
    entity.global_status,
    entity.xp_value,
    entity.include_in_campaign_ai_memory,
    initialVisibility,
    initialAllowedUserIds,
    initialAllowedPartyIds,
  ]);

  function onTypeChange(newType: string) {
    const t = newType as EntityType;
    setType(t);
    const next = defaultAttributes(t) as Record<string, unknown>;
    const currentGmNotes = attributes.gm_notes ?? "";
    if (typeof currentGmNotes === "string") next.gm_notes = currentGmNotes;
    setAttributes(next);
    setSortOrder("");
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
    formData.set("attributes", JSON.stringify(attributes));
    formData.set("visibility", visibility);
    formData.set("allowed_user_ids", JSON.stringify(visibility === "selective" ? selectedPlayerIds : []));
    formData.set("allowed_party_ids", JSON.stringify(visibility === "selective" ? selectedPartyIds : []));
    if (sortOrder.trim() !== "") formData.set("sort_order", sortOrder.trim());
    if (removeImage) formData.set("remove_image", "on");
    if (showCoreFields && isCore) formData.set("is_core", "on");
    if (isLongCampaign && includeInAiMemory) formData.set("include_in_campaign_ai_memory", "on");
    formData.set("relations", JSON.stringify(relations));

    setIsLoading(true);
    try {
      const result = await updateEntity(entity.id, campaignId, formData);

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
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

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function injectGeneratedImageAsFile(imageUrl: string) {
    const formEl = formRef.current;
    if (!formEl) throw new Error("Form non disponibile.");

    const targetInput = formEl.querySelector<HTMLInputElement>('input[type="file"][name="image"]');
    if (!targetInput) throw new Error("Input file immagine non trovato.");

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

  async function handleAssistGenerateImage() {
    if (aiImageLoading || isLoading) return;
    if (type !== "npc") {
      toast.error("La generazione immagine in modifica è disponibile per le voci NPC.");
      return;
    }
    const formEl = formRef.current;
    if (!formEl) {
      toast.error("Form non disponibile.");
      return;
    }
    const contentField = formEl.elements.namedItem("content");
    const narrativeDescription = contentField instanceof HTMLTextAreaElement ? contentField.value.trim() : "";
    if (!narrativeDescription) {
      toast.error("Compila la descrizione narrativa prima di generare l'immagine.");
      return;
    }
    setAiImageLoading(true);
    try {
      const result = await generateContextualPortraitAction(
        campaignId,
        narrativeDescription,
        "npc",
        { provider: aiImageProvider }
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      await injectGeneratedImageAsFile(result.publicUrl);
      setRemoveImage(false);
      toast.success("Immagine AI generata e caricata. Premi Salva per applicarla all'NPC.");
    } catch {
      toast.error("Errore durante la generazione/iniezione immagine AI.");
    } finally {
      setAiImageLoading(false);
    }
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-2 border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader className="shrink-0">
          <DialogTitle>Modifica voce wiki</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Modifica titolo, contenuto, immagine e attributi della voce.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-scroll overflow-x-hidden py-1 pr-1">
          <div className="space-y-2">
            <Label htmlFor="edit-entity-title">Titolo</Label>
            <Input
              id="edit-entity-title"
              name="title"
              defaultValue={entity.name}
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              required
              disabled={isLoading}
            />
          </div>
          {showCoreFields && (
            <div className="space-y-2 rounded-md border border-barber-gold/30 bg-barber-dark/50 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-entity-is-core"
                  checked={isCore}
                  onChange={(e) => setIsCore(e.target.checked)}
                  className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                />
                <Label htmlFor="edit-entity-is-core" className="text-barber-paper/90">
                  NPC/Mostro Core (stato vita/morte condiviso nella campagna)
                </Label>
              </div>
              {isCore && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-sm text-barber-paper/70">
                    Stato globale: <strong>{globalStatus === "dead" ? "Morto" : "Vivo"}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                    disabled={statusLoading || globalStatus === "dead"}
                    onClick={async () => {
                      setStatusLoading(true);
                      const res = await setWikiEntityGlobalStatus(entity.id, campaignId, "dead");
                      setStatusLoading(false);
                      if (res.success) {
                        setGlobalStatus("dead");
                        toast.success(res.message);
                        router.refresh();
                      } else toast.error(res.message);
                    }}
                  >
                    Segna morto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                    disabled={statusLoading || globalStatus === "alive"}
                    onClick={async () => {
                      setStatusLoading(true);
                      const res = await setWikiEntityGlobalStatus(entity.id, campaignId, "alive");
                      setStatusLoading(false);
                      if (res.success) {
                        setGlobalStatus("alive");
                        toast.success(res.message);
                        router.refresh();
                      } else toast.error(res.message);
                    }}
                  >
                    Segna vivo
                  </Button>
                </div>
              )}
            </div>
          )}

          {isLongCampaign && (
            <div className="rounded-md border border-violet-500/25 bg-barber-dark/50 p-3">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="edit-entity-ai-memory"
                  checked={includeInAiMemory}
                  onChange={(e) => setIncludeInAiMemory(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-500/40 bg-barber-dark text-violet-400"
                />
                <div className="min-w-0 space-y-1">
                  <Label htmlFor="edit-entity-ai-memory" className="cursor-pointer text-barber-paper/90">
                    Includi nella memoria IA della campagna (cronaca canon)
                  </Label>
                  <p className="text-xs text-barber-paper/60">
                    Titolo e contenuto di questa voce entrano nel contesto quando generi altre schede wiki con
                    l’AI.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-entity-type">Tipo</Label>
            <select
              id="edit-entity-type"
              name="type"
              required
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              disabled={isLoading}
            >
              {WIKI_ENTITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <ImageSourceField
              fileInputName="image"
              urlFieldName="image_url"
              label="Immagine"
              previewUrl={removeImage ? undefined : entity.image_url}
              disabled={isLoading}
              previewClassName="max-w-xs"
            />
            {entity.image_url && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-remove-image"
                  name="remove_image"
                  checked={removeImage}
                  onChange={(e) => setRemoveImage(e.target.checked)}
                  className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                />
                <Label htmlFor="edit-remove-image" className="text-barber-paper/70">
                  Rimuovi immagine
                </Label>
              </div>
            )}
            {type === "npc" && (
              <div className="flex flex-col gap-2 sm:max-w-xs">
                <AiImageProviderSelect
                  id="edit-entity-image-provider"
                  disabled={isLoading || aiImageLoading}
                  value={aiImageProvider}
                  onChange={setAiImageProvider}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleAssistGenerateImage()}
                  disabled={isLoading || aiImageLoading}
                  className="border-barber-gold/40 text-barber-gold"
                >
                  {aiImageLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generazione immagine...
                    </>
                  ) : (
                    "Genera immagine IA (NPC)"
                  )}
                </Button>
              </div>
            )}
          </div>

          <TagsInput value={tags} onChange={setTags} disabled={isLoading} />

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
                      ? wikiOptions.filter((o) => o.id !== entity.id).map((o) => (
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

          <div className="space-y-2">
            <Label htmlFor="edit-entity-content">
              {type === "lore" ? "Testo" : "Storia / Descrizione"}
            </Label>
            <Textarea
              id="edit-entity-content"
              name="content"
              defaultValue={contentBody}
              className="min-h-[120px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          {type === "npc" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="attr-race-npc-edit">Razza</Label>
                  <Input
                    id="attr-race-npc-edit"
                    value={getAttr("race")}
                    onChange={(e) => setAttr("race", e.target.value)}
                    placeholder="Es. Elfo, Nano, Umano..."
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr-class-npc-edit">Classe</Label>
                  <Input
                    id="attr-class-npc-edit"
                    value={getAttr("class")}
                    onChange={(e) => setAttr("class", e.target.value)}
                    placeholder="Es. Mago, Guerriero, Ladro..."
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr-age-npc-edit">Età</Label>
                  <Input
                    id="attr-age-npc-edit"
                    value={getAttr("age")}
                    onChange={(e) => setAttr("age", e.target.value)}
                    placeholder="Es. 42 anni"
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rapporti interpersonali</Label>
                <Textarea
                  value={getAttr("relationships")}
                  onChange={(e) => setAttr("relationships", e.target.value)}
                  className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Loot</Label>
                <Textarea
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  className="min-h-[60px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "location" && (
            <div className="space-y-2">
              <Label>Loot</Label>
              <Textarea
                value={getAttr("loot")}
                onChange={(e) => setAttr("loot", e.target.value)}
                className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
          )}

          {type === "monster" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>HP</Label>
                  <Input
                    value={getAttr("combat_stats.hp")}
                    onChange={(e) => setAttr("combat_stats.hp", e.target.value)}
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>AC</Label>
                  <Input
                    value={getAttr("combat_stats.ac")}
                    onChange={(e) => setAttr("combat_stats.ac", e.target.value)}
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grado di Sfida (GS)</Label>
                  <select
                    value={getAttr("combat_stats.cr")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAttr("combat_stats.cr", val);
                      const xp = CHALLENGE_RATING_OPTIONS.find((o) => o.value === val)?.xp;
                      if (xp != null) setMonsterXp(xp);
                    }}
                    className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
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
                  <Label>Punti Esperienza (PE)</Label>
                  <Input
                    name="xp_value"
                    type="number"
                    min={0}
                    value={monsterXp || ""}
                    onChange={(e) => setMonsterXp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="Da GS o manuale"
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-barber-paper/60">Impostati dal GS; modificabili a mano se serve.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Attacchi / Azioni speciali</Label>
                <Textarea
                  value={getAttr("combat_stats.attacks")}
                  onChange={(e) => setAttr("combat_stats.attacks", e.target.value)}
                  className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Loot</Label>
                <Textarea
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  className="min-h-[60px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "lore" && (
            <>
              <div className="space-y-2">
                <Label>Numero capitolo</Label>
                <Input
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Riassunto</Label>
                <Textarea
                  value={getAttr("summary")}
                  onChange={(e) => setAttr("summary", e.target.value)}
                  className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Visibilità</Label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              disabled={isLoading}
            >
              {VISIBILITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {visibility === "selective" && (
              <div className="mt-2 rounded-md border border-barber-gold/30 bg-barber-dark/60 p-3">
                {eligibleParties.length > 0 && (
                  <>
                    <Label className="text-barber-paper/80">Gruppi che possono vedere questa voce</Label>
                    <ul className="mb-3 mt-2 space-y-2">
                      {eligibleParties.map((party) => (
                        <li key={party.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`edit-entity-party-${party.id}`}
                            checked={selectedPartyIds.includes(party.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPartyIds((prev) => [...prev, party.id]);
                              else setSelectedPartyIds((prev) => prev.filter((id) => id !== party.id));
                            }}
                            className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                            disabled={isLoading}
                          />
                          <Label htmlFor={`edit-entity-party-${party.id}`} className="cursor-pointer text-barber-paper/90">
                            {party.label}
                          </Label>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Label className="text-barber-paper/80">Giocatori che possono vedere questa voce</Label>
                {eligiblePlayers.length === 0 ? (
                  <p className="mt-2 text-xs text-barber-paper/50">Nessun giocatore iscritto alla campagna.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {eligiblePlayers.map((player) => (
                      <li key={player.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`edit-entity-player-${player.id}`}
                          checked={selectedPlayerIds.includes(player.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPlayerIds((prev) => [...prev, player.id]);
                            else setSelectedPlayerIds((prev) => prev.filter((id) => id !== player.id));
                          }}
                          className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                          disabled={isLoading}
                        />
                        <Label htmlFor={`edit-entity-player-${player.id}`} className="cursor-pointer text-barber-paper/90">
                          {player.label}
                        </Label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-entity-gm-notes" className="text-barber-gold/90">
              Note GM (solo visibili a te e agli admin)
            </Label>
            <Textarea
              id="edit-entity-gm-notes"
              value={getAttr("gm_notes")}
              onChange={(e) => setAttr("gm_notes", e.target.value)}
              placeholder="Appunti, reminder, idee per la sessione..."
              className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/40"
              disabled={isLoading}
            />
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-barber-gold/20 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-barber-gold/40 text-barber-paper/80"
            >
              Annulla
            </Button>
            <SubmitButton
              pending={isLoading}
              loadingText="Salvataggio..."
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              Salva
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

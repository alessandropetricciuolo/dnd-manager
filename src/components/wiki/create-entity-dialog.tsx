"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent, type ReactNode } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  ImageIcon,
  ChevronDown,
  IdCard,
  FileText,
  Wand2,
  Share2,
  Lock,
  Notebook,
  Search as SearchIcon,
  Library,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { ImageSourceField } from "@/components/ui/image-source-field";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagsInput } from "@/components/wiki/tags-input";
import { cn } from "@/lib/utils";
import { isValidImageUrl, normalizeImageUrl } from "@/lib/image-url";
import {
  createEntity,
  listCampaignMissionsLiteForGm,
  type WikiGeneratorEntityType,
} from "@/app/campaigns/wiki-actions";
import { generateMagicDraftImageAction } from "@/lib/actions/ai-wiki-chain";
import { WikiTextGenChat } from "@/components/wiki/wiki-text-gen-chat";
import { WikiImageRefineChat } from "@/components/wiki/wiki-image-refine-chat";
import { NameGeneratorField } from "@/components/name-generator/name-generator-field";
import type { NameGeneratorKind } from "@/lib/name-generator/types";
import type { WikiMarkdownChatDraft } from "@/lib/actions/wiki-text-chat";
import type { WikiAiTextGeneration } from "@/lib/ai/generator";
import { generateContextualPortraitAction } from "@/lib/actions/ai-generator";
import {
  searchBestiaryChunksAction,
  listBestiaryMonstersByCrAction,
  fetchExpandedBestiaryChunkAction,
  type BestiarySearchHit,
  type BestiaryListGroup,
} from "@/lib/actions/wiki-bestiary-search-actions";
import { getWikiEntitiesForCampaign, getMapsForCampaign } from "@/app/campaigns/entity-graph-actions";
import { getEmptyAttributes } from "@/types/wiki";
import { CHALLENGE_RATING_OPTIONS } from "@/lib/dnd-constants";
import {
  WIKI_NPC_CLASS_GROUPS,
  WIKI_NPC_CLASS_OPTIONS,
  WIKI_NPC_LEVEL_OPTIONS,
  WIKI_NPC_RACE_OPTIONS,
} from "@/lib/wiki-npc-ai-options";
import { type WikiEntityType, WIKI_ENTITY_LABELS_IT, WIKI_ENTITY_OPTIONS } from "@/lib/wiki/entity-types";

/** Tipi supportati dal generatore rapido AI (Fase 2). */
const MAGIC_ENTITY_TYPES: { value: WikiGeneratorEntityType; label: string }[] = [
  { value: "npc", label: WIKI_ENTITY_LABELS_IT.npc },
  { value: "location", label: WIKI_ENTITY_LABELS_IT.location },
  { value: "item", label: WIKI_ENTITY_LABELS_IT.item },
  { value: "lore", label: WIKI_ENTITY_LABELS_IT.lore },
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

type EntityType = WikiEntityType;

const VISIBILITY_OPTIONS = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
] as const;

type CreateEntityDialogProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
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

/* -------------------------------------------------------------------------- */
/*  FormSection — wrapper visivo coerente per le sezioni del form             */
/* -------------------------------------------------------------------------- */

type FormSectionProps = {
  icon?: ReactNode;
  title: string;
  hint?: string;
  badge?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  tone?: "default" | "private";
  children: ReactNode;
};

function FormSection({
  icon,
  title,
  hint,
  badge,
  collapsible = false,
  defaultOpen = true,
  tone = "default",
  children,
}: FormSectionProps) {
  const isPrivate = tone === "private";

  const wrapperBase = cn(
    "rounded-xl border bg-barber-dark/55 transition-colors",
    isPrivate
      ? "border-violet-500/30 open:border-violet-500/45"
      : "border-barber-gold/25 open:border-barber-gold/40"
  );

  const headerInner = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {icon ? (
        <span className={cn("shrink-0", isPrivate ? "text-violet-300" : "text-barber-gold")}>
          {icon}
        </span>
      ) : null}
      <h3 className="font-serif text-base font-semibold text-barber-paper sm:text-lg">{title}</h3>
      {badge ? <span className="ml-1 shrink-0">{badge}</span> : null}
    </div>
  );

  if (collapsible) {
    return (
      <details open={defaultOpen} className={cn("group", wrapperBase)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 hover:bg-barber-gold/[0.04]">
          {headerInner}
          <div className="flex shrink-0 items-center gap-2">
            {hint ? (
              <span className="hidden text-xs text-barber-paper/55 sm:inline">{hint}</span>
            ) : null}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform group-open:rotate-180",
                isPrivate ? "text-violet-300/70" : "text-barber-gold/70"
              )}
              aria-hidden
            />
          </div>
        </summary>
        <div
          className={cn(
            "space-y-4 border-t px-4 pt-4 pb-4",
            isPrivate ? "border-violet-500/20" : "border-barber-gold/15"
          )}
        >
          {children}
        </div>
      </details>
    );
  }

  return (
    <section className={cn(wrapperBase, "p-4")}>
      <header className="mb-4 flex items-baseline justify-between gap-2">
        {headerInner}
        {hint ? (
          <span className="hidden shrink-0 text-xs text-barber-paper/55 sm:inline">{hint}</span>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export function CreateEntityDialog({
  campaignId,
  campaignType,
  eligiblePlayers = [],
  eligibleParties = [],
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
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [isCore, setIsCore] = useState(false);
  const showCoreCheckbox = campaignType === "long" && (type === "npc" || type === "monster");
  const showAiMemoryCheckbox = campaignType === "long";
  const [includeInAiMemory, setIncludeInAiMemory] = useState(false);
  const [monsterXp, setMonsterXp] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [titleValue, setTitleValue] = useState("");
  const [contentValue, setContentValue] = useState("");
  const [magicOpen, setMagicOpen] = useState(false);
  const [magicEntityType, setMagicEntityType] = useState<WikiGeneratorEntityType>("npc");
  const [magicTextChatLoading, setMagicTextChatLoading] = useState(false);
  const [magicImageLoading, setMagicImageLoading] = useState(false);
  const [magicChatKey, setMagicChatKey] = useState(0);
  const [magicImagePromptSeed, setMagicImagePromptSeed] = useState("");
  const [assistChatLoading, setAssistChatLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiCr, setAiCr] = useState("");
  const [aiRarity, setAiRarity] = useState("");
  const [assistChatKey, setAssistChatKey] = useState(0);
  const [assistChatDraft, setAssistChatDraft] = useState<WikiMarkdownChatDraft | null>(null);
  const [bestiaryQuery, setBestiaryQuery] = useState("");
  const [bestiaryHits, setBestiaryHits] = useState<BestiarySearchHit[]>([]);
  const [bestiaryGroups, setBestiaryGroups] = useState<BestiaryListGroup[]>([]);
  const [bestiaryListLoading, setBestiaryListLoading] = useState(false);
  const [selectedBestiaryListId, setSelectedBestiaryListId] = useState("");
  const [bestiarySearchLoading, setBestiarySearchLoading] = useState(false);
  const [monsterVerbatimStatblock, setMonsterVerbatimStatblock] = useState("");
  const [loadingChunkId, setLoadingChunkId] = useState<string | null>(null);
  const [npcAiRace, setNpcAiRace] = useState("");
  const [npcAiClass, setNpcAiClass] = useState("");
  const [npcAiLevel, setNpcAiLevel] = useState("");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressLabel, setAiProgressLabel] = useState<string | null>(null);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [wikiImageUrlPreset, setWikiImageUrlPreset] = useState<string | null>(null);
  const [magicPortraitPreview, setMagicPortraitPreview] = useState<string | null>(null);
  type MagicDraft = {
    title: string;
    content: string;
    hp: string | null;
    ac: string | null;
    imageUrl: string | null;
    imageWarning?: string;
    entityType: WikiGeneratorEntityType;
  };
  const [magicDraft, setMagicDraft] = useState<MagicDraft | null>(null);
  type RelationRow = { targetType: "wiki" | "map"; targetId: string; label: string };
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [wikiOptions, setWikiOptions] = useState<{ id: string; name: string }[]>([]);
  const [mapOptions, setMapOptions] = useState<{ id: string; name: string }[]>([]);
  const [missionOptions, setMissionOptions] = useState<{ id: string; title: string }[]>([]);
  const [linkedMissionId, setLinkedMissionId] = useState("");
  const aiProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAiProgressTimer() {
    if (aiProgressTimerRef.current) {
      clearInterval(aiProgressTimerRef.current);
      aiProgressTimerRef.current = null;
    }
  }

  function startAiProgress(label: string) {
    clearAiProgressTimer();
    setAiProgressLabel(label);
    setAiProgress(8);
    aiProgressTimerRef.current = setInterval(() => {
      setAiProgress((prev) => (prev >= 92 ? prev : prev + 6));
    }, 650);
  }

  function endAiProgress(success: boolean) {
    clearAiProgressTimer();
    if (success) {
      setAiProgress(100);
      setTimeout(() => {
        setAiProgress(0);
        setAiProgressLabel(null);
      }, 500);
      return;
    }
    setAiProgress(0);
    setAiProgressLabel(null);
  }

  function onTypeChange(newType: string) {
    const t = newType as EntityType;
    setType(t);
    const next = defaultAttributes(t) as Record<string, unknown>;
    const currentGmNotes = attributes.gm_notes ?? "";
    if (typeof currentGmNotes === "string") next.gm_notes = currentGmNotes;
    setAttributes(next);
    setSortOrder("");
    if (t === "monster") {
      setMonsterXp(0);
      setMonsterVerbatimStatblock("");
      setBestiaryHits([]);
      setBestiaryQuery("");
      setSelectedBestiaryListId("");
    }
    if (t === "npc") {
      setNpcAiRace("");
      setNpcAiClass("");
      setNpcAiLevel("");
    }
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

  function parseStatsFromLoadedStatblock(source: string): { hp?: string; ac?: string; cr?: string } {
    const text = source.replace(/\r\n/g, "\n");
    const acMatch =
      text.match(/\*\*Classe Armatura\*\*\s*([^\n]+)/i) ??
      text.match(/\bClasse Armatura\b\s*[:\-]?\s*([^\n]+)/i);
    const hpMatch =
      text.match(/\*\*Punti Ferita\*\*\s*([^\n]+)/i) ??
      text.match(/\bPunti Ferita\b\s*[:\-]?\s*([^\n]+)/i);
    const crMatch =
      text.match(/\*\*Sfida\*\*\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i) ??
      text.match(/\b(?:Sfida|GS|CR)\b\s*[:\-]?\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i);
    return {
      ac: acMatch?.[1]?.trim(),
      hp: hpMatch?.[1]?.trim(),
      cr: crMatch?.[1]?.trim(),
    };
  }

  function applyMonsterSheetStats(stats: { hp?: string; ac?: string; cr?: string }) {
    if (stats.hp) setAttr("combat_stats.hp", stats.hp);
    if (stats.ac) setAttr("combat_stats.ac", stats.ac);
    if (stats.cr) {
      setAttr("combat_stats.cr", stats.cr);
      setAiCr(stats.cr);
      const xp = CHALLENGE_RATING_OPTIONS.find((o) => o.value === stats.cr)?.xp;
      setMonsterXp(xp ?? 0);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("campaign_id", campaignId);
    formData.set("title", titleValue.trim());
    formData.set("content", contentValue);
    const normalizedAttributes: Record<string, unknown> = { ...attributes };
    if (type === "monster") {
      const currentStatblock =
        (typeof normalizedAttributes.statblock === "string" ? normalizedAttributes.statblock : "").trim() ||
        monsterVerbatimStatblock.trim();
      if (currentStatblock) {
        normalizedAttributes.statblock = currentStatblock;
        const parsed = parseStatsFromLoadedStatblock(currentStatblock);
        const existingCombat =
          normalizedAttributes.combat_stats &&
          typeof normalizedAttributes.combat_stats === "object" &&
          !Array.isArray(normalizedAttributes.combat_stats)
            ? (normalizedAttributes.combat_stats as Record<string, unknown>)
            : {};
        const fallbackCr =
          parsed.cr ||
          (typeof existingCombat.cr === "string" ? existingCombat.cr.trim() : "") ||
          aiCr.trim();
        normalizedAttributes.combat_stats = {
          ...existingCombat,
          hp: parsed.hp || (typeof existingCombat.hp === "string" ? existingCombat.hp.trim() : ""),
          ac: parsed.ac || (typeof existingCombat.ac === "string" ? existingCombat.ac.trim() : ""),
          cr: fallbackCr || "",
        };
      }
    }
    formData.set("attributes", JSON.stringify(normalizedAttributes));
    formData.set("visibility", visibility);
    formData.set("allowed_user_ids", JSON.stringify(visibility === "selective" ? selectedPlayerIds : []));
    formData.set("allowed_party_ids", JSON.stringify(visibility === "selective" ? selectedPartyIds : []));
    if (sortOrder.trim() !== "") formData.set("sort_order", sortOrder.trim());
    if (showCoreCheckbox && isCore) formData.set("is_core", "on");
    if (showAiMemoryCheckbox && includeInAiMemory) formData.set("include_in_campaign_ai_memory", "on");
    if (campaignType === "long") {
      formData.set("linked_mission_id", linkedMissionId.trim());
    }
    formData.set("relations", JSON.stringify(relations));

    const presetImageUrl = wikiImageUrlPreset?.trim() ?? "";
    const uploadedImage = formData.get("image");
    const hasUploadedImage = uploadedImage instanceof File && uploadedImage.size > 0;
    if (!hasUploadedImage && presetImageUrl && isValidImageUrl(presetImageUrl)) {
      formData.set("image_url", normalizeImageUrl(presetImageUrl));
    }

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
        setSelectedPlayerIds([]);
        setSelectedPartyIds([]);
        setIncludeInAiMemory(false);
        setLinkedMissionId("");
        setWikiImageUrlPreset(null);
        setAiImagePreview(null);
        setMagicPortraitPreview(null);
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

  async function handleBestiarySearch() {
    if (bestiarySearchLoading || isLoading) return;
    const q = bestiaryQuery.trim() || titleValue.trim();
    if (q.length < 2) {
      toast.error("Inserisci un termine di ricerca o il titolo del mostro.");
      return;
    }
    setBestiarySearchLoading(true);
    try {
      const res = await searchBestiaryChunksAction(campaignId, q);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setBestiaryHits(res.hits);
      if (res.hits.length === 0) {
        toast.info("Nessun risultato: prova un nome diverso o più corto.");
      }
    } finally {
      setBestiarySearchLoading(false);
    }
  }

  async function handleUseBestiaryHit(hitId: string) {
    if (loadingChunkId || isLoading) return;
    setLoadingChunkId(hitId);
    try {
      const res = await fetchExpandedBestiaryChunkAction(campaignId, hitId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setMonsterVerbatimStatblock(res.text);
      setAttr("statblock", res.text);
      const parsedStats = parseStatsFromLoadedStatblock(res.text);
      const mergedStats = {
        hp: parsedStats.hp,
        ac: parsedStats.ac,
        cr: parsedStats.cr || aiCr.trim() || undefined,
      };
      applyMonsterSheetStats(mergedStats);
      toast.success("Statblock caricato dai manuali (chunk espansi).");
    } catch (error) {
      console.error("[handleUseBestiaryHit]", error);
      toast.error("Errore durante il caricamento dello statblock. Riprova.");
    } finally {
      setLoadingChunkId(null);
    }
  }

  const loadBestiaryList = useCallback(async () => {
    if (bestiaryListLoading) return;
    setBestiaryListLoading(true);
    try {
      const res = await listBestiaryMonstersByCrAction(campaignId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setBestiaryGroups(res.groups);
    } finally {
      setBestiaryListLoading(false);
    }
  }, [bestiaryListLoading, campaignId]);

  async function handleUseBestiaryFromList() {
    if (!selectedBestiaryListId) {
      toast.error("Seleziona prima un mostro dalla lista.");
      return;
    }
    await handleUseBestiaryHit(selectedBestiaryListId);
  }

  function applyAssistChatDraft() {
    if (!assistChatDraft) return;
    const { description, statblock, npcTraits } = assistChatDraft;
    setContentValue(description);
    if (type === "npc" || type === "monster") {
      setAttr("statblock", statblock);
    }
    if (type === "npc" && npcTraits) {
      if (npcTraits.race) setAttr("race", npcTraits.race);
      if (npcTraits.class) setAttr("class", npcTraits.class);
      if (npcTraits.age) setAttr("age", npcTraits.age);
    }
    if (type === "monster" && statblock) {
      const parsedFromGenerated = parseStatsFromLoadedStatblock(statblock);
      applyMonsterSheetStats({
        hp: parsedFromGenerated.hp,
        ac: parsedFromGenerated.ac,
        cr: parsedFromGenerated.cr || aiCr.trim() || undefined,
      });
    }
    toast.success("Bozza chat applicata al form. Controlla e salva quando pronto.");
  }

  function buildAssistMarkdownExtraParams() {
    if (type === "monster") {
      return { cr: aiCr.trim(), verbatimMonsterStatblock: monsterVerbatimStatblock.trim() };
    }
    if (type === "item") {
      return { rarity: aiRarity.trim() };
    }
    if (type === "npc") {
      const raceForAi = npcAiRace.trim() || getAttr("race").trim();
      const classForAi = npcAiClass.trim() || getAttr("class").trim();
      return {
        npcRace: raceForAi,
        npcClass: classForAi,
        npcLevel: npcAiLevel.trim(),
      };
    }
    return {};
  }

  function assistChatReady(): boolean {
    if (!titleValue.trim()) return false;
    if (type === "monster" && !monsterVerbatimStatblock.trim()) return false;
    if (type === "npc") {
      const raceForAi = npcAiRace.trim() || getAttr("race").trim();
      const classForAi = npcAiClass.trim() || getAttr("class").trim();
      if (!raceForAi || !classForAi || !npcAiLevel.trim()) return false;
    }
    return aiAvailable;
  }

  async function handleAssistImageRefined(url: string) {
    await injectGeneratedImageAsFile(url);
    setAiImagePreview(url);
    setWikiImageUrlPreset(null);
    setMagicPortraitPreview(null);
  }

  async function handleMagicImageRefined(url: string) {
    setMagicPortraitPreview(url);
    setMagicDraft((prev) => (prev ? { ...prev, imageUrl: url, imageWarning: undefined } : prev));
  }

  async function handleAssistGenerateImage() {
    if (aiImageLoading || isLoading) return;
    const narrativeDescription = contentValue.trim();
    if (!narrativeDescription) {
      toast.error("Compila la descrizione narrativa nel campo contenuto prima di generare l'immagine.");
      return;
    }
    setAiImageLoading(true);
    startAiProgress("Generazione immagine IA coerente in corso...");
    let success = false;
    try {
      const imageEntityType: "npc" | "location" | "monster" =
        type === "location" ? "location" : type === "monster" ? "monster" : "npc";
      const result = await generateContextualPortraitAction(
        campaignId,
        narrativeDescription,
        imageEntityType,
        {
          entityTitle: titleValue.trim() || null,
        }
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      await injectGeneratedImageAsFile(result.publicUrl);
      setAiImagePreview(result.publicUrl);
      setWikiImageUrlPreset(null);
      setMagicPortraitPreview(null);
      success = true;
      toast.success("Immagine AI generata e caricata nel file input originale.");
    } catch {
      toast.error("Errore durante la generazione/iniezione immagine AI.");
    } finally {
      endAiProgress(success);
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
      setMagicEntityType("npc");
      setMagicDraft(null);
      setMagicChatKey((k) => k + 1);
      setAssistChatDraft(null);
      setAssistChatKey((k) => k + 1);
      setWikiImageUrlPreset(null);
      setMagicPortraitPreview(null);
      setAiImagePreview(null);
      setAiCr("");
      setAiRarity("");
      clearAiProgressTimer();
      setAiProgress(0);
      setAiProgressLabel(null);
      setSelectedPlayerIds([]);
      setSelectedPartyIds([]);
      setVisibility("public");
      setIncludeInAiMemory(false);
      setLinkedMissionId("");
      setMissionOptions([]);
    }
  }

  useEffect(() => {
    if (!open || campaignType !== "long") return;
    setLinkedMissionId("");
    void listCampaignMissionsLiteForGm(campaignId).then((r) => {
      if (r.success) setMissionOptions(r.data);
      else setMissionOptions([]);
    });
  }, [open, campaignType, campaignId]);

  useEffect(() => {
    return () => clearAiProgressTimer();
  }, []);

  useEffect(() => {
    if (!open || type !== "monster") return;
    if (bestiaryGroups.length > 0) return;
    void loadBestiaryList();
  }, [open, type, bestiaryGroups.length, loadBestiaryList]);

  function handleMagicStructuredDraft(draft: WikiAiTextGeneration | null) {
    if (!draft) return;
    setMagicDraft({
      title: draft.title,
      content: draft.content,
      hp: draft.hp,
      ac: draft.ac,
      imageUrl: magicDraft?.imageUrl ?? null,
      imageWarning: magicDraft?.imageWarning,
      entityType: magicEntityType,
    });
  }

  async function handleMagicGenerateImage() {
    if (magicImageLoading || magicTextChatLoading || !magicDraft) return;
    if (magicEntityType !== "npc" && magicEntityType !== "location") return;

    setMagicImageLoading(true);
    try {
      const res = await generateMagicDraftImageAction(
        campaignId,
        magicEntityType,
        magicDraft.title,
        magicDraft.content,
        magicImagePromptSeed || magicDraft.title
      );
      if (!res.success) {
        setMagicDraft((prev) =>
          prev ? { ...prev, imageWarning: res.message } : prev
        );
        toast.warning(`Immagine non generata: ${res.message}`);
        return;
      }
      setMagicDraft((prev) =>
        prev ? { ...prev, imageUrl: res.imageUrl, imageWarning: undefined } : prev
      );
      setMagicPortraitPreview(res.imageUrl);
      toast.success("Immagine generata. Puoi applicare la bozza al form.");
    } catch {
      toast.error("Errore durante la generazione immagine.");
    } finally {
      setMagicImageLoading(false);
    }
  }

  function handleMagicDialogOpenChange(next: boolean) {
    setMagicOpen(next);
    if (!next) {
      setMagicPortraitPreview(null);
      setMagicDraft(null);
      setMagicImagePromptSeed("");
      setMagicChatKey((k) => k + 1);
    }
  }

  function applyMagicDraftToForm() {
    if (!magicDraft) return;
    onTypeChange(magicDraft.entityType);
    const body = appendCombatStatsToMarkdown(magicDraft.content, magicDraft.hp, magicDraft.ac);
    setTitleValue(magicDraft.title);
    setContentValue(body);
    if (magicDraft.imageUrl) {
      setWikiImageUrlPreset(magicDraft.imageUrl);
      setAiImagePreview(magicDraft.imageUrl);
    } else {
      setWikiImageUrlPreset(null);
      setAiImagePreview(null);
    }
    if (magicDraft.imageWarning) {
      toast.warning(`Immagine non generata: ${magicDraft.imageWarning}`, { duration: 8000 });
    }
    toast.success("Bozza applicata al form. Controlla titolo, testo e immagine, poi premi Crea.");
    setMagicOpen(false);
    setMagicDraft(null);
    setMagicPortraitPreview(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const magicBusy = magicTextChatLoading || magicImageLoading;

  /* ------------------------------------------------------------------------ */
  /*  RENDER                                                                  */
  /* ------------------------------------------------------------------------ */

  const typeLabel = WIKI_ENTITY_LABELS_IT[type] ?? type;
  const monsterStatblockLoaded = type === "monster" && monsterVerbatimStatblock.trim().length > 0;
  const aiAvailable = type !== "monster" || monsterStatblockLoaded;
  const assistMarkdownEntityType =
    type === "monster"
      ? "monster"
      : type === "item"
        ? "item"
        : type === "location"
          ? "location"
          : type === "lore"
            ? "lore"
            : "npc";

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
        <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-3xl">
          <DialogHeader className="space-y-1.5 text-left">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-barber-gold/70">
              Wiki di campagna
            </p>
            <DialogTitle className="font-serif text-xl font-semibold text-barber-paper sm:text-2xl">
              Nuova voce wiki
            </DialogTitle>
            <DialogDescription className="text-sm text-barber-paper/70">
              Aggiungi un NPC, un luogo, un mostro, un oggetto o una voce di lore. Se vuoi una bozza
              veloce, prova la <strong className="font-medium text-barber-gold">Bacchetta IA</strong>{" "}
              qui sotto.
            </DialogDescription>
            <div className="pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => setMagicOpen(true)}
                className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Genera tutto con la Bacchetta IA
              </Button>
            </div>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
              {/* ============================================================ */}
              {/*  1. IDENTITÀ                                                 */}
              {/* ============================================================ */}
              <FormSection
                icon={<IdCard className="h-4 w-4" />}
                title="Identità della voce"
                hint="Base obbligatoria"
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <NameGeneratorField
                      id="entity-title"
                      name="title"
                      value={titleValue}
                      onChange={setTitleValue}
                      kind={type as NameGeneratorKind}
                      campaignId={campaignId}
                      label="Titolo"
                      placeholder="Es. Taverna del Drago"
                      required
                      disabled={isLoading}
                      inputClassName="bg-barber-dark border-barber-gold/30 text-barber-paper"
                      hint={contentValue.slice(0, 300) || undefined}
                    />
                  </div>
                  <div className="space-y-2 sm:min-w-[180px]">
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
                      {WIKI_ENTITY_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <TagsInput value={tags} onChange={setTags} disabled={isLoading} />

                {campaignType === "long" && (
                  <div className="space-y-2">
                    <Label htmlFor="create-linked-mission">Missione collegata (opzionale)</Label>
                    <select
                      id="create-linked-mission"
                      value={linkedMissionId}
                      onChange={(e) => setLinkedMissionId(e.target.value)}
                      disabled={isLoading}
                      className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
                    >
                      <option value="">Nessuna — Generale / trasversale</option>
                      {missionOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-barber-paper/55">
                      Utile per ordinare il wiki e filtrare le immagini nella Regia GM per missione.
                    </p>
                  </div>
                )}

                {(showCoreCheckbox || showAiMemoryCheckbox) && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {showCoreCheckbox && (
                      <label
                        htmlFor="entity-is-core"
                        className="flex cursor-pointer items-start gap-2 rounded-md border border-barber-gold/25 bg-barber-dark/70 p-3 hover:border-barber-gold/40"
                      >
                        <input
                          type="checkbox"
                          id="entity-is-core"
                          checked={isCore}
                          onChange={(e) => setIsCore(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                        />
                        <span className="min-w-0 space-y-0.5">
                          <span className="block text-sm font-medium text-barber-paper">
                            NPC/Mostro Core
                          </span>
                          <span className="block text-xs text-barber-paper/60">
                            Stato vita/morte condiviso nella campagna.
                          </span>
                        </span>
                      </label>
                    )}
                    {showAiMemoryCheckbox && (
                      <label
                        htmlFor="entity-ai-memory"
                        className="flex cursor-pointer items-start gap-2 rounded-md border border-violet-500/30 bg-violet-950/15 p-3 hover:border-violet-500/45"
                      >
                        <input
                          type="checkbox"
                          id="entity-ai-memory"
                          checked={includeInAiMemory}
                          onChange={(e) => setIncludeInAiMemory(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-violet-500/40 bg-barber-dark text-violet-400"
                        />
                        <span className="min-w-0 space-y-0.5">
                          <span className="block text-sm font-medium text-barber-paper">
                            Memoria IA della campagna
                          </span>
                          <span className="block text-xs text-barber-paper/60">
                            Solo campagne lunghe: la voce entra nel contesto delle generazioni IA future.
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </FormSection>

              {/* ============================================================ */}
              {/*  2. CONTENUTO                                                */}
              {/* ============================================================ */}
              <FormSection
                icon={<FileText className="h-4 w-4" />}
                title={`Contenuto · ${typeLabel}`}
                hint="Storia + scheda tecnica"
              >
                <div className="space-y-2">
                  <Label htmlFor="entity-content">
                    {type === "lore" ? "Testo" : "Storia / Descrizione"}
                  </Label>
                  <Textarea
                    id="entity-content"
                    name="content"
                    value={contentValue}
                    onChange={(e) => setContentValue(e.target.value)}
                    placeholder="Descrizione in Markdown..."
                    className="min-h-[140px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-barber-paper/55">
                    Puoi compilare a mano oppure aprire l&apos;<strong className="font-medium text-barber-gold">Assistente IA</strong> qui sotto per una bozza guidata.
                  </p>
                </div>

                {/* Campi dinamici per tipo */}
                {type === "npc" && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="attr-race-npc">Razza</Label>
                        <Input
                          id="attr-race-npc"
                          value={getAttr("race")}
                          onChange={(e) => setAttr("race", e.target.value)}
                          placeholder="Es. Elfo, Nano, Umano..."
                          className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attr-class-npc">Classe</Label>
                        <select
                          id="attr-class-npc"
                          value={getAttr("class")}
                          onChange={(e) => setAttr("class", e.target.value)}
                          className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
                          disabled={isLoading}
                        >
                          <option value="">— Nessuna classe —</option>
                          {getAttr("class") && !WIKI_NPC_CLASS_OPTIONS.includes(getAttr("class")) && (
                            <option value={getAttr("class")}>{getAttr("class")}</option>
                          )}
                          {WIKI_NPC_CLASS_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.options.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attr-age-npc">Età</Label>
                        <Input
                          id="attr-age-npc"
                          value={getAttr("age")}
                          onChange={(e) => setAttr("age", e.target.value)}
                          placeholder="Es. 42 anni"
                          className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attr-statblock-npc">Statblock</Label>
                      <Textarea
                        id="attr-statblock-npc"
                        value={getAttr("statblock")}
                        onChange={(e) => setAttr("statblock", e.target.value)}
                        placeholder="Statblock NPC (abilità, tiri salvezza, attacchi, capacità speciali)..."
                        className="min-h-[120px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                          className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                          disabled={isLoading}
                        />
                      </div>
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
                    <div className="space-y-2">
                      <Label htmlFor="attr-statblock-monster">Statblock</Label>
                      <Textarea
                        id="attr-statblock-monster"
                        value={getAttr("statblock")}
                        onChange={(e) => setAttr("statblock", e.target.value)}
                        placeholder="Statblock completo del mostro (azioni, reazioni, tratti, capacità leggendarie)..."
                        className="min-h-[140px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-barber-paper/55">
                        Suggerimento: usa l&apos;<strong className="font-medium text-barber-gold">Assistente IA</strong> per cercare lo statblock direttamente nei manuali.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
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
                        <Label htmlFor="monster-xp">PE</Label>
                        <Input
                          id="monster-xp"
                          name="xp_value"
                          type="number"
                          min={0}
                          value={monsterXp || ""}
                          onChange={(e) => setMonsterXp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          placeholder="Auto da GS"
                          className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                          className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </>
                )}

                {type === "lore" && (
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor="entity-sort-order">Numero capitolo</Label>
                      <Input
                        id="entity-sort-order"
                        type="number"
                        min={1}
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        placeholder="Es. 1"
                        className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-barber-paper/55">Per indice Capitolo 1, 2, 3...</p>
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
                  </div>
                )}
              </FormSection>

              {/* ============================================================ */}
              {/*  3. ASSISTENTE IA                                            */}
              {/* ============================================================ */}
              <FormSection
                icon={<Wand2 className="h-4 w-4" />}
                title="Assistente IA"
                hint="Genera testo e immagini"
                badge={<StatusBadge tone="muted">Opzionale</StatusBadge>}
                collapsible
                defaultOpen={false}
              >
                <p className="text-xs leading-relaxed text-barber-paper/65">
                  L&apos;assistente compila <strong className="font-medium text-barber-paper">Storia / Descrizione</strong>{" "}
                  e (se applicabile) statblock e statistiche. Puoi sempre rivedere il risultato a mano prima di salvare.
                </p>

                {/* Step 1 — Per i mostri: caricare lo statblock dai manuali */}
                {type === "monster" && (
                  <div className="space-y-3 rounded-lg border border-barber-gold/30 bg-barber-dark/65 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Library className="h-4 w-4 shrink-0 text-barber-gold" />
                        <h4 className="font-serif text-sm font-semibold text-barber-paper">
                          1 · Bestiario di campagna
                        </h4>
                      </div>
                      {monsterStatblockLoaded ? (
                        <StatusBadge tone="success">Statblock caricato</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Richiesto per generare</StatusBadge>
                      )}
                    </div>
                    <p className="text-xs leading-snug text-barber-paper/65">
                      Scegli un mostro dalla lista oppure cerca per nome. Lo statblock arriva direttamente
                      dai PDF importati: l&apos;IA genera solo la parte narrativa.
                    </p>

                    <div className="space-y-2 rounded-md border border-barber-gold/20 bg-barber-dark/45 p-2.5">
                      <p className="text-xs font-medium text-barber-paper/75">
                        Selezione rapida per Grado di Sfida
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <select
                          value={selectedBestiaryListId}
                          onChange={(e) => setSelectedBestiaryListId(e.target.value)}
                          disabled={isLoading || assistChatLoading || bestiaryListLoading}
                          className="flex h-10 min-w-0 flex-1 rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
                        >
                          <option value="">
                            {bestiaryListLoading
                              ? "Caricamento lista mostri..."
                              : "— Seleziona mostro per GS —"}
                          </option>
                          {bestiaryGroups.map((g) => (
                            <optgroup key={g.cr_value} label={g.cr_label}>
                              {g.items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.monster_name} · {item.manual_label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={
                            isLoading ||
                            assistChatLoading ||
                            bestiaryListLoading ||
                            !selectedBestiaryListId ||
                            loadingChunkId != null
                          }
                          onClick={() => void handleUseBestiaryFromList()}
                        >
                          Usa dalla lista
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isLoading || assistChatLoading || bestiaryListLoading}
                          onClick={() => void loadBestiaryList()}
                          className="text-barber-paper/70 hover:text-barber-gold"
                        >
                          Aggiorna lista
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-barber-paper/75">Cerca per nome</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="relative flex-1">
                          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-barber-paper/45" />
                          <Input
                            value={bestiaryQuery}
                            onChange={(e) => setBestiaryQuery(e.target.value)}
                            placeholder="Es. Drago verde, Goblin, Lich…"
                            disabled={isLoading || assistChatLoading || bestiarySearchLoading}
                            className="border-barber-gold/30 bg-barber-dark pl-9 text-barber-paper"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isLoading || assistChatLoading || bestiarySearchLoading}
                          onClick={() => void handleBestiarySearch()}
                          className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
                        >
                          {bestiarySearchLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Ricerca…
                            </>
                          ) : (
                            "Cerca"
                          )}
                        </Button>
                      </div>
                      {bestiaryHits.length > 0 && (
                        <ul className="scrollbar-barber-y max-h-48 space-y-1.5 overflow-y-auto rounded border border-barber-gold/20 bg-barber-dark/55 p-2 text-xs">
                          {bestiaryHits.map((h) => (
                            <li
                              key={h.id}
                              className="flex flex-col gap-1.5 rounded border border-barber-gold/15 bg-barber-dark/80 p-2 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1 text-barber-paper/90">
                                <span className="line-clamp-2">{h.excerpt}</span>
                                <span className="mt-0.5 block text-[11px] text-barber-paper/55">
                                  {h.manual_label}
                                  {h.section_heading ? ` · ${h.section_heading}` : ""}
                                </span>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={loadingChunkId === h.id || assistChatLoading}
                                className="shrink-0 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
                                onClick={() => void handleUseBestiaryHit(h.id)}
                              >
                                {loadingChunkId === h.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Usa questo"
                                )}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2 — Tratti per NPC */}
                {type === "npc" && (
                  <div className="space-y-3 rounded-lg border border-barber-gold/30 bg-barber-dark/65 p-3">
                    <div className="flex items-center gap-2">
                      <Library className="h-4 w-4 shrink-0 text-barber-gold" />
                      <h4 className="font-serif text-sm font-semibold text-barber-paper">
                        Tratti per la generazione (manuali)
                      </h4>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-barber-paper/80">Razza</Label>
                        <select
                          value={npcAiRace}
                          onChange={(e) => setNpcAiRace(e.target.value)}
                          disabled={isLoading || assistChatLoading}
                          className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                        >
                          <option value="">— Come campo «Razza» sopra —</option>
                          {WIKI_NPC_RACE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-barber-paper/80">Classe</Label>
                        <select
                          value={npcAiClass}
                          onChange={(e) => setNpcAiClass(e.target.value)}
                          disabled={isLoading || assistChatLoading}
                          className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                        >
                          <option value="">— Come campo «Classe» sopra —</option>
                          {WIKI_NPC_CLASS_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.options.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-barber-paper/80">Livello</Label>
                        <select
                          value={npcAiLevel}
                          onChange={(e) => setNpcAiLevel(e.target.value)}
                          disabled={isLoading || assistChatLoading}
                          className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                        >
                          <option value="">— Livello PG —</option>
                          {WIKI_NPC_LEVEL_OPTIONS.map((lv) => (
                            <option key={lv} value={lv}>
                              {lv}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-barber-paper/55">
                      La scheda userà solo manuali non esclusi nei paletti campagna.
                    </p>
                  </div>
                )}

                {/* Step 3 — Chat testo + parametri tipo */}
                <div className="space-y-3 rounded-lg border border-barber-gold/30 bg-barber-dark/65 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-barber-gold" />
                    <h4 className="font-serif text-sm font-semibold text-barber-paper">
                      {type === "monster" ? "2 · Chat testo IA" : "Chat testo IA"}
                    </h4>
                  </div>

                  {!assistChatReady() ? (
                    <p className="text-xs text-amber-400/90">
                      Compila titolo
                      {type === "monster" ? " e carica lo statblock dal bestiario" : ""}
                      {type === "npc" ? ", razza, classe e livello" : ""} prima di chattare con l&apos;IA.
                    </p>
                  ) : null}

                  {type === "monster" ? (
                    <div className="space-y-2">
                      <Label htmlFor="assist-cr" className="text-xs text-barber-paper/80">
                        Grado di Sfida (CR) opzionale
                      </Label>
                      <Input
                        id="assist-cr"
                        value={aiCr}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setAiCr(val);
                          setAttr("combat_stats.cr", val);
                          const xp = CHALLENGE_RATING_OPTIONS.find((o) => o.value === val)?.xp;
                          setMonsterXp(xp ?? 0);
                        }}
                        placeholder="Es. 5"
                        disabled={isLoading || assistChatLoading}
                        className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                      />
                    </div>
                  ) : type === "item" ? (
                    <div className="space-y-2">
                      <Label htmlFor="assist-rarity" className="text-xs text-barber-paper/80">
                        Rarità oggetto opzionale
                      </Label>
                      <select
                        id="assist-rarity"
                        value={aiRarity}
                        onChange={(e) => setAiRarity(e.target.value)}
                        disabled={isLoading || assistChatLoading}
                        className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
                      >
                        <option value="">— Scegli rarità —</option>
                        {ITEM_RARITY_OPTIONS.map((rarity) => (
                          <option key={rarity} value={rarity}>
                            {rarity}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <WikiTextGenChat
                    key={`assist-chat-${assistChatKey}-${type}`}
                    mode="markdown"
                    campaignId={campaignId}
                    entityType={assistMarkdownEntityType}
                    entityName={titleValue.trim() || "Nuova voce"}
                    extraParams={buildAssistMarkdownExtraParams()}
                    disabled={isLoading || !assistChatReady()}
                    onLoadingChange={setAssistChatLoading}
                    onDraftChange={setAssistChatDraft}
                    placeholder={
                      type === "monster"
                        ? "Descrivi ruolo nella campagna, poi chiedi modifiche…"
                        : "Descrivi la voce wiki, poi affina con messaggi come in ChatGPT…"
                    }
                    emptyHint="Prompt iniziale → generazione → chiedi modifiche finché la bozza ti convince, poi applicala al form."
                  />

                  {assistChatDraft ? (
                    <Button
                      type="button"
                      onClick={applyAssistChatDraft}
                      disabled={isLoading || assistChatLoading}
                      className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                    >
                      Applica bozza chat al form
                    </Button>
                  ) : null}
                </div>

                {/* Step 4 — Generazione immagine coerente */}
                <div className="space-y-3 rounded-lg border border-barber-gold/30 bg-barber-dark/65 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 shrink-0 text-barber-gold" />
                      <h4 className="font-serif text-sm font-semibold text-barber-paper">
                        Genera immagine coerente
                      </h4>
                    </div>
                    {aiImagePreview ? (
                      <StatusBadge tone="success">Pronta</StatusBadge>
                    ) : null}
                  </div>
                  <p className="text-xs text-barber-paper/65">
                    Genera un&apos;immagine coerente con la <strong className="font-medium text-barber-paper">descrizione</strong>{" "}
                    già scritta sopra. L&apos;immagine viene caricata automaticamente nel campo «Immagine» qui sotto.
                    {type === "monster" || type === "npc" ? (
                      <span className="mt-1 block text-barber-gold/85">
                        Per <strong className="font-medium text-barber-paper">NPC e mostri</strong> l&apos;inquadratura
                        predefinita è{" "}
                        <strong className="font-medium text-barber-paper">a figura intera in piedi</strong>, salvo
                        che nel prompt chiedi esplicitamente una posa seduta.
                      </span>
                    ) : null}
                  </p>
                  <Button
                    type="button"
                    onClick={() => void handleAssistGenerateImage()}
                    disabled={isLoading || aiImageLoading}
                    className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                  >
                      {aiImageLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generazione...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          {aiImagePreview ? "Rigenera da testo wiki" : "Genera immagine"}
                        </>
                      )}
                    </Button>
                  {aiImagePreview &&
                  (type === "npc" || type === "monster" || type === "location") ? (
                    <WikiImageRefineChat
                      key={`assist-image-refine-${aiImagePreview}`}
                      campaignId={campaignId}
                      entityType={
                        type === "location" ? "location" : type === "monster" ? "monster" : "npc"
                      }
                      baseDescription={contentValue.trim()}
                      imageUrl={aiImagePreview}
                      onImageChange={handleAssistImageRefined}
                      disabled={isLoading || aiImageLoading}
                    />
                  ) : null}
                </div>
              </FormSection>

              {/* ============================================================ */}
              {/*  4. IMMAGINE                                                 */}
              {/* ============================================================ */}
              <FormSection
                icon={<ImageIcon className="h-4 w-4" />}
                title="Immagine"
                hint="Carica file o incolla URL"
                collapsible
                defaultOpen={false}
              >
                <ImageSourceField
                  fileInputName="image"
                  urlFieldName="image_url"
                  label=""
                  disabled={isLoading}
                  presetUrl={wikiImageUrlPreset}
                />
              </FormSection>

              {/* ============================================================ */}
              {/*  5. RELAZIONI & MAPPA CONCETTUALE                            */}
              {/* ============================================================ */}
              <FormSection
                icon={<Share2 className="h-4 w-4" />}
                title="Relazioni & Mappa concettuale"
                hint={relations.length > 0 ? `${relations.length} relazioni` : "Solo GM"}
                collapsible
                defaultOpen={relations.length > 0}
              >
                <p className="text-xs text-barber-paper/60">
                  Collega questa voce ad altre voci wiki o a mappe. Le relazioni appariranno nella Mappa
                  Concettuale (Solo GM).
                </p>
                {relations.map((rel, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-end gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/80 p-2"
                  >
                    <div className="flex-1 min-w-[100px]">
                      <Label className="text-xs">Tipo bersaglio</Label>
                      <select
                        value={rel.targetType}
                        onChange={(e) =>
                          setRelations((prev) => {
                            const next = [...prev];
                            next[idx] = {
                              ...next[idx],
                              targetType: e.target.value as "wiki" | "map",
                              targetId: "",
                            };
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
                      aria-label="Rimuovi relazione"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-barber-gold/40 text-barber-paper/90 hover:bg-barber-gold/10"
                  onClick={() =>
                    setRelations((prev) => [
                      ...prev,
                      { targetType: "wiki", targetId: "", label: "" },
                    ])
                  }
                  disabled={isLoading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi relazione
                </Button>
              </FormSection>

              {/* ============================================================ */}
              {/*  6. VISIBILITÀ                                               */}
              {/* ============================================================ */}
              <FormSection
                icon={<Lock className="h-4 w-4" />}
                title="Visibilità"
                hint={
                  visibility === "public"
                    ? "Tutti i giocatori"
                    : visibility === "secret"
                      ? "Solo GM"
                      : "Selettiva"
                }
                collapsible
                defaultOpen={visibility !== "public"}
              >
                <div className="space-y-2">
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
                    <div className="scrollbar-barber-y mt-2 max-h-48 overflow-y-auto rounded-md border border-barber-gold/30 bg-barber-dark/60 p-3">
                      {eligibleParties.length > 0 && (
                        <>
                          <p className="mb-2 text-xs font-medium text-barber-paper/80">
                            Gruppi che possono vedere questa voce
                          </p>
                          <div className="mb-3 flex flex-col gap-1">
                            {eligibleParties.map((party) => (
                              <label
                                key={party.id}
                                className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPartyIds.includes(party.id)}
                                  onChange={() =>
                                    setSelectedPartyIds((prev) =>
                                      prev.includes(party.id)
                                        ? prev.filter((x) => x !== party.id)
                                        : [...prev, party.id]
                                    )
                                  }
                                  className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                                />
                                {party.label}
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                      <p className="mb-2 text-xs font-medium text-barber-paper/80">
                        Giocatori che possono vedere questa voce
                      </p>
                      {eligiblePlayers.length === 0 ? (
                        <p className="text-xs text-barber-paper/50">
                          Nessun giocatore iscritto alla campagna.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {eligiblePlayers.map((p) => (
                            <label
                              key={p.id}
                              className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPlayerIds.includes(p.id)}
                                onChange={() =>
                                  setSelectedPlayerIds((prev) =>
                                    prev.includes(p.id)
                                      ? prev.filter((x) => x !== p.id)
                                      : [...prev, p.id]
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
              </FormSection>

              {/* ============================================================ */}
              {/*  7. NOTE GM (private)                                        */}
              {/* ============================================================ */}
              <FormSection
                icon={<Notebook className="h-4 w-4" />}
                title="Note GM (private)"
                hint="Visibili solo a te e agli admin"
                tone="private"
                collapsible
                defaultOpen={false}
              >
                <Textarea
                  id="entity-gm-notes"
                  value={getAttr("gm_notes")}
                  onChange={(e) => setAttr("gm_notes", e.target.value)}
                  placeholder="Appunti, reminder, idee per la sessione..."
                  className="min-h-[100px] resize-y bg-barber-dark border-violet-500/30 text-barber-paper placeholder:text-barber-paper/40"
                  disabled={isLoading}
                />
              </FormSection>

            <DialogFooter className="sticky bottom-[-1.5rem] -mx-6 -mb-6 mt-2 gap-2 border-t border-barber-gold/30 bg-barber-dark/95 px-6 py-4 shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.6)] backdrop-blur supports-[backdrop-filter]:bg-barber-dark/85 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
                className="border-barber-gold/40 text-barber-paper/80 hover:bg-barber-gold/10"
              >
                Annulla
              </Button>
              <SubmitButton
                pending={isLoading}
                loadingText="Creazione..."
                className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Crea voce
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/*  MAGIC DIALOG — Generazione completa "Bacchetta IA"                */}
      {/* ================================================================== */}
      <Dialog open={magicOpen} onOpenChange={handleMagicDialogOpenChange}>
        <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-lg">
          <DialogHeader>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-barber-gold/70">
              Bacchetta IA
            </p>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-barber-paper">
              <Sparkles className="h-5 w-5 text-barber-gold" />
              Chat generazione
            </DialogTitle>
            <DialogDescription className="text-sm text-barber-paper/70">
              Prompt iniziale → bozza testo → chiedi modifiche in chat. Per{" "}
              <strong className="font-medium text-barber-paper">NPC</strong> e{" "}
              <strong className="font-medium text-barber-paper">Luoghi</strong> puoi generare l&apos;immagine
              quando il testo ti convince.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="magic-entity-type">Tipo di entità</Label>
              <select
                id="magic-entity-type"
                value={magicEntityType}
                onChange={(e) => {
                  setMagicEntityType(e.target.value as WikiGeneratorEntityType);
                  setMagicDraft(null);
                  setMagicPortraitPreview(null);
                  setMagicChatKey((k) => k + 1);
                }}
                disabled={magicBusy}
                className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
              >
                {MAGIC_ENTITY_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <WikiTextGenChat
              key={`magic-chat-${magicChatKey}-${magicEntityType}`}
              mode="structured"
              campaignId={campaignId}
              entityType={magicEntityType}
              disabled={magicBusy}
              onLoadingChange={setMagicTextChatLoading}
              onDraftChange={handleMagicStructuredDraft}
              onFirstUserPrompt={setMagicImagePromptSeed}
              placeholder="Es: bottega del macellaio di Portico, interno umido e fumoso…"
              emptyHint="Scrivi cosa vuoi creare. Poi chiedi modifiche («più cupo», «aggiungi un cliente nervoso»…) come in ChatGPT."
            />

            {magicDraft && (magicEntityType === "npc" || magicEntityType === "location") ? (
              <div className="space-y-2">
                {!magicPortraitPreview ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
                    disabled={magicBusy}
                    onClick={() => void handleMagicGenerateImage()}
                  >
                    {magicImageLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generazione immagine…
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Genera immagine coerente col testo
                      </>
                    )}
                  </Button>
                ) : null}
                {magicDraft.imageWarning && !magicPortraitPreview ? (
                  <p className="text-xs text-amber-400/90">Immagine: {magicDraft.imageWarning}</p>
                ) : null}
                {magicPortraitPreview ? (
                  <>
                    <WikiImageRefineChat
                      key={`magic-image-refine-${magicPortraitPreview}`}
                      campaignId={campaignId}
                      entityType={magicEntityType}
                      baseDescription={magicDraft.content}
                      imageUrl={magicPortraitPreview}
                      onImageChange={handleMagicImageRefined}
                      disabled={magicBusy}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-barber-paper/60 hover:text-barber-paper"
                      disabled={magicBusy}
                      onClick={() => void handleMagicGenerateImage()}
                    >
                      Rigenera completamente dal testo wiki
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
              onClick={() => handleMagicDialogOpenChange(false)}
              disabled={magicBusy}
            >
              Chiudi
            </Button>
            {magicDraft ? (
              <Button
                type="button"
                className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                onClick={applyMagicDraftToForm}
                disabled={magicBusy}
              >
                Applica al form
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
import {
  createEntity,
  generateWikiQuickAiAction,
  listCampaignMissionsLiteForGm,
  type WikiGeneratorEntityType,
} from "@/app/campaigns/wiki-actions";
import { generateFullAiWikiEntity } from "@/lib/actions/ai-wiki-chain";
import { generateContextualPortraitAction } from "@/lib/actions/ai-generator";
import { generateWikiMarkdownAction } from "@/lib/ai/wiki-text-generator";
import { AiImageProviderSelect } from "@/components/ai/ai-image-provider-select";
import { useAiImageProvider } from "@/lib/hooks/use-ai-image-provider";
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
import { WIKI_NPC_CLASS_OPTIONS, WIKI_NPC_LEVEL_OPTIONS, WIKI_NPC_RACE_OPTIONS } from "@/lib/wiki-npc-ai-options";
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
  const [magicPrompt, setMagicPrompt] = useState("");
  const [magicEntityType, setMagicEntityType] = useState<WikiGeneratorEntityType>("npc");
  const [magicLoading, setMagicLoading] = useState(false);
  const { provider: aiImageProvider, setProvider: setAiImageProvider } = useAiImageProvider();
  const [aiTextLoading, setAiTextLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiCr, setAiCr] = useState("");
  const [aiRarity, setAiRarity] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
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
  /** Fasi UX durante la catena server (testo → immagine) per NPC/Luogo. */
  const [magicChainPhase, setMagicChainPhase] = useState<"text" | "image">("text");
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

  async function handleAssistGenerateText() {
    if (aiTextLoading || isLoading) return;
    const safeName = titleValue.trim();
    if (!safeName) {
      toast.error("Inserisci prima il Titolo dell'elemento.");
      return;
    }
    if (type === "monster" && !monsterVerbatimStatblock.trim()) {
      toast.error("Cerca un mostro nel bestiario e premi «Usa questo» per caricare lo statblock dai manuali.");
      return;
    }
    const raceForAi = npcAiRace.trim() || getAttr("race").trim();
    const classForAi = npcAiClass.trim() || getAttr("class").trim();
    if (type === "npc" && (!raceForAi || !classForAi || !npcAiLevel.trim())) {
      toast.error("Per gli NPC indica razza, classe e livello (menu sotto) oppure compila almeno Razza e Classe nei campi scheda.");
      return;
    }
    setAiTextLoading(true);
    startAiProgress("Generazione scheda testo IA in corso...");
    let success = false;
    try {
      const aiEntityType =
        type === "monster"
          ? "monster"
          : type === "item"
            ? "item"
            : type === "location"
              ? "location"
              : type === "lore"
                ? "lore"
                : "npc";
      const extra =
        type === "monster"
          ? { cr: aiCr.trim(), verbatimMonsterStatblock: monsterVerbatimStatblock.trim() }
          : type === "item"
            ? { rarity: aiRarity.trim() }
            : type === "npc"
              ? {
                  npcRace: raceForAi,
                  npcClass: classForAi,
                  npcLevel: npcAiLevel.trim(),
                }
              : {};
      const result = await generateWikiMarkdownAction(
        campaignId,
        aiEntityType,
        safeName,
        aiPrompt,
        extra
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const { description, statblock, stats, npcTraits } = result;
      setContentValue(description);
      if (type === "npc" || type === "monster") {
        setAttr("statblock", statblock);
      }
      if (type === "npc" && npcTraits) {
        if (npcTraits.race) setAttr("race", npcTraits.race);
        if (npcTraits.class) setAttr("class", npcTraits.class);
        if (npcTraits.age) setAttr("age", npcTraits.age);
      }
      if (type === "monster" && stats) {
        applyMonsterSheetStats({
          hp: stats.hp ?? undefined,
          ac: stats.ac ?? undefined,
          cr: stats.cr ?? undefined,
        });
      }
      if (type === "monster" && statblock) {
        const parsedFromGenerated = parseStatsFromLoadedStatblock(statblock);
        applyMonsterSheetStats({
          hp: parsedFromGenerated.hp,
          ac: parsedFromGenerated.ac,
          cr: parsedFromGenerated.cr || aiCr.trim() || stats?.cr || undefined,
        });
      }
      success = true;
      toast.success("Contenuto AI generato: narrativa e statblock separati.");
    } catch {
      toast.error("Errore durante la generazione del testo AI.");
    } finally {
      endAiProgress(success);
      setAiTextLoading(false);
    }
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
      const imageEntityType: "npc" | "location" = type === "location" ? "location" : "npc";
      const result = await generateContextualPortraitAction(
        campaignId,
        narrativeDescription,
        imageEntityType,
        {
          provider: aiImageProvider,
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
      setMagicPrompt("");
      setMagicEntityType("npc");
      setWikiImageUrlPreset(null);
      setMagicPortraitPreview(null);
      setAiImagePreview(null);
      setAiCr("");
      setAiRarity("");
      setAiPrompt("");
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
        const res = await generateFullAiWikiEntity(campaignId, p, magicEntityType, {
          imageProvider: aiImageProvider,
        });
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

  /* ------------------------------------------------------------------------ */
  /*  RENDER                                                                  */
  /* ------------------------------------------------------------------------ */

  const typeLabel = WIKI_ENTITY_LABELS_IT[type] ?? type;
  const monsterStatblockLoaded = type === "monster" && monsterVerbatimStatblock.trim().length > 0;
  const aiAvailable = type !== "monster" || monsterStatblockLoaded;

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
                        <Input
                          id="attr-class-npc"
                          value={getAttr("class")}
                          onChange={(e) => setAttr("class", e.target.value)}
                          placeholder="Es. Mago, Guerriero, Ladro..."
                          className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                          disabled={isLoading}
                        />
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
                          disabled={isLoading || aiTextLoading || bestiaryListLoading}
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
                            aiTextLoading ||
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
                          disabled={isLoading || aiTextLoading || bestiaryListLoading}
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
                            disabled={isLoading || aiTextLoading || bestiarySearchLoading}
                            className="border-barber-gold/30 bg-barber-dark pl-9 text-barber-paper"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isLoading || aiTextLoading || bestiarySearchLoading}
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
                                disabled={loadingChunkId === h.id || aiTextLoading}
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
                          disabled={isLoading || aiTextLoading}
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
                          disabled={isLoading || aiTextLoading}
                          className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                        >
                          <option value="">— Come campo «Classe» sopra —</option>
                          {WIKI_NPC_CLASS_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-barber-paper/80">Livello</Label>
                        <select
                          value={npcAiLevel}
                          onChange={(e) => setNpcAiLevel(e.target.value)}
                          disabled={isLoading || aiTextLoading}
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

                {/* Step 3 — Prompt + parametri tipo + bottone genera testo */}
                <div className="space-y-3 rounded-lg border border-barber-gold/30 bg-barber-dark/65 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-barber-gold" />
                    <h4 className="font-serif text-sm font-semibold text-barber-paper">
                      {type === "monster" ? "2 · Genera testo" : "Genera testo"}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assist-prompt" className="text-xs text-barber-paper/80">
                      Istruzioni per l&apos;IA (opzionale)
                    </Label>
                    <Textarea
                      id="assist-prompt"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={
                        type === "monster"
                          ? "Prima del trattino (-): parole chiave per il contesto. Dopo il -: storia / ruolo nella campagna."
                          : "Es. Un oste nano burbero legato alla gilda dei ladri..."
                      }
                      disabled={isLoading || aiTextLoading}
                      className="min-h-[72px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                    />
                    <p className="text-[11px] text-barber-paper/55">
                      Puoi usare il trattino <strong className="font-medium text-barber-paper/85">-</strong>: a sinistra
                      contesto per i manuali, a destra narrazione e richieste di trama.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="space-y-2">
                      {type === "monster" ? (
                        <>
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
                            disabled={isLoading || aiTextLoading}
                            className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                          />
                        </>
                      ) : type === "item" ? (
                        <>
                          <Label htmlFor="assist-rarity" className="text-xs text-barber-paper/80">
                            Rarità oggetto opzionale
                          </Label>
                          <select
                            id="assist-rarity"
                            value={aiRarity}
                            onChange={(e) => setAiRarity(e.target.value)}
                            disabled={isLoading || aiTextLoading}
                            className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
                          >
                            <option value="">— Scegli rarità —</option>
                            {ITEM_RARITY_OPTIONS.map((rarity) => (
                              <option key={rarity} value={rarity}>
                                {rarity}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <p className="text-xs text-barber-paper/65">
                          Template contestuale automatico per{" "}
                          <span className="font-medium text-barber-paper/90">
                            {type === "npc" ? "NPC" : type === "location" ? "Luogo" : "Lore"}
                          </span>
                          .
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleAssistGenerateText()}
                      disabled={isLoading || aiTextLoading || !aiAvailable}
                      className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90 disabled:opacity-50"
                    >
                      {aiTextLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generazione...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Genera testo
                        </>
                      )}
                    </Button>
                  </div>

                  {aiProgressLabel && (
                    <div className="rounded-md border border-barber-gold/30 bg-barber-dark/60 p-3">
                      <p className="mb-2 text-xs text-barber-paper/85">{aiProgressLabel}</p>
                      <Progress value={aiProgress} className="h-2" />
                    </div>
                  )}
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
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <AiImageProviderSelect
                      id="create-entity-image-provider"
                      disabled={isLoading || aiImageLoading}
                      value={aiImageProvider}
                      onChange={setAiImageProvider}
                    />
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
                          Genera immagine
                        </>
                      )}
                    </Button>
                  </div>
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
        <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-md">
          <DialogHeader>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-barber-gold/70">
              Bacchetta IA
            </p>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl text-barber-paper">
              <Sparkles className="h-5 w-5 text-barber-gold" />
              Generazione completa
            </DialogTitle>
            <DialogDescription className="text-sm text-barber-paper/70">
              Un solo passaggio: per <strong className="font-medium text-barber-paper">NPC</strong> e{" "}
              <strong className="font-medium text-barber-paper">Luoghi</strong> generiamo testo dettagliato e
              immagine coerente. Per <strong className="font-medium text-barber-paper">Oggetti</strong> e{" "}
              <strong className="font-medium text-barber-paper">Lore</strong>: solo testo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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

            <div className="space-y-2">
              <Label htmlFor="magic-prompt">Cosa vuoi creare?</Label>
              <Textarea
                id="magic-prompt"
                value={magicPrompt}
                onChange={(e) => setMagicPrompt(e.target.value)}
                placeholder="Es: Un oste burbero con il pugnale al fianco e un debito con la mafia locale"
                className="min-h-[88px] resize-y border-barber-gold/30 bg-barber-dark text-barber-paper"
                disabled={magicLoading}
              />
              <p className="text-xs text-barber-paper/55">
                Una frase basta. L&apos;IA usa la memoria di campagna per restare coerente.
              </p>
            </div>

            {(magicEntityType === "npc" || magicEntityType === "location") && (
              <AiImageProviderSelect
                id="magic-image-provider"
                label="Provider immagine"
                disabled={magicLoading}
                value={aiImageProvider}
                onChange={setAiImageProvider}
              />
            )}

            {magicLoading && (
              <div
                className="flex items-start gap-3 rounded-lg border border-barber-gold/35 bg-barber-dark/70 p-3 text-sm text-barber-paper"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-barber-gold" />
                <div>
                  <p className="font-medium">
                    {magicEntityType === "npc" || magicEntityType === "location"
                      ? magicChainPhase === "text"
                        ? "Tessendo la trama (generazione testo)…"
                        : "Dipingendo il volto (generazione immagine coerente)…"
                      : "Tessendo la trama (generazione testo)…"}
                  </p>
                  <p className="mt-1 text-xs text-barber-paper/65">
                    Non chiudere la finestra: al termine i campi del form si compileranno da soli.
                  </p>
                </div>
              </div>
            )}

            {!magicLoading &&
              magicPortraitPreview &&
              (magicEntityType === "npc" || magicEntityType === "location") && (
                <div className="space-y-2 rounded-lg border border-barber-gold/30 bg-barber-dark/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-barber-paper">
                    <ImageIcon className="h-4 w-4 text-barber-gold" />
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
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
              onClick={() => setMagicOpen(false)}
              disabled={magicLoading}
            >
              Chiudi
            </Button>
            <Button
              type="button"
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
              onClick={() => void handleMagicGenerate()}
              disabled={magicLoading}
            >
              {magicLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Attendere…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Genera
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BookOpen,
  Edit3,
  Eye,
  Heart,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  User,
  Zap,
  AlertTriangle,
} from "lucide-react";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";
import { SpellSlotsCell } from "@/components/gm/spell-slots-cell";
import { ConditionsCell } from "@/components/gm/conditions-cell";
import { extractSpellStats, isCompleteMonsterStatblock } from "@/lib/fight-mode/stats-helper";
import { parseDenseStatblock } from "@/lib/manuals/dense-statblock-parser";
import { FiveeStatblockView } from "@/components/gm/screen-grid/renderers/fivee-statblock-view";
import { resolveMonsterFullStatblockAction } from "@/lib/actions/wiki-bestiary-search-actions";
import type { CombatConditionId } from "@/lib/combat-conditions";
import type {
  SavingThrowsMap,
  CombatEffectDuration,
  CombatEffectSavePrompt,
  MonsterActionSuggestion,
} from "@/lib/fight-mode/types";
import { computeEffectiveArmorClass } from "@/lib/fight-mode/state-transitions";
import { parseMonsterActionSuggestions } from "@/lib/fight-mode/sheet-combat-extractor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ActiveCombatantCardProps = {
  entry: InitiativeEntry | null;
  campaignId: string;
  allCombatants?: Array<{ id: string; name: string; type: "pc" | "monster" | "custom" }>;
  onUpdateHp: (id: string, delta: number) => void;
  onSetHp: (id: string, hp: number) => void;
  onSetTempHp?: (id: string, tempHp: number) => void;
  onToggleReaction: (id: string) => void;
  onSpendSlot?: (id: string, level: number) => void;
  onRestoreSlot?: (id: string, level: number) => void;
  onResetSlots?: (id: string) => void;
  onToggleDeathSaveSuccess?: (id: string) => void;
  onToggleDeathSaveFail?: (id: string) => void;
  onOpenWikiStatblock?: (entityId?: string, name?: string) => void;
  onUpdateNote?: (id: string, note: string) => void;
  onUpdateConditions?: (id: string, conditions: CombatConditionId[]) => void;
  onAddEffect?: (payload: {
    entryId: string;
    statusId: string;
    customLabel?: string;
    sourceCasterId?: string;
    sourceName?: string;
    isConcentration?: boolean;
    spellName?: string;
    duration?: CombatEffectDuration | null;
    savePrompt?: CombatEffectSavePrompt | null;
  }) => void;
  onRemoveEffect?: (entryId: string, effectId: string) => void;
  onConsumeEffect?: (entryId: string, effectId: string) => void;
  onStartConcentration?: (payload: {
    casterId: string;
    spellName: string;
    targetIds?: string[];
    linkedStatusId?: string;
    customEffectLabel?: string;
  }) => void;
  onBreakConcentration?: (casterId: string) => void;
  onUpdateSavingThrowBonus?: (entryId: string, ability: keyof SavingThrowsMap, bonus: number) => void;
  onEnrichMonster?: (id: string, fullStatblock: string) => void;
};

const STAT_LABELS: Record<string, string> = {
  for: "FOR",
  des: "DES",
  cos: "COS",
  int: "INT",
  sag: "SAG",
  car: "CAR",
};

const MONSTER_STATBLOCK_CACHE = new Map<string, string>();

export function ActiveCombatantCard({
  entry,
  campaignId,
  allCombatants,
  onUpdateHp,
  onSetHp,
  onSetTempHp,
  onToggleReaction,
  onSpendSlot,
  onRestoreSlot,
  onResetSlots,
  onToggleDeathSaveSuccess,
  onToggleDeathSaveFail,
  onUpdateNote,
  onUpdateConditions,
  onAddEffect,
  onRemoveEffect,
  onConsumeEffect,
  onStartConcentration,
  onBreakConcentration,
  onUpdateSavingThrowBonus,
  onEnrichMonster,
}: ActiveCombatantCardProps) {
  // Input stato per PF
  const [editingExactHp, setEditingExactHp] = useState(false);
  const [exactHpDraft, setExactHpDraft] = useState("");
  const [editingTempHp, setEditingTempHp] = useState(false);
  const [tempHpDraft, setTempHpDraft] = useState("");
  const [customHpDelta, setCustomHpDelta] = useState("");
  const [editingSaveStat, setEditingSaveStat] = useState<keyof SavingThrowsMap | null>(null);
  const [saveStatDraft, setSaveStatDraft] = useState("");

  // Stato per dialog/popover suggerimenti mostri (Consegna 2 - Vincolo 7)
  const [selectedSuggestion, setSelectedSuggestion] = useState<MonsterActionSuggestion | null>(null);
  const [suggestionTargetId, setSuggestionTargetId] = useState<string>("");
  const [suggestionDc, setSuggestionDc] = useState<string>("");
  const [suggestionAbility, setSuggestionAbility] = useState<keyof SavingThrowsMap>("cos");
  const [suggestionTiming, setSuggestionTiming] = useState<"" | "turn_end" | "turn_start">("");
  const [suggestionDurationTiming, setSuggestionDurationTiming] = useState<"turn_end" | "turn_start">("turn_end");
  const [suggestionDuration, setSuggestionDuration] = useState<string>("10");

  // Cache del body markdown in memoria
  const [cachedBody, setCachedBody] = useState<string | null>(null);
  const [isLoadingStatblock, setIsLoadingStatblock] = useState(false);
  const entryId = entry?.id;
  const entryName = entry?.name;
  const entryType = entry?.type;
  const entityId = entry?.entityId;
  const contentBody = entry?.contentBody;

  useEffect(() => {
    let cancelled = false;
    setCachedBody(null);
    setIsLoadingStatblock(false);
    if (!entryId || !entryName) return;
    const isMonster = entryType === "monster" || entryType === "custom";
    if (!isMonster && !entityId) {
      setCachedBody(contentBody || null);
      return;
    }
    const cleanName = entryName.replace(/\s+\d+$/, "").trim();
    const cacheKey = `${campaignId}:${entityId ?? cleanName.toLowerCase()}`;
    if (contentBody && isCompleteMonsterStatblock(contentBody)) {
      setCachedBody(contentBody);
      MONSTER_STATBLOCK_CACHE.set(cacheKey, contentBody);
      return;
    }
    const cached = MONSTER_STATBLOCK_CACHE.get(cacheKey);
    if (cached) {
      setCachedBody(cached);
      if (contentBody !== cached) onEnrichMonster?.(entryId, cached);
      return;
    }
    setIsLoadingStatblock(true);
    void resolveMonsterFullStatblockAction(campaignId, cleanName, entityId)
      .then((result) => {
        if (result.success && result.text) {
          MONSTER_STATBLOCK_CACHE.set(cacheKey, result.text);
          if (cancelled) return;
          setCachedBody(result.text);
          onEnrichMonster?.(entryId, result.text);
        } else if (!cancelled) {
          setCachedBody(contentBody || null);
        }
      })
      .catch(() => {
        if (!cancelled) setCachedBody(contentBody || null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatblock(false);
      });
    return () => { cancelled = true; };
  }, [entryId, entryName, entryType, entityId, contentBody, campaignId, onEnrichMonster]);

  const rawMarkdown = entry?.contentBody || cachedBody || "";

  // Statblock completo D&D 5e pre-parsato per mostri
  const parsedStatblock = useMemo(() => {
    if (!rawMarkdown.trim()) return null;
    return parseDenseStatblock(rawMarkdown, {
      fallbackName: entry?.name.replace(/\s+\d+$/, ""),
      fallbackStats: entry
        ? {
            ac: entry.armorClass,
            hp: entry.maxHp || entry.hp,
          }
        : undefined,
    });
  }, [rawMarkdown, entry]);

  // CD Incantesimi e Bonus TxC Magico
  const spellStats = useMemo(() => {
    if (!entry) return { cd: null, txc: null };
    return extractSpellStats(entry, rawMarkdown);
  }, [entry, rawMarkdown]);

  // Calcolo armi/attacchi per i PG (dati strutturati scheda, o fallback classe)
  const pcWeapons = useMemo(() => {
    if (!entry || entry.type !== "pc") return [];
    if (entry.weapons && entry.weapons.length > 0) return entry.weapons;
    return [];
  }, [entry]);

  // Suggerimenti automatici di condizioni / capacità dai testi delle azioni del mostro
  const monsterActionSuggestions = useMemo(() => {
    if (!entry || (entry.type !== "monster" && entry.type !== "custom") || !rawMarkdown) return [];
    return parseMonsterActionSuggestions(rawMarkdown);
  }, [entry, rawMarkdown]);

  const handleOpenSuggestion = (sug: MonsterActionSuggestion) => {
    setSelectedSuggestion(sug);
    setSuggestionDc(sug.dc !== undefined ? String(sug.dc) : "");
    setSuggestionAbility(sug.ability ?? "cos");
    setSuggestionTiming(sug.timing ?? "");
    setSuggestionDuration(sug.durationTurns !== undefined ? String(sug.durationTurns) : "");
    setSuggestionDurationTiming("turn_end");
    if (allCombatants && allCombatants.length > 0) {
      const defaultTarget = allCombatants.find((c) => c.id !== entry?.id);
      setSuggestionTargetId(defaultTarget ? defaultTarget.id : allCombatants[0].id);
    }
  };

  const handleApplySuggestion = (sug: MonsterActionSuggestion) => {
    if (!onAddEffect || !suggestionTargetId || !entry) return;
    const dcNum = parseInt(suggestionDc, 10);
    const durNum = parseInt(suggestionDuration, 10);
    const duration: CombatEffectDuration | null =
      !isNaN(durNum) && durNum > 0
        ? {
            remainingTurns: durNum,
            tickOn: suggestionDurationTiming,
            anchorCombatantId: entry.id,
          }
        : null;
    const savePrompt: CombatEffectSavePrompt | null =
      suggestionTiming && !isNaN(dcNum) && dcNum > 0
        ? {
            dc: dcNum,
            ability: suggestionAbility,
            timing: suggestionTiming,
            onPass: (sug.onPass ?? "remove_effect") as "remove_effect" | "manual",
          }
        : null;

    onAddEffect({
      entryId: suggestionTargetId,
      statusId: sug.statusId,
      customLabel: sug.label,
      sourceCasterId: entry.id,
      sourceName: entry.name,
      isConcentration: sug.requiresConcentration,
      spellName: sug.actionName,
      duration,
      savePrompt,
    });
    setSelectedSuggestion(null);
  };

  if (!entry) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg border border-brass-base/20 bg-[#120d09]/90 p-8 text-center text-parchment-400">
        <Swords className="h-10 w-10 text-brass-base/40 mb-3 animate-pulse" />
        <h3 className="font-cinzel text-base font-bold text-brass-light">Nessun Combattente in Turno</h3>
        <p className="mt-1 max-w-xs text-xs text-parchment-500">
          Avanza con il turno nell&apos;iniziativa per visualizzare la scheda tattica del personaggio o del mostro attivo.
        </p>
      </div>
    );
  }

  const isMonster = entry.type === "monster" || entry.type === "custom";
  const maxHp = Math.max(1, entry.maxHp || entry.hp || 1);
  const hpPct = Math.max(0, Math.min(100, (entry.hp / maxHp) * 100));

  const handleApplyDamage = () => {
    const val = parseInt(customHpDelta, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateHp(entry.id, -val);
      setCustomHpDelta("");
    }
  };

  const handleApplyHeal = () => {
    const val = parseInt(customHpDelta, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateHp(entry.id, val);
      setCustomHpDelta("");
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 text-parchment-100 shadow-2xl">
      {/* =========================================================================
          HEADER SPOTLIGHT: Nome, Ritratto Grande, CA, CD Magia, Reazione
          ========================================================================= */}
      <div className="shrink-0 border-b border-brass-base/30 bg-gradient-to-r from-[#1c120a] via-[#160d07] to-[#1a110a] p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Ritratto & Info Principali */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Avatar / Ritratto Grande */}
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 border-brass-base/50 bg-black shadow-lg">
              {entry.portraitUrl ? (
                <Image
                  src={entry.portraitUrl}
                  alt={entry.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-brass-base/40">
                  {entry.type === "pc" ? <User className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded bg-emerald-950/90 border border-emerald-600/50 px-2 py-0.5 font-cinzel text-[10px] font-black tracking-wider text-emerald-300 shadow-sm">
                  TURNO ATTIVO
                </span>
                {entry.gs && (
                  <span className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                    GS {entry.gs}
                  </span>
                )}
                {entry.exp ? (
                  <span className="rounded bg-amber-950/80 border border-amber-700/50 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                    {entry.exp} XP
                  </span>
                ) : null}
                {entry.activeConcentration && (
                  <span className="inline-flex items-center gap-1 rounded bg-fuchsia-950/80 border border-fuchsia-600/60 px-2 py-0.5 font-cinzel text-[10px] font-black text-fuchsia-200 shadow-sm">
                    <Sparkles className="h-3 w-3 text-fuchsia-300 animate-pulse" />
                    CONCENTRATO: {entry.activeConcentration.spellName}
                    {onBreakConcentration && (
                      <button
                        type="button"
                        onClick={() => onBreakConcentration(entry.id)}
                        className="ml-1 rounded px-1 text-[9px] text-red-300 hover:bg-red-900/60 transition-colors"
                        title="Interrompi concentrazione e rimuovi effetti collegati"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                )}
              </div>
              <h2 className="truncate font-cinzel text-xl sm:text-2xl font-black text-amber-100 drop-shadow-md mt-1 leading-tight">
                {entry.name}
              </h2>
              <p className="truncate text-xs text-parchment-400 font-sans mt-0.5">
                {entry.characterClass || (isMonster ? "Mostro / Nemico" : "Personaggio Giocatore")}
              </p>
            </div>
          </div>

          {/* Badge CA, CD Magia e Tasto Reazione */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Badge CA Harmonizzato (con supporto modificatori ed effetti) */}
            {(() => {
              const acInfo = computeEffectiveArmorClass(entry.armorClass, entry.activeEffects);
              const acModified = acInfo.effectiveAc !== acInfo.baseAc;
              const acTooltipParts = [`CA Base: ${acInfo.baseAc}`];
              if (acInfo.flatDelta !== 0) {
                acTooltipParts.push(
                  `Modificatori: ${acInfo.flatDelta > 0 ? `+${acInfo.flatDelta}` : acInfo.flatDelta}`
                );
              }
              if (acInfo.coverBonus > 0) {
                acTooltipParts.push(`Copertura: +${acInfo.coverBonus}`);
              }
              if (acInfo.formulaHints.length > 0) {
                acTooltipParts.push(`Formule: ${acInfo.formulaHints.join("; ")}`);
              }

              return (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-cinzel font-bold text-brass-light/90 uppercase tracking-wider mb-0.5">
                    CA
                  </span>
                  <div
                    className={cn(
                      "flex h-11 sm:h-12 min-w-[58px] sm:min-w-[64px] flex-col items-center justify-center rounded-lg border px-2.5 shadow-md",
                      acModified
                        ? "border-cyan-500/60 bg-gradient-to-b from-[#0e2733] to-[#08151c]"
                        : "border-amber-600/50 bg-gradient-to-b from-[#2a170a] to-[#140b05]"
                    )}
                    title={acTooltipParts.join(" · ")}
                  >
                    <div className="flex items-center gap-1">
                      <Shield
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          acModified ? "text-cyan-300" : "text-amber-400/90"
                        )}
                      />
                      <span
                        className={cn(
                          "font-cinzel text-base sm:text-lg font-black leading-none",
                          acModified ? "text-cyan-200" : "text-amber-100"
                        )}
                      >
                        {acInfo.effectiveAc}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-[9px] font-mono leading-tight mt-0.5",
                        acModified ? "text-cyan-400/90" : "text-amber-400/70"
                      )}
                    >
                      {acModified ? `Base ${acInfo.baseAc}` : "Armatura"}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Badge CD Magia Harmonizzato (se presente) */}
            {spellStats.cd ? (
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-cinzel font-bold text-purple-300 uppercase tracking-wider mb-0.5">
                  CD MAGIA
                </span>
                <div
                  className="flex h-11 sm:h-12 min-w-[58px] sm:min-w-[64px] flex-col items-center justify-center rounded-lg border border-purple-500/50 bg-gradient-to-b from-purple-950/70 to-[#180922] px-2.5 shadow-md"
                  title={`Difficoltà Tiro Salvezza Incantesimi: ${spellStats.cd}${spellStats.txc ? ` (TxC ${spellStats.txc})` : ""}`}
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400/90 shrink-0" />
                    <span className="font-cinzel text-base sm:text-lg font-black text-purple-100 leading-none">
                      {spellStats.cd}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-purple-300 font-semibold leading-tight mt-0.5">
                    {spellStats.txc ? `TxC ${spellStats.txc}` : "Incanti"}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Tasto Reazione Rapida */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-cinzel font-bold text-brass-light/90 uppercase tracking-wider mb-0.5">
                REAZIONE
              </span>
              <button
                type="button"
                onClick={() => onToggleReaction(entry.id)}
                className={cn(
                  "flex h-11 sm:h-12 min-w-[64px] flex-col items-center justify-center rounded-lg border px-2.5 transition-all shadow-md",
                  entry.usedReaction
                    ? "border-amber-600 bg-amber-950/80 text-amber-200 ring-1 ring-amber-500/50"
                    : "border-emerald-600/60 bg-emerald-950/50 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-900/60"
                )}
                title={
                  entry.usedReaction
                    ? "Reazione USATA in questo round (clicca per ripristinare)"
                    : "Reazione PRONTA (clicca per segnarla come usata)"
                }
              >
                <Zap className={cn("h-3.5 w-3.5", entry.usedReaction ? "text-amber-400 fill-amber-400" : "text-emerald-400")} />
                <span className="text-[9px] font-mono font-bold mt-0.5 uppercase">
                  {entry.usedReaction ? "Spesa" : "Pronta"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CORPO PRINCIPALE SCROLLABILE
          ========================================================================= */}
      <div className="scrollbar-barber-y flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* =====================================================================
            1. SEZIONE VITALS (HP, BARRA COLORATA CON ANIMAZIONE, CONTROLLI RAPIDI, TEMP HP)
            ===================================================================== */}
        <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 sm:p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 font-cinzel text-xs sm:text-sm font-bold text-brass-light uppercase tracking-wider">
                <Heart className="h-4 w-4 text-rose-500" />
                Punti Ferita (HP)
              </span>

              {/* PF Temporanei Badge / Edit */}
              {editingTempHp ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    value={tempHpDraft}
                    onChange={(e) => setTempHpDraft(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(tempHpDraft, 10);
                      if (!isNaN(val)) onSetTempHp?.(entry.id, Math.max(0, val));
                      setEditingTempHp(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(tempHpDraft, 10);
                        if (!isNaN(val)) onSetTempHp?.(entry.id, Math.max(0, val));
                        setEditingTempHp(false);
                      } else if (e.key === "Escape") {
                        setEditingTempHp(false);
                      }
                    }}
                    className="h-6 w-16 text-xs font-mono font-bold bg-black border-cyan-500 text-cyan-200 text-center"
                    autoFocus
                  />
                </div>
              ) : (entry.tempHp ?? 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setTempHpDraft(String(entry.tempHp ?? 0));
                    setEditingTempHp(true);
                  }}
                  className="rounded border border-cyan-500/60 bg-cyan-950/70 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-900/70 shadow-sm"
                  title="Punti Ferita Temporanei attivi (assorbono il danno prima dei PF reali). Clicca per modificare."
                >
                  +{entry.tempHp} PF Temp
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempHpDraft("0");
                    setEditingTempHp(true);
                  }}
                  className="rounded border border-zinc-700/60 bg-zinc-900/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 hover:text-cyan-300 hover:border-cyan-600/50"
                  title="Imposta Punti Ferita Temporanei"
                >
                  +PF Temp
                </button>
              )}
            </div>

            {/* HP Numerico (con modifica diretta) */}
            {editingExactHp ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={exactHpDraft}
                  onChange={(e) => setExactHpDraft(e.target.value)}
                  onBlur={() => {
                    const val = parseInt(exactHpDraft, 10);
                    if (!isNaN(val)) onSetHp(entry.id, val);
                    setEditingExactHp(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = parseInt(exactHpDraft, 10);
                      if (!isNaN(val)) onSetHp(entry.id, val);
                      setEditingExactHp(false);
                    } else if (e.key === "Escape") {
                      setEditingExactHp(false);
                    }
                  }}
                  className="h-7 w-20 text-xs font-mono font-bold bg-black border-amber-600 text-white text-center"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs border-amber-700/60 bg-amber-950/60 text-amber-200"
                  onClick={() => {
                    const val = parseInt(exactHpDraft, 10);
                    if (!isNaN(val)) onSetHp(entry.id, val);
                    setEditingExactHp(false);
                  }}
                >
                  OK
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setExactHpDraft(String(entry.hp));
                  setEditingExactHp(true);
                }}
                className="group flex items-center gap-1.5 rounded px-2 py-0.5 hover:bg-black/40 transition-colors"
                title="Clicca per impostare valore esatto di PF"
              >
                <span className="font-mono text-2xl sm:text-3xl font-black text-white">
                  {entry.hp}
                </span>
                <span className="font-mono text-sm text-zinc-400 font-normal">
                  / {maxHp}
                </span>
                <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-xs text-amber-300 ml-1">
                  {Math.round(hpPct)}%
                </span>
                <Edit3 className="h-3 w-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
              </button>
            )}
          </div>

          {/* Barra dei Punti Ferita Grafica con cambio colore dinamico */}
          <div className="h-4 w-full rounded-full overflow-hidden bg-black/80 border border-brass-base/40 p-0.5 shadow-inner">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                hpPct <= 25
                  ? "bg-gradient-to-r from-rose-700 via-red-600 to-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                  : hpPct <= 50
                  ? "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  : "bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              )}
              style={{ width: `${hpPct}%` }}
            />
          </div>

          {/* Controlli Rapidi HP: Pulsanti Incremento/Decremento + Input Quantità */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brass-base/15">
            {/* Bottoni veloci danno / cura */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-cinzel font-bold text-red-400 mr-1">DANNO:</span>
              <button
                type="button"
                onClick={() => onUpdateHp(entry.id, -10)}
                className="h-6 px-1.5 rounded bg-[#20120b] border border-red-800/50 text-red-300 hover:bg-red-900/50 text-[11px] font-mono font-bold"
                title="Danno -10"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => onUpdateHp(entry.id, -5)}
                className="h-6 px-1.5 rounded bg-[#20120b] border border-red-800/50 text-red-300 hover:bg-red-900/50 text-[11px] font-mono font-bold"
                title="Danno -5"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => onUpdateHp(entry.id, -1)}
                className="h-6 px-1.5 rounded bg-[#20120b] border border-red-800/50 text-red-300 hover:bg-red-900/50 text-[11px] font-mono font-bold"
                title="Danno -1"
              >
                -1
              </button>
            </div>

            {/* Input Danno/Cura personalizzato */}
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="±..."
                value={customHpDelta}
                onChange={(e) => setCustomHpDelta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleApplyDamage();
                  }
                }}
                className="h-6 w-16 text-xs font-mono font-bold bg-black/80 border-brass-base/40 text-amber-200 text-center"
              />
              <button
                type="button"
                onClick={handleApplyDamage}
                className="h-6 px-2 rounded border border-red-800/60 bg-red-950/60 text-red-300 hover:bg-red-900/60 text-[10px] font-bold font-mono transition-colors"
                title="Applica Danno"
              >
                ⚔️ Danno
              </button>
              <button
                type="button"
                onClick={handleApplyHeal}
                className="h-6 px-2 rounded border border-emerald-800/60 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 text-[10px] font-bold font-mono transition-colors"
                title="Applica Cura"
              >
                💚 Cura
              </button>
            </div>

            {/* Bottoni veloci cura */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-cinzel font-bold text-emerald-400 mr-1">CURA:</span>
              <button
                type="button"
                onClick={() => onUpdateHp(entry.id, 1)}
                className="h-6 px-1.5 rounded bg-[#10200b] border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/50 text-[11px] font-mono font-bold"
                title="Cura +1"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => onUpdateHp(entry.id, 5)}
                className="h-6 px-1.5 rounded bg-[#10200b] border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/50 text-[11px] font-mono font-bold"
                title="Cura +5"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => onUpdateHp(entry.id, 10)}
                className="h-6 px-1.5 rounded bg-[#10200b] border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/50 text-[11px] font-mono font-bold"
                title="Cura +10"
              >
                +10
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            2. VISTA SCHEDA: STATBLOCK DIRETTO (SE MOSTRO) OPPURE SCHEDA PG
            ===================================================================== */}
        {isMonster ? (
          <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 sm:p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-brass-base/20 pb-2 mb-3">
              <div className="flex items-center gap-2 font-cinzel text-xs sm:text-sm font-bold text-amber-200">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <span>Statblock Creatura (D&amp;D 5e)</span>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingStatblock ? (
                  <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400 animate-pulse">
                    <Sparkles className="h-3 w-3 animate-spin" /> Caricamento manuale...
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400/90">Ufficiale 5e · Pronto</span>
                )}
              </div>
            </div>

            {isLoadingStatblock && !parsedStatblock ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-amber-300 font-cinzel">
                <Sparkles className="h-6 w-6 animate-spin text-amber-400 mb-2" />
                <span>Caricamento Statblock dal Bestiario Ufficiale...</span>
              </div>
            ) : parsedStatblock ? (
              <FiveeStatblockView data={parsedStatblock} />
            ) : (
              <div className="p-4 text-center text-xs text-parchment-400 font-serif">
                Caricamento scheda in corso...
              </div>
            )}

            {/* SUGGERIMENTI CAPACITÀ E CONDIZIONI DEDOTTI DAI TESTI (Consegna 2 - Vincolo 7) */}
            {monsterActionSuggestions.length > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-600/30 bg-amber-950/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-600/20 pb-1.5">
                  <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Suggerimenti Condizioni &amp; Azioni</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 italic">
                    Deduzioni da verificare · GM sceglie bersaglio
                  </span>
                </div>

                <div className="space-y-2">
                  {monsterActionSuggestions.map((sug) => {
                    const isSelected = selectedSuggestion?.id === sug.id;
                    return (
                      <div
                        key={sug.id}
                        className="rounded-lg border border-brass-base/20 bg-[#120c08] p-2 text-xs space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-parchment-100">{sug.actionName}</span>
                            <span className="rounded bg-rose-950/80 border border-rose-600/50 px-1.5 py-0.5 text-[9px] font-bold text-rose-300">
                              {sug.label}
                            </span>
                              {sug.initialSaveDc ? (
                                <span className="rounded bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                                TS iniziale CD {sug.initialSaveDc} {sug.initialSaveAbility?.toUpperCase()}
                                </span>
                              ) : null}
                            {sug.timing ? <span className="text-[9px] font-mono text-zinc-400">TS ripetuto: {sug.timing === "turn_start" ? "inizio turno" : "fine turno"}</span> : null}
                          </div>

                          <Popover
                            open={isSelected}
                            onOpenChange={(open) => {
                              if (open) handleOpenSuggestion(sug);
                              else setSelectedSuggestion(null);
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] border-amber-600/50 text-amber-300 hover:bg-amber-950/60"
                              >
                                Verifica &amp; Applica
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 border-brass-base/40 bg-[#16100b] p-3 text-parchment-100 shadow-2xl space-y-2.5">
                              <div className="border-b border-brass-base/20 pb-1.5">
                                <p className="font-cinzel text-xs font-bold text-amber-300">
                                  Verifica e applica: {sug.actionName}
                                </p>
                                <p className="text-[10px] text-zinc-400 italic mt-0.5 line-clamp-2">
                                  “{sug.originalSentence}”
                                </p>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-brass-light mb-1">
                                  Bersaglio Effetto:
                                </label>
                                <select
                                  value={suggestionTargetId}
                                  onChange={(e) => setSuggestionTargetId(e.target.value)}
                                  className="w-full rounded border border-brass-base/30 bg-[#0c0805] px-2 py-1 text-xs text-parchment-100 focus:outline-none focus:border-amber-500"
                                >
                                  {(allCombatants ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({c.type.toUpperCase()})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-brass-light mb-1">
                                    CD Tiro Salvezza:
                                  </label>
                                  <Input
                                    type="number"
                                    value={suggestionDc}
                                    onChange={(e) => setSuggestionDc(e.target.value)}
                                    placeholder="Nessuna CD"
                                    className="h-7 text-xs bg-[#0c0805]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-brass-light mb-1">
                                    Caratteristica TS:
                                  </label>
                                  <select
                                    value={suggestionAbility}
                                    onChange={(e) =>
                                      setSuggestionAbility(e.target.value as keyof SavingThrowsMap)
                                    }
                                    className="w-full h-7 rounded border border-brass-base/30 bg-[#0c0805] px-2 text-xs text-parchment-100"
                                  >
                                    {(["for", "des", "cos", "int", "sag", "car"] as const).map((a) => (
                                      <option key={a} value={a}>
                                        {a.toUpperCase()}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-brass-light mb-1">
                                    TS ripetuto:
                                  </label>
                                  <select
                                    value={suggestionTiming}
                                    onChange={(e) =>
                                      setSuggestionTiming(e.target.value as "" | "turn_end" | "turn_start")
                                    }
                                    className="w-full h-7 rounded border border-brass-base/30 bg-[#0c0805] px-2 text-xs text-parchment-100"
                                  >
                                    <option value="">Nessun TS ripetuto</option>
                                    <option value="turn_end">Fine turno</option>
                                    <option value="turn_start">Inizio turno</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-brass-light mb-1">
                                    Durata (turni, se nota):
                                  </label>
                                  <Input
                                    type="number"
                                    value={suggestionDuration}
                                    onChange={(e) => setSuggestionDuration(e.target.value)}
                                    placeholder="10"
                                    className="h-7 text-xs bg-[#0c0805]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-brass-light mb-1">Turno che fa avanzare la durata:</label>
                                <select
                                  value={suggestionDurationTiming}
                                  onChange={(e) => setSuggestionDurationTiming(e.target.value as "turn_end" | "turn_start")}
                                  className="w-full h-7 rounded border border-brass-base/30 bg-[#0c0805] px-2 text-xs text-parchment-100"
                                >
                                  <option value="turn_end">Fine turno</option>
                                  <option value="turn_start">Inizio turno</option>
                                </select>
                              </div>

                              <div className="flex justify-end gap-2 pt-1.5 border-t border-brass-base/20">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => setSelectedSuggestion(null)}
                                >
                                  Annulla
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 px-2.5 text-[10px] bg-amber-600 hover:bg-amber-500 text-black font-bold"
                                  onClick={() => handleApplySuggestion(sug)}
                                >
                                  Applica Effetto
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <p className="text-[10px] text-zinc-400 italic bg-black/30 rounded p-1.5 border border-zinc-800">
                          “{sug.originalSentence}”
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* =====================================================================
             VISTA PERSONAGGIO GIOCATORE (PG)
             ===================================================================== */
          <div className="space-y-4">
            {/* TIRI SALVEZZA PG */}
            <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 sm:p-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
                    Tiri Salvezza (Saving Throws)
                  </span>
                  {entry.savingThrowsSource === "sheet" ? (
                    <span className="rounded bg-emerald-950/70 border border-emerald-600/40 px-1.5 py-0.5 text-[9px] text-emerald-300">
                      ✓ Da Scheda
                    </span>
                  ) : entry.savingThrowsSource === "manual" ? (
                    <span className="rounded bg-cyan-950/70 border border-cyan-600/40 px-1.5 py-0.5 text-[9px] text-cyan-300">
                      ✎ Manuale
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-600/50 px-1.5 py-0.5 text-[9px] text-amber-200"
                      title="Valori stimati: non presenti nei dati strutturati della scheda. Clicca su un TS per inserire il valore reale."
                    >
                      <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                      Stima classe
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">D&amp;D 5e</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(["for", "des", "cos", "int", "sag", "car"] as const).map((stat) => {
                  const val = entry.savingThrows?.[stat] ?? 0;
                  const formatted = val >= 0 ? `+${val}` : `${val}`;
                  const isHigh = val >= 3;
                  const isEditing = editingSaveStat === stat;

                  return (
                    <div
                      key={stat}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border p-1.5 transition-colors",
                        isHigh
                          ? "border-amber-600/50 bg-amber-950/40 text-amber-200 shadow-sm"
                          : "border-brass-base/20 bg-[#1a120b] text-parchment-300"
                      )}
                    >
                      <span className="text-[10px] font-cinzel font-bold tracking-wider text-brass-light/90">
                        {STAT_LABELS[stat]}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Input
                            type="number"
                            value={saveStatDraft}
                            onChange={(e) => setSaveStatDraft(e.target.value)}
                            onBlur={() => {
                              const parsed = parseInt(saveStatDraft, 10);
                              if (!isNaN(parsed)) {
                                onUpdateSavingThrowBonus?.(entry.id, stat, parsed);
                              }
                              setEditingSaveStat(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const parsed = parseInt(saveStatDraft, 10);
                                if (!isNaN(parsed)) {
                                  onUpdateSavingThrowBonus?.(entry.id, stat, parsed);
                                }
                                setEditingSaveStat(null);
                              } else if (e.key === "Escape") {
                                setEditingSaveStat(null);
                              }
                            }}
                            className="h-5 w-12 bg-black text-[11px] font-mono text-amber-200 text-center px-0"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSaveStatDraft(String(val));
                            setEditingSaveStat(stat);
                          }}
                          className="font-mono text-sm font-bold mt-0.5 hover:text-amber-300 transition-colors"
                          title={`Modifica TS ${STAT_LABELS[stat]}`}
                        >
                          {formatted}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DEATH SAVES (SE PG A 0 HP) */}
            {entry.hp <= 0 || (entry.deathSaves && (entry.deathSaves.success > 0 || entry.deathSaves.fail > 0)) ? (
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-3 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase text-red-300">
                    <Skull className="h-4 w-4 text-red-400" />
                    <span>Tiri Salvezza contro la Morte</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400/80">Morente a 0 PF</span>
                </div>

                <div className="flex items-center justify-around gap-4 bg-black/50 rounded-lg p-2.5 border border-red-900/30">
                  {/* Successi */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 font-cinzel">Successi:</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={`succ-${n}`}
                        type="button"
                        onClick={() => onToggleDeathSaveSuccess?.(entry.id)}
                        className={cn(
                          "h-6 w-6 rounded-full border transition-all flex items-center justify-center text-xs font-bold",
                          (entry.deathSaves?.success ?? 0) >= n
                            ? "border-emerald-400 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-emerald-600"
                        )}
                      >
                        ✓
                      </button>
                    ))}
                  </div>

                  {/* Fallimenti */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-red-400 font-cinzel">Fallimenti:</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={`fail-${n}`}
                        type="button"
                        onClick={() => onToggleDeathSaveFail?.(entry.id)}
                        className={cn(
                          "h-6 w-6 rounded-full border transition-all flex items-center justify-center text-xs font-bold",
                          (entry.deathSaves?.fail ?? 0) >= n
                            ? "border-red-400 bg-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-red-600"
                        )}
                      >
                        ✕
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* SLOT INCANTESIMI (SE CASTER) */}
            {entry.spellSlots && entry.spellSlots.max.length > 0 ? (
              <div className="rounded-xl border border-violet-900/30 bg-violet-950/15 p-3 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase text-violet-200">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>Slot Incantesimi</span>
                  </div>
                  {onResetSlots && (
                    <button
                      type="button"
                      onClick={() => onResetSlots(entry.id)}
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-violet-300 transition-colors"
                      title="Ripristina tutti gli slot (Riposo Lungo)"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Ripristina Tutti
                    </button>
                  )}
                </div>

                <SpellSlotsCell
                  slots={entry.spellSlots}
                  onSpend={(lvl) => onSpendSlot?.(entry.id, lvl)}
                  onRestore={(lvl) => onRestoreSlot?.(entry.id, lvl)}
                  onReset={() => onResetSlots?.(entry.id)}
                />
              </div>
            ) : null}

            {/* ARMI ED ATTACCHI PG */}
            {entry.weaponsSource === "sheet" && pcWeapons.length === 0 ? (
              <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 text-xs text-zinc-400">
                Nessuna arma registrata nei dati strutturati della scheda.
              </div>
            ) : entry.weaponsSource === "empty" && pcWeapons.length === 0 ? (
              <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 text-xs text-zinc-400">
                Dati sulle armi non disponibili.
              </div>
            ) : pcWeapons.length > 0 ? (
              <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
                    Armi ed Attacchi
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {entry.weaponsSource === "fallback" ? "Stima per classe · verifica" : "Dati della scheda"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {pcWeapons.map((w, idx) => (
                    <div
                      key={`${w.name}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-brass-base/15 bg-[#1a120b] p-2 text-xs"
                    >
                      <span className="font-bold text-parchment-100">{w.name}</span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="rounded bg-amber-950/60 px-1.5 py-0.5 text-amber-300 font-bold border border-amber-700/30">
                          {w.toHit ?? "Bonus non indicato"} {w.toHit ? "al tiro" : ""}
                        </span>
                        <span className="text-zinc-300">{w.damage ?? "Danni non indicati"}</span>
                        {w.type ? <span className="text-zinc-500 text-[10px] capitalize">{w.type}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* INCANTESIMI CONOSCIUTI / IN SCHEDA PG (Consegna 2 - Vincolo 6) */}
            {((entry.spells && entry.spells.length > 0) ||
              entry.spellSaveDc != null ||
              entry.spellAttackBonus != null) ? (
              <div className="rounded-xl border border-violet-900/30 bg-[#140e18] p-3 shadow-md space-y-2.5">
                <div className="flex items-center justify-between border-b border-violet-900/20 pb-1.5">
                  <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-violet-200">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span>Incantesimi a Disposizione (Scheda)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    {entry.spellSaveDc != null ? (
                      <span className="rounded bg-violet-950/80 px-1.5 py-0.5 text-violet-300 font-bold border border-violet-700/40">
                        CD {entry.spellSaveDc}
                      </span>
                    ) : null}
                    {entry.spellAttackBonus != null ? (
                      <span className="rounded bg-violet-950/80 px-1.5 py-0.5 text-violet-300 font-bold border border-violet-700/40">
                        TxC {entry.spellAttackBonus >= 0 ? `+${entry.spellAttackBonus}` : entry.spellAttackBonus}
                      </span>
                    ) : null}
                  </div>
                </div>

                {entry.spells && entry.spells.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {entry.spells.map((sp, idx) => (
                      <div
                        key={`${sp.name}-${idx}`}
                        className="flex items-center justify-between rounded border border-violet-900/20 bg-black/40 px-2 py-1 text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-parchment-200 truncate">{sp.name}</span>
                          {sp.concentration ? (
                            <span
                              className="text-[9px] font-mono font-bold text-amber-300"
                              title="Richiede Concentrazione"
                            >
                              (C)
                            </span>
                          ) : null}
                          {sp.ritual ? (
                            <span className="text-[9px] font-mono text-cyan-300" title="Rituale">
                              (R)
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[10px] font-mono text-violet-300/80 shrink-0 ml-1">
                          {sp.level === 0 ? "Trucchetto" : `Liv. ${sp.level}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className="text-[10px] text-zinc-500 italic border-t border-violet-900/20 pt-1.5">
                  Nota: Gli incantesimi elencati sono quelli presenti nella scheda del PG (non garantisce siano preparati o che gli slot siano disponibili).
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* =====================================================================
            3. CONDIZIONI & NOTE RAPIDE (COMUNI SIA PER PG CHE PER MOSTRI)
            ===================================================================== */}
        <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 space-y-3 shadow-md">
          <div>
            <span className="block font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light mb-1.5">
              Condizioni &amp; Stati Attivi
            </span>
            <ConditionsCell
              entryId={entry.id}
              name={entry.name}
              value={entry.conditions}
              activeEffects={entry.activeEffects}
              activeConcentration={entry.activeConcentration}
              allCombatants={allCombatants}
              onConsumeEffect={(effId) => onConsumeEffect?.(entry.id, effId)}
              onAddEffect={(payload) =>
                onAddEffect?.({
                  entryId: entry.id,
                  statusId: payload.statusId ?? "",
                  customLabel: payload.customLabel,
                  sourceCasterId: payload.sourceCasterId,
                  sourceName: payload.sourceName,
                  isConcentration: payload.linkToConcentration,
                  spellName: payload.concentrationSpellName,
                })
              }
              onRemoveEffect={(effId) => onRemoveEffect?.(entry.id, effId)}
              onStartConcentration={(payload) =>
                onStartConcentration?.({
                  casterId: payload.casterId,
                  spellName: payload.spellName,
                  targetIds: payload.targetIds,
                  linkedStatusId: payload.effectStatusId,
                })
              }
              onBreakConcentration={() => onBreakConcentration?.(entry.id)}
              onChange={(conds) => onUpdateConditions?.(entry.id, conds)}
            />
          </div>

          {onUpdateNote ? (
            <div>
              <span className="block font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light mb-1">
                Nota Rapida
              </span>
              <input
                type="text"
                value={entry.noteText ?? ""}
                onChange={(e) => onUpdateNote(entry.id, e.target.value)}
                placeholder="Es. Concentrato su Benedizione, schivata attiva..."
                className="w-full rounded border border-brass-base/20 bg-[#0e0a07] px-2.5 py-1 text-xs text-parchment-100 placeholder:text-zinc-600 focus:border-amber-600 focus:outline-none"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

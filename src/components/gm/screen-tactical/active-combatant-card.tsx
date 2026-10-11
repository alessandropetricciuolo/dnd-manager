"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";
import { SpellSlotsCell } from "@/components/gm/spell-slots-cell";
import { ConditionsCell } from "@/components/gm/conditions-cell";
import { getDefaultPcWeapons, extractSpellStats, isCompleteMonsterStatblock } from "@/lib/fight-mode/stats-helper";
import { parseDenseStatblock } from "@/lib/manuals/dense-statblock-parser";
import { FiveeStatblockView } from "@/components/gm/screen-grid/renderers/fivee-statblock-view";
import { resolveMonsterFullStatblockAction } from "@/lib/actions/wiki-bestiary-search-actions";
import type { CombatConditionId } from "@/lib/combat-conditions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ActiveCombatantCardProps = {
  entry: InitiativeEntry | null;
  campaignId: string;
  onUpdateHp: (id: string, delta: number) => void;
  onSetHp: (id: string, hp: number) => void;
  onToggleReaction: (id: string) => void;
  onSpendSlot?: (id: string, level: number) => void;
  onRestoreSlot?: (id: string, level: number) => void;
  onResetSlots?: (id: string) => void;
  onToggleDeathSaveSuccess?: (id: string) => void;
  onToggleDeathSaveFail?: (id: string) => void;
  onOpenWikiStatblock?: (entityId?: string, name?: string) => void;
  onUpdateNote?: (id: string, note: string) => void;
  onUpdateConditions?: (id: string, conditions: CombatConditionId[]) => void;
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
  onUpdateHp,
  onSetHp,
  onToggleReaction,
  onSpendSlot,
  onRestoreSlot,
  onResetSlots,
  onToggleDeathSaveSuccess,
  onToggleDeathSaveFail,
  onUpdateNote,
  onUpdateConditions,
  onEnrichMonster,
}: ActiveCombatantCardProps) {
  // Input stato per PF
  const [editingExactHp, setEditingExactHp] = useState(false);
  const [exactHpDraft, setExactHpDraft] = useState("");
  const [customHpDelta, setCustomHpDelta] = useState("");

  // Cache del body markdown in memoria
  const [cachedBody, setCachedBody] = useState<string | null>(null);
  const [isLoadingStatblock, setIsLoadingStatblock] = useState(false);
  const fetchedKeyRef = useRef<string | null>(null);

  // Caricamento immediato markdown completo da cache in memoria o manuali
  useEffect(() => {
    if (!entry) {
      setCachedBody(null);
      setIsLoadingStatblock(false);
      return;
    }

    const isMonster = entry.type === "monster" || entry.type === "custom";
    const cleanName = entry.name.replace(/\s+\d+$/, "").trim();
    const cacheKey = `${campaignId}:${cleanName.toLowerCase()}`;

    // 1. Se entry ha già un blocco completo con caratteristiche e azioni, usalo
    if (entry.contentBody && isCompleteMonsterStatblock(entry.contentBody)) {
      setCachedBody(entry.contentBody);
      MONSTER_STATBLOCK_CACHE.set(cacheKey, entry.contentBody);
      setIsLoadingStatblock(false);
      return;
    }

    // 2. Se è in cache in memoria, usalo all'istante
    const inCache = MONSTER_STATBLOCK_CACHE.get(cacheKey);
    if (inCache) {
      setCachedBody(inCache);
      if (entry.contentBody !== inCache) {
        entry.contentBody = inCache;
        onEnrichMonster?.(entry.id, inCache);
      }
      setIsLoadingStatblock(false);
      return;
    }

    // 3. Risolvi da DB / Manuali Bestiario se è mostro o ha entityId
    if (isMonster || entry.entityId) {
      if (fetchedKeyRef.current === cacheKey) return;
      fetchedKeyRef.current = cacheKey;
      setIsLoadingStatblock(true);

      void (async () => {
        try {
          const res = await resolveMonsterFullStatblockAction(campaignId, cleanName, entry.entityId);
          if (res.success && res.text) {
            MONSTER_STATBLOCK_CACHE.set(cacheKey, res.text);
            setCachedBody(res.text);
            entry.contentBody = res.text;
            onEnrichMonster?.(entry.id, res.text);
          } else if (entry.contentBody) {
            setCachedBody(entry.contentBody);
          }
        } catch (err) {
          console.warn("[ActiveCombatantCard] Errore risoluzione statblock:", err);
          if (entry.contentBody) {
            setCachedBody(entry.contentBody);
          }
        } finally {
          setIsLoadingStatblock(false);
        }
      })();
    } else {
      setCachedBody(entry.contentBody || null);
      setIsLoadingStatblock(false);
    }
  }, [entry, campaignId, onEnrichMonster]);

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

  // Calcolo armi/attacchi per i PG
  const pcWeapons = useMemo(() => {
    if (!entry || entry.type !== "pc") return [];
    return getDefaultPcWeapons(entry.characterClass);
  }, [entry]);

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
            {/* Scudo CA Gigante */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-cinzel font-bold text-brass-light/90 uppercase tracking-wider mb-0.5">
                CA
              </span>
              <div className="tactical-ac-shield w-11 h-12 sm:w-12 sm:h-13 flex items-center justify-center font-cinzel text-base sm:text-lg font-black text-white shadow-md">
                {entry.armorClass}
              </div>
            </div>

            {/* Badge CD Magia (se presente) */}
            {spellStats.cd ? (
              <div className="flex flex-col items-center rounded-lg border border-purple-500/40 bg-purple-950/50 px-2.5 py-1 text-center shadow-md">
                <span className="text-[9px] font-cinzel font-bold text-purple-300 uppercase tracking-wider">
                  CD MAGIA
                </span>
                <span className="font-mono text-base font-black text-purple-100 leading-tight">
                  {spellStats.cd}
                </span>
                {spellStats.txc ? (
                  <span className="text-[9px] font-mono text-purple-300/90">
                    TxC {spellStats.txc}
                  </span>
                ) : null}
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
                  "flex h-11 sm:h-12 flex-col items-center justify-center rounded-lg border px-2.5 transition-all shadow-md",
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
                <Zap className={cn("h-4 w-4", entry.usedReaction ? "text-amber-400 fill-amber-400" : "text-emerald-400")} />
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
            1. SEZIONE VITALS (HP, BARRA COLORATA CON ANIMAZIONE, CONTROLLI RAPIDI)
            ===================================================================== */}
        <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 sm:p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="flex items-center gap-2 font-cinzel text-xs sm:text-sm font-bold text-brass-light uppercase tracking-wider">
              <Heart className="h-4 w-4 text-rose-500" />
              Punti Ferita (HP)
            </span>

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
          </div>
        ) : (
          /* =====================================================================
             VISTA PERSONAGGIO GIOCATORE (PG)
             ===================================================================== */
          <div className="space-y-4">
            {/* TIRI SALVEZZA PG */}
            <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 sm:p-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
                  Tiri Salvezza (Saving Throws)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">D&amp;D 5e</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(["for", "des", "cos", "int", "sag", "car"] as const).map((stat) => {
                  const val = entry.savingThrows?.[stat] ?? 0;
                  const formatted = val >= 0 ? `+${val}` : `${val}`;
                  const isHigh = val >= 3;
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
                      <span className="font-mono text-sm font-bold mt-0.5">{formatted}</span>
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
            {pcWeapons.length > 0 ? (
              <div className="rounded-xl border border-brass-base/30 bg-[#160f0a] p-3 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
                    Armi ed Attacchi
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">Azioni d&apos;Attacco</span>
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
                          {w.toHit} al tiro
                        </span>
                        <span className="text-zinc-300">{w.damage}</span>
                        <span className="text-zinc-500 text-[10px] capitalize">{w.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
              name={entry.name}
              value={entry.conditions}
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

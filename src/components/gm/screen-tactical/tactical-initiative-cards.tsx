"use client";

import { useState } from "react";
import {
  Edit3,
  Heart,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  COMBAT_CONDITIONS,
  COMBAT_STATUS_CATALOG,
  getCombatStatusDefinition,
  isSingleUseStatus,
  type CombatConditionId,
} from "@/lib/combat-conditions";
import {
  computeEffectiveArmorClass,
  reconcileEntryEffectsAndConditions,
  type AddCombatEffectPayload,
} from "@/lib/fight-mode/state-transitions";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";

type TacticalInitiativeCardsProps = {
  entries: InitiativeEntry[];
  currentTurnIndex: number;
  currentRound?: number;
  onSelectTurn: (index: number) => void;
  onNextTurn?: () => void;
  onPrevTurn?: () => void;
  onSort?: () => void;
  onUpdateHp: (id: string, delta: number) => void;
  onSetHp: (id: string, hp: number) => void;
  onSetTempHp?: (id: string, tempHp: number) => void;
  onSetInitiative?: (id: string, initiative: number) => void;
  onSetAc?: (id: string, ac: number) => void;
  onToggleDead?: (id: string) => void;
  onToggleCondition: (id: string, conditionId: CombatConditionId) => void;
  onAddEffect?: (payload: AddCombatEffectPayload) => void;
  onRemoveEffect?: (targetId: string, effectId: string) => void;
  onConsumeEffect?: (targetId: string, effectId: string) => void;
  onBreakConcentration?: (casterId: string) => void;
  onOpenMonsterStat?: (entry: { id: string; name: string; entityId?: string }) => void;
  onDeleteEntry?: (id: string) => void;
  onOpenAddModal?: () => void;
  onToggleReaction?: (id: string) => void;
};

// Mappatura icone simboliche per le condizioni fantasy
const CONDITION_ICONS: Record<string, { icon: string; color: string }> = {
  avvelenato: { icon: "🧪", color: "text-emerald-400" },
  accecato: { icon: "👁️", color: "text-zinc-400" },
  affascinato: { icon: "✨", color: "text-pink-400" },
  afferrato: { icon: "✊", color: "text-amber-400" },
  assordato: { icon: "👂", color: "text-zinc-400" },
  incapacitato: { icon: "⚡", color: "text-purple-400" },
  indebolimento: { icon: "⏳", color: "text-amber-500" },
  invisibile: { icon: "👻", color: "text-sky-300" },
  paralizzato: { icon: "❄️", color: "text-cyan-300" },
  pietrificato: { icon: "🗿", color: "text-stone-400" },
  "privo-di-sensi": { icon: "💤", color: "text-indigo-300" },
  privo_di_sensi: { icon: "💤", color: "text-indigo-300" },
  prono: { icon: "⬇️", color: "text-orange-400" },
  spaventato: { icon: "😱", color: "text-rose-400" },
  stordito: { icon: "💫", color: "text-yellow-300" },
  trattenuto: { icon: "⛓️", color: "text-stone-300" },
};

export function TacticalInitiativeCards({
  entries,
  currentTurnIndex,
  onSelectTurn,
  onUpdateHp,
  onSetHp,
  onSetTempHp,
  onSetInitiative,
  onSetAc,
  onToggleDead,
  onToggleCondition,
  onAddEffect,
  onRemoveEffect,
  onConsumeEffect,
  onBreakConcentration,
  onOpenMonsterStat,
  onDeleteEntry,
  onToggleReaction,
}: TacticalInitiativeCardsProps) {
  const [editingHpId, setEditingHpId] = useState<string | null>(null);
  const [hpDraft, setHpDraft] = useState<string>("");
  const [editingInitId, setEditingInitId] = useState<string | null>(null);
  const [initDraft, setInitDraft] = useState<string>("");
  const [editingAcId, setEditingAcId] = useState<string | null>(null);
  const [acDraft, setAcDraft] = useState<string>("");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#110d0a]/90 text-parchment-100">
      {/* Lista Tessere Combattenti */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="rounded-lg border border-brass-base/20 bg-[#16100b]/60 p-8 text-center text-parchment-400 font-serif">
            <Swords className="mx-auto h-8 w-8 text-brass-base/40 mb-2" />
            <p className="font-cinzel text-sm text-brass-light">Nessun Combattente in Iniziativa</p>
            <p className="mt-1 text-xs text-parchment-500">
              Aggiungi mostri dal bestiario o importa i personaggi della campagna per avviare il combattimento tattico.
            </p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isCurrent = index === currentTurnIndex;
            const maxHp = Math.max(1, entry.maxHp || entry.hp || 1);
            const currentHp = entry.hp;
            const tempHp = Math.max(0, entry.tempHp ?? 0);
            const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
            const isDead = Boolean(entry.isDead || currentHp <= 0);
            const acCalc = computeEffectiveArmorClass(entry.armorClass, entry.activeEffects);
            const reconciled = reconcileEntryEffectsAndConditions(
              entry.id,
              entry.activeEffects,
              entry.conditions
            );
            const effects = reconciled.activeEffects;

            return (
              <div
                key={entry.id}
                className={cn(
                  "relative flex items-stretch rounded-lg border transition-all duration-200",
                  isCurrent
                    ? "border-emerald-500/80 bg-[#181a13] shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50"
                    : isDead
                    ? "border-red-900/30 bg-[#150a0a]/60 opacity-60"
                    : "border-brass-base/20 bg-[#150f0b]/90 hover:border-brass-base/40"
                )}
              >
                {/* 1. Badge Numerico d'Ordine Tattico */}
                <button
                  type="button"
                  onClick={() => onSelectTurn(index)}
                  title={`Imposta come turno attivo (${entry.name})`}
                  className={cn(
                    "flex w-10 sm:w-11 shrink-0 flex-col items-center justify-center rounded-l-lg border-r border-brass-base/20 font-cinzel text-base sm:text-lg font-black transition-colors select-none",
                    isCurrent
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-600/40"
                      : isDead
                      ? "bg-red-950/40 text-red-400/60"
                      : "bg-[#1f150c] text-amber-200 hover:bg-[#2a1d12]"
                  )}
                >
                  <span>{index + 1}</span>
                  <span className="text-[8px] font-mono tracking-tighter opacity-70">TURNO</span>
                </button>

                {/* 2. Scheda Vitals (HP, AC, Reazione, TS, Condizioni) */}
                <div className="flex flex-1 min-w-0 flex-col justify-between p-2 sm:p-2.5 gap-2">
                  {/* Riga Superiore: HP, Barra, Scudo AC, Tracker Reazione */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Vitals: HP & Barra */}
                    <div className="flex-1 min-w-[120px] max-w-[180px]">
                      <div className="flex items-center justify-between text-[9px] font-cinzel font-bold text-brass-light/90 uppercase tracking-wider mb-0.5">
                        <span className="flex items-center gap-1">
                          <Heart className="h-2.5 w-2.5 text-rose-400" /> HP
                        </span>
                        {editingHpId === entry.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={hpDraft}
                              onChange={(e) => setHpDraft(e.target.value)}
                              onBlur={() => {
                                const val = parseInt(hpDraft, 10);
                                if (!isNaN(val)) onSetHp(entry.id, val);
                                setEditingHpId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const val = parseInt(hpDraft, 10);
                                  if (!isNaN(val)) onSetHp(entry.id, val);
                                  setEditingHpId(null);
                                } else if (e.key === "Escape") {
                                  setEditingHpId(null);
                                }
                              }}
                              className="h-4 w-12 text-[9px] px-1 bg-black border-amber-600 text-white"
                              autoFocus
                              onFocus={(e) => e.target.select()}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHpId(entry.id);
                                setHpDraft(String(entry.hp));
                              }}
                              className="font-mono text-xs font-bold text-parchment-100 hover:text-amber-300"
                              title="Clicca per modificare PF"
                            >
                              {entry.hp} <span className="text-zinc-500 font-normal">/ {maxHp}</span>
                            </button>
                            {tempHp > 0 ? (
                              <span
                                className="rounded bg-cyan-950/90 border border-cyan-500/40 px-1 py-0.5 font-mono text-[9px] font-bold text-cyan-300"
                                title={`Punti Ferita Temporanei: +${tempHp}`}
                              >
                                +{tempHp}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Doppia Barra Tattica dei Punti Ferita */}
                      <div className="tactical-hp-track">
                        <div
                          className={cn(
                            "tactical-hp-bar-fill",
                            hpPct <= 25 ? "tactical-hp-bar-low" : hpPct <= 50 ? "tactical-hp-bar-mid" : ""
                          )}
                          style={{ width: `${hpPct}%` }}
                        />
                      </div>

                      {/* Micro bottoni rapidi HP +/- */}
                      <div className="flex items-center justify-between mt-1 text-[9px]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onUpdateHp(entry.id, -1)}
                            className="h-4 px-1 rounded bg-[#20120b] border border-red-800/40 text-red-300 hover:bg-red-900/40 text-[9px]"
                            title="Danno -1"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateHp(entry.id, -5)}
                            className="h-4 px-1 rounded bg-[#20120b] border border-red-800/40 text-red-300 hover:bg-red-900/40 text-[9px]"
                            title="Danno -5"
                          >
                            -5
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onUpdateHp(entry.id, 1)}
                            className="h-4 px-1 rounded bg-[#10200b] border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/40 text-[9px]"
                            title="Cura +1"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateHp(entry.id, 5)}
                            className="h-4 px-1 rounded bg-[#10200b] border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/40 text-[9px]"
                            title="Cura +5"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Vitals: Scudo CA Sagomato */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-cinzel font-bold text-brass-light/80 uppercase tracking-wider mb-0.5">
                        AC
                      </span>
                      {editingAcId === entry.id ? (
                        <Input
                          type="number"
                          value={acDraft}
                          onChange={(e) => setAcDraft(e.target.value)}
                          onBlur={() => {
                            const val = parseInt(acDraft, 10);
                            if (!isNaN(val)) onSetAc?.(entry.id, val);
                            setEditingAcId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(acDraft, 10);
                              if (!isNaN(val)) onSetAc?.(entry.id, val);
                              setEditingAcId(null);
                            } else if (e.key === "Escape") {
                              setEditingAcId(null);
                            }
                          }}
                          className="h-6 w-10 text-xs font-mono font-bold px-1 bg-black border-amber-600 text-amber-200 text-center"
                          autoFocus
                          onFocus={(e) => e.target.select()}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSetAc) {
                              setEditingAcId(entry.id);
                              setAcDraft(String(entry.armorClass));
                            }
                          }}
                          className={cn(
                            "tactical-ac-shield transition-all",
                            onSetAc && "hover:ring-1 hover:ring-amber-500/60 cursor-pointer",
                            acCalc.effectiveAc > acCalc.baseAc && "ring-1 ring-emerald-500/60",
                            acCalc.effectiveAc < acCalc.baseAc && "ring-1 ring-rose-500/60"
                          )}
                          title={`CA effettiva: ${acCalc.effectiveAc} (base ${acCalc.baseAc}${
                            acCalc.flatDelta !== 0
                              ? `, mod ${acCalc.flatDelta > 0 ? `+${acCalc.flatDelta}` : acCalc.flatDelta}`
                              : ""
                          }${acCalc.coverBonus > 0 ? `, copertura +${acCalc.coverBonus}` : ""}${
                            acCalc.formulaHints.length > 0 ? ` · ${acCalc.formulaHints.join(", ")}` : ""
                          })`}
                        >
                          <span
                            className={cn(
                              "font-cinzel text-xs font-black",
                              acCalc.effectiveAc > acCalc.baseAc
                                ? "text-emerald-300"
                                : acCalc.effectiveAc < acCalc.baseAc
                                ? "text-rose-300"
                                : "text-parchment-100"
                            )}
                          >
                            {acCalc.effectiveAc}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Vitals: Tracker Reazione */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-cinzel font-bold text-brass-light/80 uppercase tracking-wider mb-0.5">
                        REAZIONE
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleReaction?.(entry.id)}
                          className={cn(
                            "flex h-6 items-center gap-1 rounded border px-2 text-[10px] font-mono font-bold transition-all shadow-sm",
                            entry.usedReaction
                              ? "border-amber-600/70 bg-amber-950/70 text-amber-300 ring-1 ring-amber-500/40"
                              : "border-emerald-700/60 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60"
                          )}
                          title={
                            entry.usedReaction
                              ? "Reazione USATA in questo round (clicca per ripristinare)"
                              : "Reazione PRONTA (clicca per segnare come usata)"
                          }
                        >
                          <Zap className={cn("h-3 w-3", entry.usedReaction ? "text-amber-400 fill-amber-400" : "text-emerald-400")} />
                          <span>{entry.usedReaction ? "Usata" : "Pronta"}</span>
                        </button>

                        {entry.availableReactions && entry.availableReactions.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="flex h-6 w-6 items-center justify-center rounded border border-brass-base/30 bg-[#1e140d] text-[10px] text-brass-light hover:bg-brass-base/20 font-mono"
                                title={`Reazioni disponibili (${entry.availableReactions.length})`}
                              >
                                {entry.availableReactions.length}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 border-brass-base/40 bg-[#160f0a] p-2.5 text-parchment-100 shadow-xl text-xs">
                              <div className="font-cinzel font-bold text-amber-300 border-b border-brass-base/20 pb-1 mb-1.5 flex items-center justify-between">
                                <span>Reazioni ({entry.name})</span>
                                <span className="text-[10px] font-mono text-zinc-400">{entry.availableReactions.length} note</span>
                              </div>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {entry.availableReactions.map((r, ri) => (
                                  <div key={ri} className="rounded bg-[#1f150c] p-1.5 border border-brass-base/15">
                                    <div className="font-semibold text-amber-200 text-[11px]">{r.name}</div>
                                    {r.description ? (
                                      <p className="text-[10px] text-zinc-300 font-sans mt-0.5 leading-snug">{r.description}</p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Riga Inferiore: Tiri Salvezza (TS), Concentrazione & Stati */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-brass-base/10">
                    {/* Tiri Salvezza TS: FOR, DES, COS, INT, SAG, CAR */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] font-cinzel font-bold text-brass-light/70 mr-0.5">
                        TS:
                      </span>
                      {(["for", "des", "cos", "int", "sag", "car"] as const).map((stat) => {
                        const val = entry.savingThrows?.[stat] ?? 0;
                        const sign = val >= 0 ? `+${val}` : `${val}`;
                        const isProf = val >= 3;
                        return (
                          <span
                            key={stat}
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[9px] border",
                              isProf
                                ? "border-amber-600/50 bg-amber-950/40 text-amber-300 font-bold"
                                : "border-brass-base/20 bg-[#120d09] text-zinc-400"
                            )}
                            title={`Tiro Salvezza ${stat.toUpperCase()}: ${sign}${
                              entry.savingThrowsSource === "estimated" ? " (stimato)" : ""
                            }`}
                          >
                            <span className="text-[8px] uppercase font-cinzel opacity-75">{stat}</span>
                            <span>{sign}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Vitals: Concentrazione & Stati */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {entry.activeConcentration ? (
                        <span
                          className="inline-flex h-4 items-center gap-1 rounded border border-amber-500/60 bg-amber-950/80 px-1.5 text-[9px] font-semibold text-amber-200"
                          title={`Concentrato su: ${entry.activeConcentration.spellName}`}
                        >
                          <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                          <span className="max-w-[85px] truncate">
                            Conc: {entry.activeConcentration.spellName}
                          </span>
                          {onBreakConcentration ? (
                            <button
                              type="button"
                              onClick={() => onBreakConcentration(entry.id)}
                              className="hover:text-red-300"
                              title="Interrompi concentrazione"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          ) : null}
                        </span>
                      ) : null}

                      <span className="text-[9px] font-cinzel font-bold text-brass-light/80 uppercase tracking-wider mr-0.5">
                        Stati:
                      </span>
                      {effects.length > 0 ? (
                        effects.map((eff) => {
                          const def = getCombatStatusDefinition(eff.statusId);
                          const icon = def?.icon ?? CONDITION_ICONS[eff.statusId]?.icon ?? "✨";
                          const color =
                            def?.colorClass ??
                            CONDITION_ICONS[eff.statusId]?.color ??
                            "text-purple-200 border-purple-500/40 bg-purple-950/60";
                          const isSingleUse = isSingleUseStatus(eff.statusId);
                          return (
                            <div key={eff.effectId} className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onRemoveEffect) {
                                    onRemoveEffect(entry.id, eff.effectId);
                                  } else {
                                    onToggleCondition(entry.id, eff.statusId as CombatConditionId);
                                  }
                                }}
                                className={cn(
                                  "flex h-4 items-center gap-0.5 rounded border px-1 text-[9px] hover:bg-red-950/60",
                                  color
                                )}
                                title={`Rimuovi ${eff.label}${eff.sourceName ? ` (${eff.sourceName})` : ""}`}
                              >
                                <span>{icon}</span>
                                <span className="text-[8px] truncate max-w-[56px]">{eff.label}</span>
                                {eff.concentrationId ? (
                                  <span className="text-[7px] font-mono text-amber-300">C</span>
                                ) : null}
                                {eff.duration?.remainingTurns !== undefined && eff.duration.remainingTurns !== null ? (
                                  <span className="text-[7px] font-mono opacity-80">
                                    {eff.duration.remainingTurns}t
                                  </span>
                                ) : null}
                                {eff.duration?.anchorRemoved ? (
                                  <span className="text-[7px] text-amber-400" title="Ancora rimossa dal combattimento">
                                    ⚠️
                                  </span>
                                ) : null}
                              </button>
                              {isSingleUse && onConsumeEffect ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onConsumeEffect(entry.id, eff.effectId);
                                  }}
                                  className="h-4 px-1 rounded bg-amber-500/20 border border-amber-500/50 text-[8px] text-amber-300 hover:bg-amber-500/40 font-mono font-bold"
                                  title={`Consuma singola istanza di ${eff.label}`}
                                >
                                  ⚡
                                </button>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[10px] font-serif text-zinc-600 italic mr-1">—</span>
                      )}

                      {/* Dropdown Aggiungi Stato / Buff / Tattico */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="h-4 w-4 rounded-full border border-brass-base/30 bg-[#22160d] text-[10px] text-brass-light hover:bg-brass-base/20 flex items-center justify-center"
                            title="Aggiungi stato o buff"
                          >
                            +
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="max-h-64 w-56 overflow-y-auto border-brass-base/40 bg-[#140f0c] text-parchment-100">
                          <DropdownMenuLabel className="text-[10px] text-rose-300">
                            🔴 Condizioni e Debuff
                          </DropdownMenuLabel>
                          {COMBAT_STATUS_CATALOG.filter((s) => s.category === "condition").map((c) => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() => {
                                if (onAddEffect) {
                                  onAddEffect({ targetIds: [entry.id], statusId: c.id });
                                } else if (COMBAT_CONDITIONS.some((cc) => cc.id === c.id)) {
                                  onToggleCondition(entry.id, c.id as CombatConditionId);
                                }
                              }}
                              className="text-xs cursor-pointer hover:bg-brass-base/20 hover:text-brass-light"
                            >
                              {c.icon} {c.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator className="bg-brass-base/20" />
                          <DropdownMenuLabel className="text-[10px] text-emerald-300">
                            🟢 Buff Benefici
                          </DropdownMenuLabel>
                          {COMBAT_STATUS_CATALOG.filter((s) => s.category === "buff").map((c) => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() =>
                                onAddEffect?.({ targetIds: [entry.id], statusId: c.id })
                              }
                              className="text-xs cursor-pointer hover:bg-brass-base/20 hover:text-brass-light"
                            >
                              {c.icon} {c.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator className="bg-brass-base/20" />
                          <DropdownMenuLabel className="text-[10px] text-sky-300">
                            🔵 Stati Tattici
                          </DropdownMenuLabel>
                          {COMBAT_STATUS_CATALOG.filter((s) => s.category === "tactical").map((c) => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() =>
                                onAddEffect?.({ targetIds: [entry.id], statusId: c.id })
                              }
                              className="text-xs cursor-pointer hover:bg-brass-base/20 hover:text-brass-light"
                            >
                              {c.icon} {c.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* 3. Blocco Destro: Nome Entità, Iniziativa & Stat Block Trigger */}
                <div className="flex w-40 sm:w-48 shrink-0 flex-col justify-between border-l border-brass-base/20 bg-[#18110c] p-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenMonsterStat?.({ id: entry.id, entityId: entry.entityId, name: entry.name })}
                      className="w-full text-left truncate font-cinzel text-xs sm:text-sm font-bold text-parchment-100 hover:text-gold-relief transition-colors"
                      title={entry.name}
                    >
                      {entry.name}
                    </button>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-parchment-400 mt-1">
                      {editingInitId === entry.id ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            value={initDraft}
                            onChange={(e) => setInitDraft(e.target.value)}
                            onBlur={() => {
                              const val = parseInt(initDraft, 10);
                              if (!isNaN(val)) onSetInitiative?.(entry.id, val);
                              setEditingInitId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseInt(initDraft, 10);
                                if (!isNaN(val)) onSetInitiative?.(entry.id, val);
                                setEditingInitId(null);
                              } else if (e.key === "Tab") {
                                e.preventDefault();
                                const val = parseInt(initDraft, 10);
                                if (!isNaN(val)) onSetInitiative?.(entry.id, val);
                                const targetIndex = e.shiftKey ? index - 1 : index + 1;
                                if (targetIndex >= 0 && targetIndex < entries.length) {
                                  setEditingInitId(entries[targetIndex].id);
                                  setInitDraft(String(entries[targetIndex].initiative));
                                } else {
                                  setEditingInitId(null);
                                }
                              } else if (e.key === "Escape") {
                                setEditingInitId(null);
                              }
                            }}
                            className="h-7 w-20 text-sm font-mono font-bold px-2 py-0.5 bg-black border-amber-500 text-amber-300 text-center rounded focus:ring-1 focus:ring-amber-400"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                          />
                          <span className="text-[10px] font-mono text-amber-400/80 font-semibold">init</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSetInitiative) {
                              setEditingInitId(entry.id);
                              setInitDraft(String(entry.initiative));
                            }
                          }}
                          className={cn(
                            "group/init flex items-center gap-1.5 rounded border border-amber-600/30 bg-amber-950/30 px-2.5 py-1 -ml-0.5 text-left font-mono text-xs font-semibold text-amber-300 transition-all shadow-sm",
                            onSetInitiative && "hover:border-amber-500/70 hover:bg-amber-950/70 hover:text-amber-200 cursor-pointer"
                          )}
                          title="Clicca per inserire/modificare il valore di iniziativa"
                        >
                          <span className="font-bold text-sm text-amber-200">{entry.initiative}</span>
                          <span className="text-[10px] text-amber-400/80 font-normal">init</span>
                          {onSetInitiative && (
                            <Edit3 className="h-3 w-3 text-amber-400/50 group-hover/init:text-amber-300 transition-colors ml-0.5" />
                          )}
                        </button>
                      )}
                      <span className="truncate max-w-[70px] text-[10px] text-parchment-500 italic">
                        {entry.characterClass || (entry.type === "pc" ? "Eroe" : "Mostro")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-brass-base/10 mt-1">
                    {entry.type === "monster" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenMonsterStat?.({ id: entry.id, entityId: entry.entityId, name: entry.name })}
                        className="h-5 px-1 text-[9px] text-amber-300/80 hover:text-amber-200"
                        title="Vedi Statblock"
                      >
                        Scheda 🔍
                      </Button>
                    )}
                    {onToggleDead && (
                      <button
                        type="button"
                        onClick={() => onToggleDead(entry.id)}
                        className={cn(
                          "h-5 px-1 rounded text-[9px] flex items-center gap-0.5 transition-colors",
                          isDead ? "bg-red-950/80 text-red-300 border border-red-700/50" : "text-zinc-500 hover:text-red-400"
                        )}
                        title={isDead ? "Resuscita" : "Segna come sconfitto / morto"}
                      >
                        <Skull className="h-2.5 w-2.5" />
                        {isDead ? "Morto" : ""}
                      </button>
                    )}
                    {onDeleteEntry && (
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        className="h-5 w-5 text-zinc-600 hover:text-red-400 flex items-center justify-center ml-auto"
                        title="Rimuovi dal combattimento"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

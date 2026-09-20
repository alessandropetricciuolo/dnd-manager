"use client";

import { useState } from "react";
import {
  Heart,
  Shield,
  Skull,
  Swords,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { COMBAT_CONDITIONS, type CombatConditionId } from "@/lib/combat-conditions";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";

type TacticalInitiativeCardsProps = {
  entries: InitiativeEntry[];
  currentTurnIndex: number;
  currentRound?: number;
  onSelectTurn: (index: number) => void;
  onNextTurn: () => void;
  onPrevTurn: () => void;
  onUpdateHp: (id: string, delta: number) => void;
  onSetHp: (id: string, hp: number) => void;
  onToggleDead?: (id: string) => void;
  onToggleCondition: (id: string, conditionId: CombatConditionId) => void;
  onOpenMonsterStat?: (entry: { id: string; name: string; entityId?: string }) => void;
  onDeleteEntry?: (id: string) => void;
  onOpenAddModal?: () => void;
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
  privo_di_sensi: { icon: "💤", color: "text-indigo-300" },
  prono: { icon: "⬇️", color: "text-orange-400" },
  spaventato: { icon: "😱", color: "text-rose-400" },
  stordito: { icon: "💫", color: "text-yellow-300" },
  trattenuto: { icon: "⛓️", color: "text-stone-300" },
};

export function TacticalInitiativeCards({
  entries,
  currentTurnIndex,
  currentRound = 1,
  onSelectTurn,
  onNextTurn,
  onPrevTurn,
  onUpdateHp,
  onSetHp,
  onToggleDead,
  onToggleCondition,
  onOpenMonsterStat,
  onDeleteEntry,
  onOpenAddModal,
}: TacticalInitiativeCardsProps) {
  const [editingHpId, setEditingHpId] = useState<string | null>(null);
  const [hpDraft, setHpDraft] = useState<string>("");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#110d0a]/90 text-parchment-100">
      {/* Testata Combat Tracker */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-brass-base/20 bg-[#17110c] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-cinzel text-xs sm:text-sm font-extrabold tracking-wider text-brass-light uppercase">
            Combat & Initiative Tracker
          </span>
          <span className="rounded border border-amber-600/30 bg-amber-950/40 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
            Round {currentRound}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrevTurn}
            disabled={entries.length === 0}
            className="h-6 border-brass-base/30 px-2 text-[10px] font-cinzel text-brass-light hover:bg-brass-base/15"
          >
            Indietro
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onNextTurn}
            disabled={entries.length === 0}
            className="h-6 bg-guild-gold font-cinzel text-[10px] font-bold text-guild-black hover:bg-gold-light"
          >
            Turno Succ. ➔
          </Button>
          {onOpenAddModal && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenAddModal}
              className="h-6 border-amber-600/40 px-2 text-[10px] font-cinzel text-amber-200 hover:bg-amber-600/20"
            >
              + Combattente
            </Button>
          )}
        </div>
      </div>

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
            const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
            const isDead = Boolean(entry.isDead || currentHp <= 0);

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
                  title={`Seleziona turno di ${entry.name}`}
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
                  <span className="text-[8px] font-mono tracking-tighter opacity-70">INIT</span>
                </button>

                {/* 2. Scheda Vitals (HP, AC, Condizioni, Barra Grafica) */}
                <div className="flex flex-1 min-w-0 flex-col justify-between p-2 sm:p-2.5">
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
                            />
                          </div>
                        ) : (
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
                      <div className="tactical-ac-shield" title={`Classe Armatura: ${entry.armorClass}`}>
                        <span className="font-cinzel text-xs font-black text-parchment-100">
                          {entry.armorClass}
                        </span>
                      </div>
                    </div>

                    {/* Vitals: Condizioni */}
                    <div className="flex-1 min-w-[90px] flex flex-col justify-start">
                      <span className="text-[9px] font-cinzel font-bold text-brass-light/80 uppercase tracking-wider mb-1">
                        Condizioni
                      </span>
                      <div className="flex flex-wrap gap-1 items-center">
                        {entry.conditions && entry.conditions.length > 0 ? (
                          entry.conditions.map((cond) => {
                            const meta = CONDITION_ICONS[cond] ?? { icon: "•", color: "text-amber-200" };
                            return (
                              <button
                                key={cond}
                                type="button"
                                onClick={() => onToggleCondition(entry.id, cond as CombatConditionId)}
                                className={cn(
                                  "flex h-5 items-center gap-0.5 rounded border border-amber-700/30 bg-[#1d140d] px-1 text-[10px] hover:bg-red-950/40",
                                  meta.color
                                )}
                                title={`Rimuovi condizione: ${cond}`}
                              >
                                <span>{meta.icon}</span>
                                <span className="text-[9px] capitalize">{cond.slice(0, 4)}</span>
                              </button>
                            );
                          })
                        ) : (
                          <span className="text-[10px] font-serif text-zinc-600 italic">—</span>
                        )}

                        {/* Dropdown Aggiungi Condizione */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="h-4 w-4 rounded-full border border-brass-base/30 bg-[#22160d] text-[10px] text-brass-light hover:bg-brass-base/20 flex items-center justify-center"
                              title="Aggiungi condizione"
                            >
                              +
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="max-h-56 overflow-y-auto border-brass-base/40 bg-[#140f0c] text-parchment-100">
                            {COMBAT_CONDITIONS.map((c) => (
                              <DropdownMenuItem
                                key={c.id}
                                onClick={() => onToggleCondition(entry.id, c.id as CombatConditionId)}
                                className="text-xs cursor-pointer hover:bg-brass-base/20 hover:text-brass-light"
                              >
                                {c.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Blocco Destro: Nome Entità, Iniziativa & Stat Block Trigger */}
                <div className="flex w-36 sm:w-44 shrink-0 flex-col justify-between border-l border-brass-base/20 bg-[#18110c] p-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onOpenMonsterStat?.({ id: entry.id, entityId: entry.entityId, name: entry.name })}
                      className="w-full text-left truncate font-cinzel text-xs sm:text-sm font-bold text-parchment-100 hover:text-gold-relief transition-colors"
                      title={entry.name}
                    >
                      {entry.name}
                    </button>
                    <div className="flex items-center justify-between text-[10px] text-parchment-400 mt-0.5">
                      <span className="font-mono text-amber-300 font-semibold">{entry.initiative} init</span>
                      <span className="truncate max-w-[70px] text-[9px] text-parchment-500 italic">
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

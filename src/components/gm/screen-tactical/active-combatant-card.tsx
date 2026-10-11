"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  BookOpen,
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
import { MonsterStatPanel } from "@/components/gm/screen-grid/panels/monster-stat-panel";
import { SpellSlotsCell } from "@/components/gm/spell-slots-cell";
import { ConditionsCell } from "@/components/gm/conditions-cell";
import { getDefaultPcWeapons } from "@/lib/fight-mode/stats-helper";
import type { CombatConditionId } from "@/lib/combat-conditions";
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
};

const STAT_LABELS: Record<string, string> = {
  for: "FOR",
  des: "DES",
  cos: "COS",
  int: "INT",
  sag: "SAG",
  car: "CAR",
};

export function ActiveCombatantCard({
  entry,
  campaignId,
  onUpdateHp,
  onToggleReaction,
  onSpendSlot,
  onRestoreSlot,
  onResetSlots,
  onToggleDeathSaveSuccess,
  onToggleDeathSaveFail,
  onOpenWikiStatblock,
  onUpdateNote,
  onUpdateConditions,
}: ActiveCombatantCardProps) {
  const [monsterViewTab, setMonsterViewTab] = useState<"quick" | "full">("quick");

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
  const isDead = Boolean(entry.isDead || entry.hp <= 0);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 text-parchment-100 shadow-2xl">
      {/* =========================================================================
          HEADER SPOTLIGHT: Nome, Badge Ruolo, Tasto Reazione e Statblock
          ========================================================================= */}
      <div className="shrink-0 border-b border-brass-base/20 bg-[#18110b] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar / Ritratto */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-brass-base/40 bg-black">
              {entry.portraitUrl ? (
                <Image
                  src={entry.portraitUrl}
                  alt={entry.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-brass-base/40">
                  {entry.type === "pc" ? <User className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-950/80 border border-amber-600/40 px-1.5 py-0.2 font-mono text-[9px] font-bold text-amber-300">
                  TURNO ATTIVO
                </span>
                {entry.gs && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[9px] text-zinc-300">
                    GS {entry.gs}
                  </span>
                )}
                {entry.exp ? (
                  <span className="rounded bg-amber-900/40 px-1.5 py-0.2 font-mono text-[9px] text-amber-300">
                    {entry.exp} XP
                  </span>
                ) : null}
              </div>
              <h2 className="truncate font-cinzel text-lg font-bold text-amber-100 drop-shadow-sm">
                {entry.name}
              </h2>
              <p className="truncate text-xs text-parchment-400 font-sans">
                {entry.characterClass || (isMonster ? "Mostro / Nemico" : "Personaggio Giocatore")}
              </p>
            </div>
          </div>

          {/* Azioni rapide Header: Reazione & Statblock toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Reazione R */}
            <button
              type="button"
              onClick={() => onToggleReaction(entry.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shadow-sm",
                entry.usedReaction
                  ? "border-amber-500 bg-amber-600/30 text-amber-200 ring-1 ring-amber-500/50"
                  : "border-brass-base/30 bg-[#22160d] text-parchment-300 hover:border-amber-600 hover:text-amber-200"
              )}
              title={
                entry.usedReaction
                  ? "Reazione USATA in questo round (clicca per ripristinare)"
                  : "Reazione DISPONIBILE (clicca per segnarla come usata)"
              }
            >
              <Zap className={cn("h-3.5 w-3.5", entry.usedReaction && "text-amber-400 fill-amber-400")} />
              <span>R {entry.usedReaction ? "Usata" : "Pronta"}</span>
            </button>

            {/* Switch vista mostro: Sintetica vs Statblock Completo */}
            {isMonster ? (
              <div className="flex items-center rounded border border-brass-base/25 bg-[#0e0a07] p-0.5">
                <button
                  type="button"
                  onClick={() => setMonsterViewTab("quick")}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-cinzel transition-colors",
                    monsterViewTab === "quick"
                      ? "bg-amber-950/80 font-bold text-amber-200 border border-amber-600/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  Rapida
                </button>
                <button
                  type="button"
                  onClick={() => setMonsterViewTab("full")}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-cinzel transition-colors",
                    monsterViewTab === "full"
                      ? "bg-amber-950/80 font-bold text-amber-200 border border-amber-600/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <BookOpen className="h-3 w-3" />
                  Statblock
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CORPO PRINCIPALE SCROLLABILE
          ========================================================================= */}
      <div className="scrollbar-barber-y flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {/* SE MOSTRO IN VISTA STATBLOCK COMPLETO WIKI */}
        {isMonster && monsterViewTab === "full" ? (
          <div className="h-full min-h-[300px]">
            <MonsterStatPanel
              campaignId={campaignId}
              name={entry.name.replace(/\s+\d+$/, "")}
              entityId={entry.entityId}
            />
          </div>
        ) : (
          <>
            {/* 1. SEZIONE VITALS (Punti Ferita, CA, Percezione Passiva) */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 rounded-lg border border-brass-base/20 bg-[#160f0a] p-3">
              {/* Barra HP & Controlli */}
              <div className="flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between text-xs font-cinzel font-bold text-brass-light uppercase">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-rose-400" />
                    Punti Ferita (HP)
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {entry.hp} <span className="text-zinc-500 font-normal">/ {maxHp}</span>
                  </span>
                </div>

                <div className="tactical-hp-track h-2.5">
                  <div
                    className={cn(
                      "tactical-hp-bar-fill",
                      hpPct <= 25 ? "tactical-hp-bar-low" : hpPct <= 50 ? "tactical-hp-bar-mid" : ""
                    )}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => onUpdateHp(entry.id, -5)}
                    className="h-6 px-2 rounded bg-[#20120b] border border-red-800/40 text-red-300 hover:bg-red-900/40 text-[10px] font-mono"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateHp(entry.id, -1)}
                    className="h-6 px-2 rounded bg-[#20120b] border border-red-800/40 text-red-300 hover:bg-red-900/40 text-[10px] font-mono"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateHp(entry.id, 1)}
                    className="h-6 px-2 rounded bg-[#10200b] border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/40 text-[10px] font-mono ml-auto"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateHp(entry.id, 5)}
                    className="h-6 px-2 rounded bg-[#10200b] border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/40 text-[10px] font-mono"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Vitals Box: CA & Percezione Passiva */}
              <div className="flex sm:flex-col items-center justify-around gap-2 border-t sm:border-t-0 sm:border-l border-brass-base/20 pt-2 sm:pt-0 sm:pl-3">
                {/* Scudo CA */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-cinzel font-bold text-brass-light/80 uppercase">
                    AC (CA)
                  </span>
                  <div className="tactical-ac-shield mt-0.5">
                    <span className="font-cinzel text-sm font-black text-white">{entry.armorClass}</span>
                  </div>
                </div>

                {/* Percezione Passiva (solo PG o mostri con senses) */}
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-cinzel font-bold text-zinc-400 uppercase flex items-center gap-0.5">
                    <Eye className="h-2.5 w-2.5" /> PP
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-200 mt-0.5">
                    {10 + (entry.savingThrows?.sag ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. TIRI SALVEZZA (FOR, DES, COS, INT, SAG, CAR) */}
            <div className="rounded-lg border border-brass-base/20 bg-[#160f0a] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
                  Tiri Salvezza (Saving Throws)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Valori D&amp;D 5e</span>
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
                        "flex flex-col items-center justify-center rounded-md border p-1.5 transition-colors",
                        isHigh
                          ? "border-amber-600/40 bg-amber-950/30 text-amber-200"
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

            {/* 3. SE PG A 0 PF: DEATH SAVES (Tiri Salvezza contro la Morte) */}
            {!isMonster && (entry.hp <= 0 || (entry.deathSaves && (entry.deathSaves.success > 0 || entry.deathSaves.fail > 0))) ? (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase text-red-300">
                    <Skull className="h-4 w-4 text-red-400" />
                    <span>Tiri Salvezza contro la Morte</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400/80">Morente a 0 PF</span>
                </div>

                <div className="flex items-center justify-around gap-4 bg-black/40 rounded-lg p-2 border border-red-900/30">
                  {/* Successi */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">Successi:</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={`succ-${n}`}
                        type="button"
                        onClick={() => onToggleDeathSaveSuccess?.(entry.id)}
                        className={cn(
                          "h-5 w-5 rounded-full border transition-all flex items-center justify-center text-[10px] font-bold",
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
                    <span className="text-xs font-bold text-red-400">Fallimenti:</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={`fail-${n}`}
                        type="button"
                        onClick={() => onToggleDeathSaveFail?.(entry.id)}
                        className={cn(
                          "h-5 w-5 rounded-full border transition-all flex items-center justify-center text-[10px] font-bold",
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

            {/* 4. SE PG: SLOT INCANTESIMI (se caster) */}
            {!isMonster && entry.spellSlots && entry.spellSlots.max.length > 0 ? (
              <div className="rounded-lg border border-violet-900/30 bg-violet-950/10 p-3">
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

            {/* 5. ARMI ED ATTACCHI (per PG) o REAZIONI DISPONIBILI (per Mostri) */}
            {!isMonster && pcWeapons.length > 0 ? (
              <div className="rounded-lg border border-brass-base/20 bg-[#160f0a] p-3">
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
                      className="flex items-center justify-between rounded border border-brass-base/15 bg-[#1a120b] p-2 text-xs"
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

            {/* SE MOSTRO: REAZIONI DISPONIBILI DA STATBLOCK */}
            {isMonster ? (
              <div className="rounded-lg border border-brass-base/20 bg-[#160f0a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    Reazioni Disponibili
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">Da Statblock / Regolamento</span>
                </div>

                <div className="space-y-1.5">
                  {(entry.availableReactions && entry.availableReactions.length > 0
                    ? entry.availableReactions
                    : [{ name: "Attacco di Opportunità", description: "Reazione in mischia quando un bersaglio esce dalla portata." }]
                  ).map((r, idx) => (
                    <div
                      key={`${r.name}-${idx}`}
                      className="rounded border border-brass-base/15 bg-[#1a120b] p-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-200">{r.name}</span>
                        <button
                          type="button"
                          onClick={() => onToggleReaction(entry.id)}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-bold font-mono transition-colors",
                            entry.usedReaction
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900"
                          )}
                        >
                          {entry.usedReaction ? "Reazione Spesa" : "Usa Questa Reazione"}
                        </button>
                      </div>
                      {r.description ? (
                        <p className="mt-1 text-[11px] text-parchment-400 font-sans leading-relaxed">
                          {r.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 6. CONDIZIONI & NOTE RAPIDE */}
            <div className="rounded-lg border border-brass-base/20 bg-[#160f0a] p-3 space-y-3">
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
          </>
        )}
      </div>
    </div>
  );
}

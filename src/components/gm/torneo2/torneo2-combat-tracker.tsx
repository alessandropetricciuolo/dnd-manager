"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Heart,
  Plus,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SpellSlotsCell } from "@/components/gm/spell-slots-cell";
import { cn } from "@/lib/utils";
import {
  resetCombatSpellSlots,
  restoreCombatSpellSlot,
  spendCombatSpellSlot,
} from "@/lib/combat-spell-slots";
import {
  TORNEO2_CONDITIONS,
  torneo2DamageBySide,
  type Torneo2Combatant,
  type Torneo2CombatState,
  type Torneo2Side,
} from "@/lib/torneo2/combat-state";

type Props = {
  state: Torneo2CombatState;
  onChange: (next: Torneo2CombatState) => void;
  readOnly?: boolean;
  teamAName?: string | null;
  teamBName?: string | null;
  className?: string;
};

function clampHp(hp: number, maxHp: number): number {
  const ceil = maxHp > 0 ? maxHp : Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.min(ceil, Math.trunc(hp)));
}

export function Torneo2CombatTracker({
  state,
  onChange,
  readOnly = false,
  teamAName,
  teamBName,
  className,
}: Props) {
  const [damageInputs, setDamageInputs] = useState<Record<string, string>>({});

  const updateCombatant = useCallback(
    (id: string, patch: Partial<Torneo2Combatant>) => {
      onChange({
        ...state,
        combatants: state.combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      });
    },
    [onChange, state]
  );

  const removeCombatant = useCallback(
    (id: string) => {
      const idx = state.combatants.findIndex((c) => c.id === id);
      const nextCombatants = state.combatants.filter((c) => c.id !== id);
      let nextTurn = state.currentTurnIndex;
      if (idx <= state.currentTurnIndex) nextTurn = Math.max(0, nextTurn - 1);
      onChange({
        ...state,
        combatants: nextCombatants,
        currentTurnIndex: nextCombatants.length ? Math.min(nextTurn, nextCombatants.length - 1) : 0,
      });
    },
    [onChange, state]
  );

  const addCustom = useCallback(() => {
    const id = `x-${crypto.randomUUID().slice(0, 8)}`;
    const combatant: Torneo2Combatant = {
      id,
      characterId: null,
      name: "Nuovo PNG",
      side: "ffa",
      teamId: null,
      teamName: null,
      teamColor: "#94a3b8",
      portraitUrl: null,
      characterClass: null,
      armorClass: 12,
      hp: 10,
      maxHp: 10,
      initiative: 0,
      damageDealt: 0,
      damageTaken: 0,
      conditions: [],
      deathSaves: { success: 0, fail: 0, stable: false },
      isDead: false,
      noteText: "",
      usedReaction: false,
      usedBonus: false,
    };
    onChange({ ...state, combatants: [...state.combatants, combatant] });
  }, [onChange, state]);

  const sortByInitiative = useCallback(() => {
    const sorted = [...state.combatants].sort((a, b) => b.initiative - a.initiative);
    onChange({ ...state, combatants: sorted, currentTurnIndex: 0 });
  }, [onChange, state]);

  const advanceTurn = useCallback(
    (dir: 1 | -1) => {
      if (state.combatants.length === 0) return;
      let idx = state.currentTurnIndex + dir;
      let round = state.roundNumber;
      if (idx >= state.combatants.length) {
        idx = 0;
        round += 1;
      } else if (idx < 0) {
        idx = state.combatants.length - 1;
        round = Math.max(1, round - 1);
      }
      onChange({ ...state, currentTurnIndex: idx, roundNumber: round });
    },
    [onChange, state]
  );

  const scoreboard = useMemo(() => torneo2DamageBySide(state), [state]);
  const showScoreboard = state.combatants.some((c) => c.side === "a" || c.side === "b");

  const applyDamage = useCallback(
    (c: Torneo2Combatant, raw: string) => {
      const amount = Math.trunc(Number(raw));
      if (!Number.isFinite(amount) || amount === 0) return;
      // Positivo = danno (riduce HP, aumenta danni subiti); negativo = cura.
      const nextHp = clampHp(c.hp - amount, c.maxHp);
      const nextTaken = amount > 0 ? c.damageTaken + amount : c.damageTaken;
      updateCombatant(c.id, { hp: nextHp, damageTaken: Math.max(0, nextTaken) });
      setDamageInputs((prev) => ({ ...prev, [c.id]: "" }));
    },
    [updateCombatant]
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      {/* Barra controlli turno */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-1">
          <span className="text-[11px] font-semibold text-amber-300">Round {state.roundNumber}</span>
        </div>
        {!readOnly ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={state.combatants.length === 0}
              onClick={() => advanceTurn(-1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prec.
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 bg-amber-700 px-2 text-[11px] hover:bg-amber-600"
              disabled={state.combatants.length === 0}
              onClick={() => advanceTurn(1)}
            >
              Turno succ. <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={state.combatants.length === 0}
              onClick={sortByInitiative}
            >
              <ArrowDownUp className="h-3.5 w-3.5" /> Ordina
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={addCustom}
            >
              <UserPlus className="h-3.5 w-3.5" /> PNG
            </Button>
          </>
        ) : null}
        {showScoreboard ? (
          <div className="ml-auto flex items-center gap-2 text-[11px]">
            <span className="rounded bg-zinc-800/80 px-2 py-1 text-zinc-200">
              {teamAName ?? "Squadra A"}: <b className="text-amber-300">{scoreboard.a}</b>
            </span>
            <span className="rounded bg-zinc-800/80 px-2 py-1 text-zinc-200">
              {teamBName ?? "Squadra B"}: <b className="text-amber-300">{scoreboard.b}</b>
            </span>
          </div>
        ) : null}
      </div>

      {/* Lista combattenti */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-zinc-800/80">
        {state.combatants.length === 0 ? (
          <div className="flex h-full min-h-[120px] items-center justify-center p-6 text-center text-xs text-zinc-500">
            Nessun combattente. Avvia un incontro per caricare le squadre.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/70">
            {state.combatants.map((c, idx) => {
              const isTurn = idx === state.currentTurnIndex;
              const damageInput = damageInputs[c.id] ?? "";
              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex flex-col gap-2 px-2 py-2 md:flex-row md:items-center",
                    isTurn ? "bg-amber-950/30" : "bg-zinc-950/40",
                    c.isDead && "opacity-60"
                  )}
                >
                  {/* Iniziativa + nome */}
                  <div className="flex min-w-0 items-center gap-2 md:w-56 md:shrink-0">
                    {!readOnly ? (
                      <Input
                        type="number"
                        value={c.initiative}
                        onChange={(e) =>
                          updateCombatant(c.id, { initiative: Math.trunc(Number(e.target.value) || 0) })
                        }
                        className="h-7 w-12 shrink-0 px-1 text-center text-xs"
                        title="Iniziativa"
                      />
                    ) : (
                      <span className="w-8 shrink-0 text-center text-xs font-bold text-zinc-300">
                        {c.initiative}
                      </span>
                    )}
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-black/40"
                      style={{ backgroundColor: c.teamColor ?? "#94a3b8" }}
                      title={c.teamName ?? undefined}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        {isTurn ? <Swords className="h-3 w-3 shrink-0 text-amber-400" /> : null}
                        <span className="truncate text-xs font-semibold text-zinc-100">{c.name}</span>
                      </div>
                      <span className="block truncate text-[10px] text-zinc-500">
                        {c.characterClass ?? "—"} · CA {c.armorClass}
                      </span>
                    </div>
                  </div>

                  {/* HP */}
                  <div className="flex items-center gap-1">
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        c.hp <= 0 ? "text-zinc-600" : c.hp <= c.maxHp * 0.3 ? "text-red-400" : "text-emerald-400"
                      )}
                    />
                    {!readOnly ? (
                      <>
                        <Input
                          type="number"
                          value={c.hp}
                          onChange={(e) =>
                            updateCombatant(c.id, { hp: clampHp(Number(e.target.value) || 0, c.maxHp) })
                          }
                          className="h-7 w-14 px-1 text-center text-xs"
                        />
                        <span className="text-[10px] text-zinc-500">/{c.maxHp}</span>
                        <Input
                          type="number"
                          value={damageInput}
                          placeholder="dmg"
                          onChange={(e) => setDamageInputs((p) => ({ ...p, [c.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") applyDamage(c, damageInput);
                          }}
                          className="h-7 w-14 px-1 text-center text-xs"
                          title="Danno (positivo) o cura (negativo), Invio per applicare"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-1.5 text-[10px]"
                          onClick={() => applyDamage(c, damageInput)}
                        >
                          OK
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-zinc-200">
                        {c.hp}/{c.maxHp}
                      </span>
                    )}
                  </div>

                  {/* Danni inflitti */}
                  {!readOnly ? (
                    <div className="flex items-center gap-1" title="Danni inflitti">
                      <Swords className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 px-0 text-xs"
                        onClick={() =>
                          updateCombatant(c.id, { damageDealt: Math.max(0, c.damageDealt - 1) })
                        }
                      >
                        −
                      </Button>
                      <span className="min-w-[2rem] text-center text-xs font-semibold tabular-nums text-orange-300">
                        {c.damageDealt}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 px-0 text-xs"
                        onClick={() => updateCombatant(c.id, { damageDealt: c.damageDealt + 1 })}
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-orange-300" title="Danni inflitti">
                      <Swords className="mr-1 inline h-3 w-3" />
                      {c.damageDealt}
                    </span>
                  )}

                  {/* Condizioni */}
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                    {c.conditions.map((cond) => (
                      <Badge
                        key={cond}
                        variant="lore"
                        className={cn("px-1.5 py-0 text-[10px]", !readOnly && "cursor-pointer")}
                        onClick={
                          readOnly
                            ? undefined
                            : () =>
                                updateCombatant(c.id, {
                                  conditions: c.conditions.filter((x) => x !== cond),
                                })
                        }
                        title={readOnly ? cond : "Rimuovi condizione"}
                      >
                        {cond}
                      </Badge>
                    ))}
                    {!readOnly ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 gap-0.5 px-1.5 text-[10px]"
                          >
                            <Plus className="h-3 w-3" /> Stato
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 border-violet-900/40 bg-zinc-950 p-2">
                          <div className="grid grid-cols-2 gap-1">
                            {TORNEO2_CONDITIONS.map((cond) => {
                              const active = c.conditions.includes(cond);
                              return (
                                <button
                                  key={cond}
                                  type="button"
                                  className={cn(
                                    "rounded px-1.5 py-1 text-left text-[11px] transition-colors",
                                    active
                                      ? "bg-violet-600/30 text-violet-100"
                                      : "text-zinc-400 hover:bg-zinc-800"
                                  )}
                                  onClick={() =>
                                    updateCombatant(c.id, {
                                      conditions: active
                                        ? c.conditions.filter((x) => x !== cond)
                                        : [...c.conditions, cond],
                                    })
                                  }
                                >
                                  {cond}
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>

                  {/* Slot incantesimo */}
                  {c.spellSlots && c.spellSlots.max.length > 0 ? (
                    <div className="shrink-0">
                      {readOnly ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-violet-300">
                          <Sparkles className="h-3 w-3" />
                          {c.spellSlots.remaining.reduce((s, e) => s + e.count, 0)}/
                          {c.spellSlots.max.reduce((s, e) => s + e.count, 0)}
                        </span>
                      ) : (
                        <SpellSlotsCell
                          slots={c.spellSlots}
                          compact
                          onSpend={(lvl) => {
                            const next = spendCombatSpellSlot(c.spellSlots!, lvl);
                            if (next) updateCombatant(c.id, { spellSlots: next });
                          }}
                          onRestore={(lvl) => {
                            const next = restoreCombatSpellSlot(c.spellSlots!, lvl);
                            if (next) updateCombatant(c.id, { spellSlots: next });
                          }}
                          onReset={() =>
                            updateCombatant(c.id, { spellSlots: resetCombatSpellSlots(c.spellSlots!) })
                          }
                        />
                      )}
                    </div>
                  ) : null}

                  {/* Morte + azioni + note */}
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Tiri salvezza morte (solo se a 0 HP o già attivi) */}
                    {(c.hp <= 0 || c.deathSaves.success > 0 || c.deathSaves.fail > 0) && !c.isDead ? (
                      <div className="flex items-center gap-0.5" title="Tiri salvezza morte">
                        <span className="text-[9px] text-emerald-500">S</span>
                        {[1, 2, 3].map((n) => (
                          <button
                            key={`s${n}`}
                            type="button"
                            disabled={readOnly}
                            className={cn(
                              "h-3 w-3 rounded-full border",
                              c.deathSaves.success >= n
                                ? "border-emerald-400 bg-emerald-500"
                                : "border-zinc-600"
                            )}
                            onClick={() =>
                              updateCombatant(c.id, {
                                deathSaves: {
                                  ...c.deathSaves,
                                  success: c.deathSaves.success === n ? n - 1 : n,
                                },
                              })
                            }
                          />
                        ))}
                        <span className="ml-1 text-[9px] text-red-500">F</span>
                        {[1, 2, 3].map((n) => (
                          <button
                            key={`f${n}`}
                            type="button"
                            disabled={readOnly}
                            className={cn(
                              "h-3 w-3 rounded-full border",
                              c.deathSaves.fail >= n ? "border-red-400 bg-red-500" : "border-zinc-600"
                            )}
                            onClick={() =>
                              updateCombatant(c.id, {
                                deathSaves: {
                                  ...c.deathSaves,
                                  fail: c.deathSaves.fail === n ? n - 1 : n,
                                },
                              })
                            }
                          />
                        ))}
                      </div>
                    ) : null}

                    {!readOnly ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 w-7 px-0 text-[10px]",
                            c.usedReaction && "border-amber-500 bg-amber-600/30 text-amber-200"
                          )}
                          title="Reazione usata"
                          onClick={() => updateCombatant(c.id, { usedReaction: !c.usedReaction })}
                        >
                          R
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 w-7 px-0 text-[10px]",
                            c.usedBonus && "border-sky-500 bg-sky-600/30 text-sky-200"
                          )}
                          title="Azione bonus usata"
                          onClick={() => updateCombatant(c.id, { usedBonus: !c.usedBonus })}
                        >
                          B
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 w-7 px-0",
                            c.isDead && "border-red-600 bg-red-900/40 text-red-300"
                          )}
                          title={c.isDead ? "Segna come vivo" : "Segna come morto"}
                          onClick={() => updateCombatant(c.id, { isDead: !c.isDead })}
                        >
                          <Skull className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 px-0 text-zinc-500 hover:text-red-400"
                          title="Rimuovi combattente"
                          onClick={() => removeCombatant(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : c.isDead ? (
                      <Skull className="h-3.5 w-3.5 text-red-400" />
                    ) : null}
                  </div>

                  {/* Nota */}
                  {!readOnly ? (
                    <Input
                      value={c.noteText}
                      placeholder="nota…"
                      onChange={(e) => updateCombatant(c.id, { noteText: e.target.value })}
                      className="h-7 w-full px-2 text-[11px] md:w-32"
                    />
                  ) : c.noteText ? (
                    <span className="truncate text-[10px] italic text-zinc-500 md:w-32">{c.noteText}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

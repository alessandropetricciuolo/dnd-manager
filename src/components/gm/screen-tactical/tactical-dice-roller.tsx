"use client";

import { useState } from "react";
import { Dices, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DiceRollRecord = {
  id: string;
  timestamp: string;
  formula: string;
  total: number;
  rolls: number[];
  modifier: number;
  type: "normal" | "crit" | "fumble";
};

const INITIAL_HISTORY: DiceRollRecord[] = [
  {
    id: "init-1",
    timestamp: "21:14",
    formula: "1d20 + 3",
    total: 21,
    rolls: [18],
    modifier: 3,
    type: "normal",
  },
  {
    id: "init-2",
    timestamp: "21:12",
    formula: "2d6 + 2",
    total: 12,
    rolls: [4, 6],
    modifier: 2,
    type: "normal",
  },
  {
    id: "init-3",
    timestamp: "21:08",
    formula: "1d20",
    total: 17,
    rolls: [17],
    modifier: 0,
    type: "normal",
  },
];

export function TacticalDiceRoller() {
  const [history, setHistory] = useState<DiceRollRecord[]>(INITIAL_HISTORY);
  const [lastRoll, setLastRoll] = useState<DiceRollRecord | null>(INITIAL_HISTORY[0]);
  const [modifier, setModifier] = useState<number>(0);

  function rollDie(sides: number, count = 1) {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;

    let type: "normal" | "crit" | "fumble" = "normal";
    if (sides === 20 && count === 1) {
      if (rolls[0] === 20) type = "crit";
      if (rolls[0] === 1) type = "fumble";
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const record: DiceRollRecord = {
      id: `roll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: timeStr,
      formula: `${count}d${sides}${modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : ""}`,
      total,
      rolls,
      modifier,
      type,
    };

    setLastRoll(record);
    setHistory((prev) => [record, ...prev.slice(0, 19)]);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 text-parchment-100 shadow-lg">
      {/* Testata Dice Roller */}
      <div className="shrink-0 flex items-center justify-between border-b border-brass-base/20 bg-[#19110b] px-3 py-2">
        <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
          <Dices className="h-3.5 w-3.5 text-brass-base" />
          <span>Dice Roller History</span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setHistory([])}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
            title="Svuota cronologia"
          >
            <RotateCcw className="h-2.5 w-2.5" /> reset
          </button>
        )}
      </div>

      {/* Pulsantiera Dadi Rapidi */}
      <div className="p-2.5 border-b border-brass-base/15 bg-[#150f0b]">
        <div className="grid grid-cols-6 gap-1">
          {[4, 6, 8, 10, 12, 20].map((sides) => (
            <Button
              key={sides}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => rollDie(sides)}
              className={cn(
                "h-7 p-0 font-cinzel text-xs font-extrabold transition-transform active:scale-95",
                sides === 20
                  ? "border-amber-500/60 bg-[#2b1b0d] text-amber-200 hover:bg-[#3d2713] hover:text-gold-relief"
                  : "border-brass-base/30 bg-[#1b140d] text-parchment-200 hover:bg-[#281c12] hover:text-brass-light"
              )}
            >
              d{sides}
            </Button>
          ))}
        </div>

        {/* Modificatore rapido */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-parchment-400 font-cinzel">
          <span>Modificatore:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setModifier((m) => m - 1)}
              className="h-5 w-5 rounded border border-brass-base/30 bg-[#22170e] text-xs font-bold hover:bg-brass-base/20"
            >
              -
            </button>
            <span className="font-mono text-xs font-bold text-amber-300 w-6 text-center">
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button
              type="button"
              onClick={() => setModifier((m) => m + 1)}
              className="h-5 w-5 rounded border border-brass-base/30 bg-[#22170e] text-xs font-bold hover:bg-brass-base/20"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setModifier(0)}
              className="ml-1 text-[9px] text-zinc-500 hover:text-zinc-300"
            >
              0
            </button>
          </div>
        </div>
      </div>

      {/* Registro Storico Tiri (Mockup style) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 font-mono">
        <div className="text-[10px] font-cinzel uppercase tracking-wider text-parchment-500 mb-1">
          Log Tiri Recenti
        </div>

        {history.length === 0 ? (
          <p className="py-4 text-center font-serif text-xs text-parchment-500 italic">
            Nessun dado lanciato in questa sessione.
          </p>
        ) : (
          history.map((h) => (
            <div
              key={h.id}
              className={cn(
                "flex items-center justify-between rounded border px-2 py-1 text-xs transition-colors",
                h.type === "crit"
                  ? "border-amber-500/60 bg-amber-950/40 text-amber-200"
                  : h.type === "fumble"
                  ? "border-rose-700/60 bg-rose-950/40 text-rose-300"
                  : "border-brass-base/20 bg-[#16100c] text-parchment-200"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">⯁</span>
                <div>
                  <span className="text-[10px] text-parchment-400">{h.formula} ➔ </span>
                  <span className="text-[10px] text-parchment-400">({h.rolls.join(", ")})</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-cinzel text-sm font-extrabold",
                  h.type === "crit" ? "text-amber-300" : h.type === "fumble" ? "text-rose-400" : "text-parchment-100"
                )}>
                  {h.total}
                </span>
                <span className="text-[9px] text-zinc-500 font-sans">{h.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

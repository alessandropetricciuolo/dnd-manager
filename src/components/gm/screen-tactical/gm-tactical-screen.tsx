"use client";

import { useEffect, useState } from "react";
import { BookOpen, FileText, Search, ShieldAlert, Sparkles, Swords, Users } from "lucide-react";
import { InitiativeTracker, type InitiativeEntry } from "@/components/gm/initiative-tracker";
import { MonsterStatPanel } from "@/components/gm/screen-grid/panels/monster-stat-panel";
import { TacticalDiceRoller } from "./tactical-dice-roller";
import { TacticalSoundboard } from "./tactical-soundboard";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GmTacticalScreenProps = {
  campaignId: string;
  currentUserId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  selectedSessionId?: string | null;
  className?: string;
};

export function GmTacticalScreen({
  campaignId,
  currentUserId,
  campaignType = null,
  selectedSessionId = null,
  className,
}: GmTacticalScreenProps) {
  const long = useGmScreenLongStateOptional();

  // Mostro correntemente visualizzato nello statblock della colonna centrale
  const [selectedMonster, setSelectedMonster] = useState<{
    entityId?: string;
    name: string;
  }>({ name: "Goblin Boss" });

  // Quick Notes locali con persistenza
  const notesStorageKey = `bnd-gm-tactical-notes-${campaignId}-${selectedSessionId ?? "global"}`;
  const [quickNotes, setQuickNotes] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(notesStorageKey);
      if (saved) setQuickNotes(saved);
    } catch {}
  }, [notesStorageKey]);

  function handleNotesChange(text: string) {
    setQuickNotes(text);
    try {
      localStorage.setItem(notesStorageKey, text);
    } catch {}
  }

  // Seleziona il primo mostro disponibile all'avvio se c'è un'iniziativa attiva
  useEffect(() => {
    if (long?.initiativeState?.entries?.length) {
      const firstMonster = long.initiativeState.entries.find((e) => e.type === "monster");
      if (firstMonster && selectedMonster.name === "Goblin Boss") {
        setSelectedMonster({
          entityId: firstMonster.entityId,
          name: firstMonster.name.replace(/\s+\d+$/, ""),
        });
      }
    }
  }, [long?.initiativeState?.entries]);

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full grid-cols-1 gap-2.5 p-2 sm:gap-3 sm:p-3 lg:grid-cols-12 overflow-hidden bg-[#0c0805] text-parchment-100",
        className
      )}
    >
      {/* =========================================================================
          COLONNA 1 (Sinistra, 5 Cols): COMBAT & INITIATIVE TRACKER
          ========================================================================= */}
      <div className="flex min-h-[380px] flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 shadow-2xl lg:col-span-5">
        <div className="flex-1 min-h-0">
          {long ? (
            <InitiativeTracker
              campaignId={long.campaignId}
              campaignType="long"
              availableCharacters={long.sessionCharacters}
              value={long.initiativeState}
              onChange={long.setInitiativeState}
              onOpenMonsterStat={(m) => setSelectedMonster(m)}
            />
          ) : (
            <InitiativeTracker
              campaignId={campaignId}
              campaignType={campaignType}
              onOpenMonsterStat={(m) => setSelectedMonster(m)}
            />
          )}
        </div>
      </div>

      {/* =========================================================================
          COLONNA 2 (Centro, 4 Cols): QUICK MONSTER STAT BLOCK
          ========================================================================= */}
      <div className="flex min-h-[380px] flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 shadow-2xl lg:col-span-4">
        {/* Testata Stat Block */}
        <div className="shrink-0 flex items-center justify-between border-b border-brass-base/20 bg-[#19110b] px-3 py-2">
          <div className="flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
            <BookOpen className="h-3.5 w-3.5 text-brass-base" />
            <span>Quick Monster Stat Block</span>
          </div>

          {/* Selettore rapido tra i mostri presenti in combattimento */}
          {long?.initiativeState?.entries && (
            <div className="flex items-center gap-1">
              {long.initiativeState.entries
                .filter((e) => e.type === "monster")
                .slice(0, 3)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setSelectedMonster({
                        entityId: m.entityId,
                        name: m.name.replace(/\s+\d+$/, ""),
                      })
                    }
                    className={cn(
                      "max-w-[80px] truncate rounded border px-1.5 py-0.5 text-[9px] font-cinzel transition-colors",
                      selectedMonster.name.toLowerCase() === m.name.toLowerCase()
                        ? "border-amber-500 bg-amber-950/60 text-amber-200"
                        : "border-brass-base/20 bg-[#1a120b] text-parchment-400 hover:text-parchment-200"
                    )}
                    title={m.name}
                  >
                    {m.name.split(" ")[0]}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Corpo Statblock con il renderer FiveeStatblockView */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
          <MonsterStatPanel
            key={`${selectedMonster.name}-${selectedMonster.entityId ?? ""}`}
            campaignId={campaignId}
            name={selectedMonster.name}
            entityId={selectedMonster.entityId}
          />
        </div>
      </div>

      {/* =========================================================================
          COLONNA 3 (Destra, 3 Cols): QUICK NOTES, DICE ROLLER, AMBIENT SOUNDBOARD
          ========================================================================= */}
      <div className="flex min-h-[380px] flex-col gap-2.5 overflow-y-auto lg:col-span-3">
        {/* Widget 1: Quick Notes */}
        <div className="shrink-0 flex flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 shadow-md">
          <div className="shrink-0 flex items-center justify-between border-b border-brass-base/20 bg-[#19110b] px-3 py-2">
            <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
              <FileText className="h-3.5 w-3.5 text-brass-base" />
              <span>Quick Notes</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">Auto-salvate</span>
          </div>
          <div className="p-2.5">
            <Textarea
              value={quickNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Appunti al volo del Master (segreti, indizi, nomi NPC improvvisati)..."
              rows={4}
              className="min-h-[90px] resize-none border-brass-base/20 bg-[#0b0805] font-serif text-xs leading-relaxed text-parchment-100 placeholder:text-zinc-600 focus:border-amber-600 focus:ring-0"
            />
          </div>
        </div>

        {/* Widget 2: Dice Roller History */}
        <div className="flex-1 min-h-[220px]">
          <TacticalDiceRoller />
        </div>

        {/* Widget 3: Ambient Soundboard */}
        <div className="shrink-0">
          <TacticalSoundboard />
        </div>
      </div>
    </div>
  );
}

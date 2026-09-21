"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Rows2,
  FileText,
  Search,
  ShieldAlert,
  Sparkles,
  Square,
  Swords,
  Users,
} from "lucide-react";
import { InitiativeTracker, type InitiativeEntry } from "@/components/gm/initiative-tracker";
import { MonsterStatPanel } from "@/components/gm/screen-grid/panels/monster-stat-panel";
import { TacticalRulesLookup } from "./tactical-rules-lookup";
import { TacticalSoundboard } from "./tactical-soundboard";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GmTacticalScreenProps = {
  campaignId: string;
  currentUserId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  selectedSessionId?: string | null;
  className?: string;
};

type MonsterSelection = {
  entityId?: string;
  name: string;
};

export function GmTacticalScreen({
  campaignId,
  currentUserId,
  campaignType = null,
  selectedSessionId = null,
  className,
}: GmTacticalScreenProps) {
  const long = useGmScreenLongStateOptional();

  // Due mostri visualizzabili contemporaneamente
  const [selectedMonster1, setSelectedMonster1] = useState<MonsterSelection>({
    name: "Goblin Boss",
  });
  const [selectedMonster2, setSelectedMonster2] = useState<MonsterSelection>({
    name: "Goblin",
  });

  // Slot attivo per la selezione rapida dall'initiative tracker (1 o 2)
  const [activeMonsterSlot, setActiveMonsterSlot] = useState<1 | 2>(1);

  // Modalità di visualizzazione: affiancata (2 mostri) o a singolo mostro espanso
  const [monsterLayout, setMonsterLayout] = useState<"dual" | "single1" | "single2">("dual");

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

  // Estrai i mostri unici attualmente presenti nel combattimento/iniziativa
  const combatMonsters = useMemo(() => {
    if (!long?.initiativeState?.entries) return [];
    const seen = new Set<string>();
    const list: { id: string; name: string; cleanName: string; entityId?: string }[] = [];
    for (const e of long.initiativeState.entries) {
      if (e.type === "monster") {
        const clean = e.name.replace(/\s+\d+$/, "");
        if (!seen.has(clean.toLowerCase())) {
          seen.add(clean.toLowerCase());
          list.push({ id: e.id, name: e.name, cleanName: clean, entityId: e.entityId });
        }
      }
    }
    return list;
  }, [long?.initiativeState?.entries]);

  // All'avvio dell'iniziativa, popola automaticamente i due mostri se presenti
  useEffect(() => {
    if (combatMonsters.length > 0) {
      const first = combatMonsters[0];
      const second = combatMonsters.length > 1 ? combatMonsters[1] : null;

      if (selectedMonster1.name === "Goblin Boss") {
        setSelectedMonster1({
          entityId: first.entityId,
          name: first.cleanName,
        });
      }

      if (second && selectedMonster2.name === "Goblin") {
        setSelectedMonster2({
          entityId: second.entityId,
          name: second.cleanName,
        });
      }
    }
  }, [combatMonsters]);

  // Click su mostro dall'Initiative Tracker: carica nello slot attivo (1 o 2)
  function handleMonsterSelectFromTracker(m: { entityId?: string; name: string }) {
    const clean = m.name.replace(/\s+\d+$/, "");
    if (activeMonsterSlot === 1) {
      setSelectedMonster1({ entityId: m.entityId, name: clean });
    } else {
      setSelectedMonster2({ entityId: m.entityId, name: clean });
    }
  }

  // Scambia i due mostri tra gli slot 1 e 2
  function handleSwapMonsters() {
    setSelectedMonster1(selectedMonster2);
    setSelectedMonster2(selectedMonster1);
  }

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full grid-cols-1 gap-2.5 p-2 sm:gap-3 sm:p-3 lg:grid-cols-[9fr_6fr_5fr] overflow-hidden bg-[#0c0805] text-parchment-100",
        className
      )}
    >
      {/* =========================================================================
          COLONNA 1 (Sinistra, 45%): COMBAT & INITIATIVE TRACKER
          ========================================================================= */}
      <div className="flex min-h-[380px] min-w-0 flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 shadow-2xl">
        <div className="flex-1 min-h-0">
          {long ? (
            <InitiativeTracker
              campaignId={long.campaignId}
              campaignType="long"
              availableCharacters={long.sessionCharacters}
              value={long.initiativeState}
              onChange={long.setInitiativeState}
              onOpenMonsterStat={handleMonsterSelectFromTracker}
            />
          ) : (
            <InitiativeTracker
              campaignId={campaignId}
              campaignType={campaignType}
              onOpenMonsterStat={handleMonsterSelectFromTracker}
            />
          )}
        </div>
      </div>

      {/* =========================================================================
          COLONNA 2 (Centro, 30%): DUAL MONSTER STAT BLOCKS (2 MOSTRI IN CONTEMPORANEA)
          ========================================================================= */}
      <div className="flex min-h-[380px] min-w-0 flex-col overflow-hidden">
        {/* Barra di controllo vista mostri */}
        <div className="shrink-0 mb-1.5 flex items-center justify-between rounded-md border border-brass-base/20 bg-[#150f0a] px-2.5 py-1 text-xs">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-brass-base" />
            <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
              Schede Mostri ({monsterLayout === "dual" ? "2 in contemporanea" : "singolo"})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Pulsante Scambia 1 e 2 */}
            <button
              type="button"
              onClick={handleSwapMonsters}
              className="flex items-center gap-1 rounded border border-brass-base/20 bg-[#1c130c] px-1.5 py-0.5 text-[10px] text-parchment-300 hover:text-amber-200 hover:border-brass-base/40 transition-colors"
              title="Scambia posizione Mostro 1 e Mostro 2"
            >
              <ArrowLeftRight className="h-2.5 w-2.5 text-brass-base" />
              <span>Scambia</span>
            </button>

            {/* Switcher layout: 2 mostri in righe vs singolo */}
            <div className="flex items-center rounded border border-brass-base/25 bg-[#0e0a07] p-0.5">
              <button
                type="button"
                onClick={() => setMonsterLayout("dual")}
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-serif transition-colors",
                  monsterLayout === "dual"
                    ? "bg-amber-950/80 font-bold text-amber-200 border border-amber-600/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Visualizza 2 mostri in 2 righe sovrapposte"
              >
                <Rows2 className="h-3 w-3" />
                <span className="hidden sm:inline">2 Righe</span>
              </button>
              <button
                type="button"
                onClick={() => setMonsterLayout("single1")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-serif transition-colors",
                  monsterLayout === "single1"
                    ? "bg-amber-950/80 font-bold text-amber-200 border border-amber-600/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Espandi solo Mostro 1"
              >
                Solo 1
              </button>
              <button
                type="button"
                onClick={() => setMonsterLayout("single2")}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-serif transition-colors",
                  monsterLayout === "single2"
                    ? "bg-amber-950/80 font-bold text-amber-200 border border-amber-600/40"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Espandi solo Mostro 2"
              >
                Solo 2
              </button>
            </div>
          </div>
        </div>

        {/* Disposizione dei 2 Mostri su 2 Righe (Top / Bottom) */}
        <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-hidden">
          {/* ==================== PANNELLO MOSTRO 1 (Riga Superiore) ==================== */}
          {(monsterLayout === "dual" || monsterLayout === "single1") && (
            <div
              className={cn(
                "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-[#120d09]/95 shadow-xl transition-all",
                monsterLayout === "dual" ? "flex-1" : "h-full flex-1",
                activeMonsterSlot === 1
                  ? "border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40"
                  : "border-brass-base/30"
              )}
            >
              {/* Header Mostro 1 */}
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-1 border-b border-brass-base/20 bg-[#19110b] px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => setActiveMonsterSlot(1)}
                  className="flex items-center gap-1.5 text-left group"
                  title="Clicca per impostare lo Slot 1 come destinatario delle selezioni dall'iniziativa"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold font-mono transition-colors",
                      activeMonsterSlot === 1
                        ? "bg-amber-500 text-zinc-950 shadow"
                        : "bg-[#25180f] text-brass-light group-hover:bg-amber-950"
                    )}
                  >
                    1
                  </span>
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light group-hover:text-amber-200">
                    Mostro 1
                  </span>
                  {activeMonsterSlot === 1 && (
                    <span className="rounded bg-amber-950/80 border border-amber-600/40 px-1 text-[9px] font-mono text-amber-300">
                      Attivo
                    </span>
                  )}
                </button>

                {/* Selettore rapido tra i mostri in combattimento per Slot 1 */}
                {combatMonsters.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto max-w-[170px] scrollbar-none py-0.5">
                    {combatMonsters.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMonster1({ entityId: m.entityId, name: m.cleanName });
                          setActiveMonsterSlot(1);
                        }}
                        className={cn(
                          "truncate rounded border px-1.5 py-0.5 text-[9px] font-cinzel transition-colors shrink-0",
                          selectedMonster1.name.toLowerCase() === m.cleanName.toLowerCase()
                            ? "border-amber-500 bg-amber-950/80 text-amber-200 font-bold"
                            : "border-brass-base/20 bg-[#1a120b] text-parchment-400 hover:text-parchment-200"
                        )}
                        title={`Mostra ${m.cleanName} in Mostro 1`}
                      >
                        {m.cleanName.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Corpo Statblock Mostro 1 */}
              <div className="scrollbar-barber-y flex-1 min-h-0 overflow-y-auto p-2">
                <MonsterStatPanel
                  key={`m1-${selectedMonster1.name}-${selectedMonster1.entityId ?? ""}`}
                  campaignId={campaignId}
                  name={selectedMonster1.name}
                  entityId={selectedMonster1.entityId}
                />
              </div>
            </div>
          )}

          {/* ==================== PANNELLO MOSTRO 2 (Riga Inferiore) ==================== */}
          {(monsterLayout === "dual" || monsterLayout === "single2") && (
            <div
              className={cn(
                "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-[#120d09]/95 shadow-xl transition-all",
                monsterLayout === "dual" ? "flex-1" : "h-full flex-1",
                activeMonsterSlot === 2
                  ? "border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40"
                  : "border-brass-base/30"
              )}
            >
              {/* Header Mostro 2 */}
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-1 border-b border-brass-base/20 bg-[#19110b] px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => setActiveMonsterSlot(2)}
                  className="flex items-center gap-1.5 text-left group"
                  title="Clicca per impostare lo Slot 2 come destinatario delle selezioni dall'iniziativa"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold font-mono transition-colors",
                      activeMonsterSlot === 2
                        ? "bg-amber-500 text-zinc-950 shadow"
                        : "bg-[#25180f] text-brass-light group-hover:bg-amber-950"
                    )}
                  >
                    2
                  </span>
                  <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light group-hover:text-amber-200">
                    Mostro 2
                  </span>
                  {activeMonsterSlot === 2 && (
                    <span className="rounded bg-amber-950/80 border border-amber-600/40 px-1 text-[9px] font-mono text-amber-300">
                      Attivo
                    </span>
                  )}
                </button>

                {/* Selettore rapido tra i mostri in combattimento per Slot 2 */}
                {combatMonsters.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto max-w-[170px] scrollbar-none py-0.5">
                    {combatMonsters.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMonster2({ entityId: m.entityId, name: m.cleanName });
                          setActiveMonsterSlot(2);
                        }}
                        className={cn(
                          "truncate rounded border px-1.5 py-0.5 text-[9px] font-cinzel transition-colors shrink-0",
                          selectedMonster2.name.toLowerCase() === m.cleanName.toLowerCase()
                            ? "border-amber-500 bg-amber-950/80 text-amber-200 font-bold"
                            : "border-brass-base/20 bg-[#1a120b] text-parchment-400 hover:text-parchment-200"
                        )}
                        title={`Mostra ${m.cleanName} in Mostro 2`}
                      >
                        {m.cleanName.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Corpo Statblock Mostro 2 */}
              <div className="scrollbar-barber-y flex-1 min-h-0 overflow-y-auto p-2">
                <MonsterStatPanel
                  key={`m2-${selectedMonster2.name}-${selectedMonster2.entityId ?? ""}`}
                  campaignId={campaignId}
                  name={selectedMonster2.name}
                  entityId={selectedMonster2.entityId}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          COLONNA 3 (Destra, 25%): QUICK NOTES, RICERCA REGOLE & MANUALE, AMBIENT SOUNDBOARD
          ========================================================================= */}
      <div className="flex min-h-[380px] min-w-0 flex-col gap-2.5 overflow-y-auto">
        {/* Widget 1: Quick Notes */}
        <div className="shrink-0 flex flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 shadow-md">
          <div className="shrink-0 flex items-center justify-between border-b border-brass-base/20 bg-[#19110b] px-3 py-2">
            <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
              <FileText className="h-3.5 w-3.5 text-brass-base" />
              <span>Quick Notes</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">Auto-salvate</span>
          </div>
          <div className="p-2">
            <Textarea
              value={quickNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Appunti al volo del Master (segreti, indizi, nomi NPC improvvisati)..."
              rows={3}
              className="min-h-[75px] resize-none border-brass-base/20 bg-[#0b0805] font-serif text-xs leading-relaxed text-parchment-100 placeholder:text-zinc-600 focus:border-amber-600 focus:ring-0"
            />
          </div>
        </div>

        {/* Widget 2: Ricerca Rapida Regole (Sostituisce Dice Roller History) */}
        <div className="flex-1 min-h-[260px]">
          <TacticalRulesLookup />
        </div>

        {/* Widget 3: Ambient Soundboard */}
        <div className="shrink-0">
          <TacticalSoundboard />
        </div>
      </div>
    </div>
  );
}

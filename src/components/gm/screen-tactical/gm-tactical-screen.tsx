"use client";

import { useCallback, useRef, useState } from "react";
import {
  InitiativeTracker,
  type InitiativeEntry,
  type InitiativeTrackerHandle,
} from "@/components/gm/initiative-tracker";
import { ActiveCombatantCard } from "./active-combatant-card";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";
import { cn } from "@/lib/utils";

type GmTacticalScreenProps = {
  audioForge?: GmAudioForgeControls;
  onOpenAudio?: () => void;
  campaignId: string;
  currentUserId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  selectedSessionId?: string | null;
  className?: string;
};

export function GmTacticalScreen({
  audioForge: _audioForge,
  onOpenAudio: _onOpenAudio,
  campaignId,
  currentUserId: _currentUserId,
  campaignType = null,
  selectedSessionId: _selectedSessionId,
  className,
}: GmTacticalScreenProps) {
  const long = useGmScreenLongStateOptional();
  const initiativeRef = useRef<InitiativeTrackerHandle>(null);
  const [activeCombatant, setActiveCombatant] = useState<InitiativeEntry | null>(null);

  // Accredito EXP al click di 'Chiudi Fight' nella sessione attiva (campagne Long)
  const handleBankExp = useCallback(
    async (exp: number) => {
      if (long?.xpState && long.setXpState) {
        long.setXpState({
          ...long.xpState,
          bankedMonsterXp: (long.xpState.bankedMonsterXp ?? 0) + exp,
        });
      }
    },
    [long]
  );

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full grid-cols-1 gap-2.5 p-2 sm:gap-3 sm:p-3 lg:grid-cols-[11fr_9fr] overflow-hidden bg-[#0c0805] text-parchment-100",
        className
      )}
    >
      {/* =========================================================================
          COLONNA 1 (Sinistra, ~55%): INITIATIVE TRACKER / COMBAT TABLE AVANZATA
          ========================================================================= */}
      <div className="flex min-h-[380px] min-w-0 flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 shadow-2xl">
        <div className="flex-1 min-h-0">
          {long ? (
            <InitiativeTracker
              ref={initiativeRef}
              campaignId={long.campaignId}
              campaignType="long"
              availableCharacters={long.sessionCharacters}
              value={long.initiativeState}
              onChange={long.setInitiativeState}
              defaultDisplay="table"
              onActiveCombatantChange={setActiveCombatant}
              onBankExp={handleBankExp}
            />
          ) : (
            <InitiativeTracker
              ref={initiativeRef}
              campaignId={campaignId}
              campaignType={campaignType}
              defaultDisplay="table"
              onActiveCombatantChange={setActiveCombatant}
              onBankExp={handleBankExp}
            />
          )}
        </div>
      </div>

      {/* =========================================================================
          COLONNA 2 (Destra, ~45%): ACTIVE COMBATANT SPOTLIGHT CARD
          ========================================================================= */}
      <div className="flex min-h-[380px] min-w-0 flex-col overflow-hidden rounded-lg">
        <ActiveCombatantCard
          entry={activeCombatant}
          campaignId={campaignId}
          onUpdateHp={(id, delta) => initiativeRef.current?.adjustHp(id, delta)}
          onSetHp={(id, hp) => initiativeRef.current?.updateHp(id, hp)}
          onToggleReaction={(id) => initiativeRef.current?.toggleReaction(id)}
          onSpendSlot={(id, lvl) => initiativeRef.current?.spendSlot(id, lvl)}
          onRestoreSlot={(id, lvl) => initiativeRef.current?.restoreSlot(id, lvl)}
          onResetSlots={(id) => initiativeRef.current?.resetSlots(id)}
          onToggleDeathSaveSuccess={(id) => initiativeRef.current?.toggleDeathSaveSuccess(id)}
          onToggleDeathSaveFail={(id) => initiativeRef.current?.toggleDeathSaveFail(id)}
          onUpdateNote={(id, note) => initiativeRef.current?.updateNote(id, note)}
          onUpdateConditions={(id, conds) => initiativeRef.current?.updateConditions(id, conds)}
          onEnrichMonster={(id, fullStatblock) => initiativeRef.current?.enrichMonster?.(id, fullStatblock)}
          onOpenWikiStatblock={(entityId) => {
            if (entityId && typeof window !== "undefined") {
              window.open(`/campaigns/${campaignId}/wiki/${entityId}`, "_blank");
            }
          }}
        />
      </div>
    </div>
  );
}

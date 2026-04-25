"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Swords } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listMissionEncountersAction, type MissionEncounterConfig } from "@/lib/actions/mission-actions";
import { useGmScreenLongState } from "@/components/gm/gm-screen-long-state";

function generateInitiativeId() {
  return `mission-init-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function GmMissionEncounterLoader({ campaignId }: { campaignId: string }) {
  const {
    selectedSessionId,
    sessionCharacters,
    missionSelection,
    setMissionSelection,
    setInitiativeState,
  } = useGmScreenLongState();

  const [loading, setLoading] = useState(false);
  const [encounters, setEncounters] = useState<MissionEncounterConfig[]>([]);

  const loadEncounters = useCallback(async () => {
    setLoading(true);
    const res = await listMissionEncountersAction(campaignId);
    setLoading(false);
    if (!res.success) {
      toast.error(res.message ?? "Errore nel caricamento incontri missione.");
      return;
    }
    setEncounters(res.data);
  }, [campaignId]);

  useEffect(() => {
    void loadEncounters();
  }, [loadEncounters]);

  const missionOptions = useMemo(() => {
    const seen = new Set<string>();
    return encounters
      .filter((encounter) => {
        if (seen.has(encounter.mission_id)) return false;
        seen.add(encounter.mission_id);
        return true;
      })
      .map((encounter) => ({
        missionId: encounter.mission_id,
        title: encounter.mission_title,
      }));
  }, [encounters]);

  const missionEncounters = useMemo(
    () => encounters.filter((encounter) => encounter.mission_id === missionSelection.missionId),
    [encounters, missionSelection.missionId]
  );

  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === missionSelection.encounterId) ?? null,
    [encounters, missionSelection.encounterId]
  );

  useEffect(() => {
    if (!missionSelection.missionId && !missionSelection.encounterId) return;
    const missionStillExists = missionOptions.some((option) => option.missionId === missionSelection.missionId);
    const encounterStillExists = encounters.some((encounter) => encounter.id === missionSelection.encounterId);
    if (missionStillExists && (!missionSelection.encounterId || encounterStillExists)) return;
    setMissionSelection({ missionId: "", encounterId: "" });
  }, [encounters, missionOptions, missionSelection.encounterId, missionSelection.missionId, setMissionSelection]);

  const loadEncounterIntoInitiative = useCallback(
    (encounterId: string) => {
      const encounter = encounters.find((row) => row.id === encounterId);
      if (!encounter) return;

      const pcEntries = sessionCharacters.map((character) => {
        const hp = Math.max(0, character.hit_points ?? 0);
        return {
          id: generateInitiativeId(),
          name: character.name,
          type: "pc" as const,
          characterClass: character.character_class ?? null,
          armorClass: Math.max(0, character.armor_class ?? 0),
          hp,
          maxHp: hp,
          initiative: 0,
          playerId: character.id,
        };
      });

      const monsterEntries = encounter.monsters.flatMap((monster) =>
        Array.from({ length: Math.max(1, monster.quantity) }, (_, index) => ({
          id: generateInitiativeId(),
          name: monster.quantity > 1 ? `${monster.monster_name} ${index + 1}` : monster.monster_name,
          type: "monster" as const,
          armorClass: 0,
          hp: Math.max(0, monster.monster_hp),
          maxHp: Math.max(0, monster.monster_hp),
          initiative: 0,
          isDead: false,
          entityId: monster.wiki_entity_id,
          ...(monster.monster_xp > 0 ? { exp: monster.monster_xp } : {}),
          ...(monster.is_core ? { isCore: true } : {}),
        }))
      );

      setMissionSelection({
        missionId: encounter.mission_id,
        encounterId: encounter.id,
      });
      setInitiativeState({
        entries: [...pcEntries, ...monsterEntries],
        currentTurnIndex: 0,
      });

      toast.success(
        `Incontro caricato: ${pcEntries.length} PG iscritti e ${monsterEntries.length} creature preparate.`
      );
    },
    [encounters, sessionCharacters, setInitiativeState, setMissionSelection]
  );

  const handleMissionChange = (missionId: string) => {
    if (missionId === "none") {
      setMissionSelection({ missionId: "", encounterId: "" });
      return;
    }
    const firstEncounter = encounters.find((encounter) => encounter.mission_id === missionId);
    if (!firstEncounter) {
      setMissionSelection({ missionId, encounterId: "" });
      return;
    }
    if (!selectedSessionId) {
      setMissionSelection({ missionId, encounterId: firstEncounter.id });
      return;
    }
    loadEncounterIntoInitiative(firstEncounter.id);
  };

  const handleEncounterChange = (encounterId: string) => {
    if (encounterId === "none") {
      setMissionSelection({
        missionId: missionSelection.missionId,
        encounterId: "",
      });
      return;
    }
    if (!selectedSessionId) {
      const encounter = encounters.find((row) => row.id === encounterId);
      setMissionSelection({
        missionId: encounter?.mission_id ?? missionSelection.missionId,
        encounterId,
      });
      return;
    }
    loadEncounterIntoInitiative(encounterId);
  };

  return (
    <section className="rounded-xl border border-sky-600/20 bg-zinc-900/75 p-4 text-zinc-100">
      <div className="mb-3 flex items-center gap-3">
        <Swords className="h-5 w-5 text-sky-300" />
        <div>
          <h2 className="text-sm font-semibold text-sky-100">Incontri missione</h2>
          <p className="text-xs text-zinc-400">
            Seleziona una missione con incontri preparati per caricare automaticamente PG iscritti e mostri nell&apos;initiative.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Caricamento incontri...
        </div>
      ) : missionOptions.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nessuna missione con incontri GM preparati. Configurali prima dalla tab missioni.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Missione</p>
            <Select
              value={missionSelection.missionId || "none"}
              onValueChange={handleMissionChange}
            >
              <SelectTrigger className="border-sky-600/30 bg-zinc-950 text-zinc-100">
                <SelectValue placeholder="Seleziona missione" />
              </SelectTrigger>
              <SelectContent className="border-sky-600/30 bg-zinc-950 text-zinc-100">
                <SelectItem value="none">Nessuna</SelectItem>
                {missionOptions.map((option) => (
                  <SelectItem key={option.missionId} value={option.missionId}>
                    {option.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Incontro</p>
            <Select
              value={missionSelection.encounterId || "none"}
              onValueChange={handleEncounterChange}
              disabled={!missionSelection.missionId}
            >
              <SelectTrigger className="border-sky-600/30 bg-zinc-950 text-zinc-100">
                <SelectValue placeholder="Seleziona incontro" />
              </SelectTrigger>
              <SelectContent className="border-sky-600/30 bg-zinc-950 text-zinc-100">
                <SelectItem value="none">Nessuno</SelectItem>
                {missionEncounters.map((encounter) => (
                  <SelectItem key={encounter.id} value={encounter.id}>
                    {encounter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="self-end">
            <Button
              type="button"
              variant="outline"
              className="border-sky-500/40 text-sky-100 hover:bg-sky-500/15"
              onClick={() => selectedEncounter && loadEncounterIntoInitiative(selectedEncounter.id)}
              disabled={!selectedSessionId || !selectedEncounter}
            >
              Ricarica incontro
            </Button>
          </div>

          <div className="md:col-span-3">
            {!selectedSessionId ? (
              <p className="text-xs text-amber-200/80">
                Seleziona prima la sessione corrente: il caricamento userà tutti i PG iscritti a quella sessione.
              </p>
            ) : selectedEncounter ? (
              <p className="text-xs text-zinc-400">
                Incontro selezionato: <span className="font-medium text-zinc-200">{selectedEncounter.name}</span> ·{" "}
                {sessionCharacters.length} PG pronti · {selectedEncounter.monsters.reduce((sum, monster) => sum + monster.quantity, 0)} creature preparate
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                Seleziona un incontro per caricarlo nel tracker.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

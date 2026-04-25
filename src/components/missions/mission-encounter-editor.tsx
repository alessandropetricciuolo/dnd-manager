"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Swords, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createMissionEncounterAction,
  deleteMissionEncounterAction,
  listMissionEncountersAction,
  replaceMissionEncounterMonstersAction,
  updateMissionEncounterAction,
  type MissionEncounterConfig,
} from "@/lib/actions/mission-actions";
import { getMonstersForInitiative } from "@/app/campaigns/wiki-actions";

type MissionEncounterEditorProps = {
  campaignId: string;
  mission: {
    id: string;
    title: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MonsterOption = {
  id: string;
  name: string;
  hp: number;
  is_core?: boolean;
  global_status?: "alive" | "dead";
};

type EncounterMonsterDraft = {
  key: string;
  wikiEntityId: string;
  quantity: string;
};

type EncounterDraft = {
  name: string;
  notes: string;
  monsters: EncounterMonsterDraft[];
};

const EMPTY_DRAFT: EncounterDraft = {
  name: "",
  notes: "",
  monsters: [],
};

function makeDraftKey() {
  return `enc-mon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDraftFromEncounter(encounter: MissionEncounterConfig | null): EncounterDraft {
  if (!encounter) return EMPTY_DRAFT;
  return {
    name: encounter.name,
    notes: encounter.notes ?? "",
    monsters: encounter.monsters.map((monster) => ({
      key: makeDraftKey(),
      wikiEntityId: monster.wiki_entity_id,
      quantity: String(monster.quantity),
    })),
  };
}

export function MissionEncounterEditor({
  campaignId,
  mission,
  open,
  onOpenChange,
}: MissionEncounterEditorProps) {
  const [loading, setLoading] = useState(false);
  const [encounters, setEncounters] = useState<MissionEncounterConfig[]>([]);
  const [monsterOptions, setMonsterOptions] = useState<MonsterOption[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EncounterDraft>(EMPTY_DRAFT);
  const [isPending, startTransition] = useTransition();
  const selectedEncounterIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedEncounterIdRef.current = selectedEncounterId;
  }, [selectedEncounterId]);

  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === selectedEncounterId) ?? null,
    [encounters, selectedEncounterId]
  );

  const loadData = useCallback(
    async (preferredEncounterId?: string | null) => {
      setLoading(true);
      const [encountersRes, monstersRes] = await Promise.all([
        listMissionEncountersAction(campaignId, mission.id),
        getMonstersForInitiative(campaignId),
      ]);
      setLoading(false);

      if (!encountersRes.success) {
        toast.error(encountersRes.message ?? "Errore nel caricamento incontri.");
        return;
      }
      if (!monstersRes.success) {
        toast.error(monstersRes.error ?? "Errore nel caricamento dei mostri.");
        return;
      }

      setEncounters(encountersRes.data);
      setMonsterOptions(monstersRes.data);

      const nextSelected =
        (preferredEncounterId && encountersRes.data.find((row) => row.id === preferredEncounterId)) ||
        encountersRes.data[0] ||
        null;
      setSelectedEncounterId(nextSelected?.id ?? null);
      setDraft(buildDraftFromEncounter(nextSelected));
    },
    [campaignId, mission.id]
  );

  useEffect(() => {
    if (!open) return;
    void loadData(selectedEncounterIdRef.current);
  }, [loadData, open]);

  const resetToNewEncounter = useCallback(() => {
    setSelectedEncounterId(null);
    setDraft(EMPTY_DRAFT);
  }, []);

  const selectEncounter = useCallback(
    (encounterId: string) => {
      const encounter = encounters.find((row) => row.id === encounterId) ?? null;
      setSelectedEncounterId(encounter?.id ?? null);
      setDraft(buildDraftFromEncounter(encounter));
    },
    [encounters]
  );

  function updateMonsterRow(key: string, updates: Partial<EncounterMonsterDraft>) {
    setDraft((current) => ({
      ...current,
      monsters: current.monsters.map((row) => (row.key === key ? { ...row, ...updates } : row)),
    }));
  }

  function removeMonsterRow(key: string) {
    setDraft((current) => ({
      ...current,
      monsters: current.monsters.filter((row) => row.key !== key),
    }));
  }

  function addMonsterRow() {
    setDraft((current) => ({
      ...current,
      monsters: [...current.monsters, { key: makeDraftKey(), wikiEntityId: "", quantity: "1" }],
    }));
  }

  function saveEncounter() {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Il nome dell'incontro è obbligatorio.");
      return;
    }

    const preparedMonsters = draft.monsters
      .filter((row) => row.wikiEntityId)
      .map((row) => ({
        wikiEntityId: row.wikiEntityId,
        quantity: Math.max(1, Math.trunc(Number.parseInt(row.quantity, 10) || 1)),
      }));

    startTransition(async () => {
      let encounterId = selectedEncounterId;

      if (encounterId) {
        const updateRes = await updateMissionEncounterAction(campaignId, encounterId, {
          name,
          notes: draft.notes,
        });
        if (!updateRes.success) {
          toast.error(updateRes.message ?? "Errore nel salvataggio dell'incontro.");
          return;
        }
      } else {
        const createRes = await createMissionEncounterAction(campaignId, mission.id, {
          name,
          notes: draft.notes,
        });
        if (!createRes.success) {
          toast.error(createRes.message ?? "Errore nella creazione dell'incontro.");
          return;
        }
        encounterId = createRes.data.id;
      }

      const monstersRes = await replaceMissionEncounterMonstersAction(campaignId, encounterId, preparedMonsters);
      if (!monstersRes.success) {
        toast.error(monstersRes.message ?? "Errore nel salvataggio dei mostri.");
        return;
      }

      toast.success(encounterId === selectedEncounterId ? "Incontro aggiornato." : "Incontro creato.");
      await loadData(encounterId);
    });
  }

  function deleteEncounter() {
    if (!selectedEncounterId || !selectedEncounter) return;
    if (!window.confirm(`Eliminare l'incontro "${selectedEncounter.name}"?`)) return;

    startTransition(async () => {
      const res = await deleteMissionEncounterAction(campaignId, selectedEncounterId);
      if (!res.success) {
        toast.error(res.message ?? "Errore nell'eliminazione dell'incontro.");
        return;
      }
      toast.success("Incontro eliminato.");
      await loadData(null);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-amber-600/30 bg-zinc-950 text-zinc-100 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-100">
            <Swords className="h-5 w-5 text-amber-300" />
            Incontri GM
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Prepara gli incontri della missione <span className="font-medium text-zinc-200">{mission.title}</span>.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center text-zinc-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Caricamento incontri...
          </div>
        ) : (
          <div className="grid min-h-[420px] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="rounded-lg border border-amber-600/20 bg-zinc-900/40 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-200">Lista incontri</p>
                  <p className="text-[11px] text-zinc-500">{encounters.length} preparati</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-600/40 text-amber-100 hover:bg-amber-600/10"
                  onClick={resetToNewEncounter}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Nuovo
                </Button>
              </div>

              <div className="space-y-2">
                {encounters.length === 0 ? (
                  <div className="rounded-md border border-dashed border-zinc-700 px-3 py-4 text-xs text-zinc-500">
                    Nessun incontro ancora preparato.
                  </div>
                ) : (
                  encounters.map((encounter) => (
                    <button
                      key={encounter.id}
                      type="button"
                      onClick={() => selectEncounter(encounter.id)}
                      className={cn(
                        "w-full rounded-md border px-3 py-2 text-left transition-colors",
                        selectedEncounterId === encounter.id
                          ? "border-amber-500/40 bg-amber-600/10"
                          : "border-zinc-800 bg-zinc-950/40 hover:border-amber-600/20 hover:bg-zinc-900/60"
                      )}
                    >
                      <div className="text-sm font-medium text-zinc-100">{encounter.name}</div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {encounter.monsters.length} righe mostro
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-amber-600/20 bg-zinc-900/30 p-4">
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Nome incontro</Label>
                    <Input
                      value={draft.name}
                      onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Es. Pattuglia al ponte"
                      className="border-amber-600/30 bg-zinc-950 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Missione</Label>
                    <div className="flex h-10 items-center rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-400">
                      {mission.title}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Note GM</Label>
                  <Textarea
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Annotazioni, tattiche, trigger narrativi..."
                    className="min-h-[90px] border-amber-600/30 bg-zinc-950 text-zinc-100"
                  />
                </div>

                <div className="space-y-3 rounded-lg border border-amber-600/20 bg-zinc-950/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-amber-200">Mostri incontro</p>
                      <p className="text-[11px] text-zinc-500">
                        Questi mostri verranno caricati nel GM screen insieme ai PG iscritti.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-600/40 text-amber-100 hover:bg-amber-600/10"
                      onClick={addMonsterRow}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Aggiungi mostro
                    </Button>
                  </div>

                  {draft.monsters.length === 0 ? (
                    <div className="rounded-md border border-dashed border-zinc-700 px-3 py-4 text-xs text-zinc-500">
                      Nessun mostro configurato per questo incontro.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {draft.monsters.map((monster) => {
                        const option = monsterOptions.find((row) => row.id === monster.wikiEntityId);
                        return (
                          <div
                            key={monster.key}
                            className="grid gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 p-2 md:grid-cols-[minmax(0,1fr)_120px_auto]"
                          >
                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-500">Mostro</Label>
                              <Select
                                value={monster.wikiEntityId || "none"}
                                onValueChange={(value) =>
                                  updateMonsterRow(monster.key, {
                                    wikiEntityId: value === "none" ? "" : value,
                                  })
                                }
                              >
                                <SelectTrigger className="border-amber-600/30 bg-zinc-900 text-zinc-100">
                                  <SelectValue placeholder="Seleziona mostro" />
                                </SelectTrigger>
                                <SelectContent className="border-amber-600/30 bg-zinc-950 text-zinc-100">
                                  <SelectItem value="none">Nessuno</SelectItem>
                                  {monsterOptions.map((row) => (
                                    <SelectItem key={row.id} value={row.id}>
                                      {row.name}
                                      {row.global_status === "dead" ? " (morto)" : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {option ? (
                                <p className="text-[11px] text-zinc-500">
                                  HP base {option.hp}
                                  {option.global_status === "dead" ? " · segnato morto in campagna" : ""}
                                </p>
                              ) : null}
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] text-zinc-500">Quantità</Label>
                              <Input
                                type="number"
                                min={1}
                                value={monster.quantity}
                                onChange={(event) => updateMonsterRow(monster.key, { quantity: event.target.value })}
                                className="border-amber-600/30 bg-zinc-900 text-zinc-100"
                              />
                            </div>

                            <div className="self-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="border border-red-500/30 text-red-300 hover:bg-red-500/15 hover:text-red-200"
                                onClick={() => removeMonsterRow(monster.key)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {selectedEncounter ? (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={deleteEncounter}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Elimina incontro
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
          <Button type="button" disabled={isPending || loading} onClick={saveEncounter} className="bg-amber-600 text-zinc-950 hover:bg-amber-500">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salva incontro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

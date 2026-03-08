"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCampaignCharacters } from "@/app/campaigns/character-actions";
import { getMonstersForInitiative } from "@/app/campaigns/wiki-actions";
import { UserPlus, Swords, Edit3, Trash2, ArrowDownUp, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export type InitiativeEntry = {
  id: string;
  name: string;
  type: "pc" | "monster" | "custom";
  hp: number;
  maxHp: number;
  initiative: number;
  playerId?: string;
};

const STORAGE_KEY_PREFIX = "gm-screen-initiative-";

function generateId(): string {
  return `init-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type InitiativeTrackerProps = {
  campaignId: string;
};

export function InitiativeTracker({ campaignId }: InitiativeTrackerProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${campaignId}`;

  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [editingCell, setEditingCell] = useState<{ id: string; field: "hp" | "initiative" } | null>(null);
  const [addPcOpen, setAddPcOpen] = useState(false);
  const [addMonsterOpen, setAddMonsterOpen] = useState(false);
  const [pcList, setPcList] = useState<{ id: string; name: string }[]>([]);
  const [monsterList, setMonsterList] = useState<{ id: string; name: string; hp: number }[]>([]);
  const [monsterQuantity, setMonsterQuantity] = useState(1);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { entries?: InitiativeEntry[]; currentTurnIndex?: number };
        if (Array.isArray(parsed.entries) && parsed.entries.length > 0) {
          setEntries(parsed.entries);
          setCurrentTurnIndex(Math.min(parsed.currentTurnIndex ?? 0, parsed.entries.length - 1));
        }
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Persist to localStorage when entries or currentTurnIndex change
  useEffect(() => {
    if (entries.length === 0) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ entries, currentTurnIndex })
      );
    } catch {
      // ignore
    }
  }, [entries, currentTurnIndex, storageKey]);

  const updateEntry = useCallback(
    (id: string, updates: Partial<InitiativeEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
      );
    },
    []
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      setCurrentTurnIndex((i) => (next.length === 0 ? 0 : Math.min(i, next.length - 1)));
      return next;
    });
  }, []);

  const sortByInitiative = useCallback(() => {
    setEntries((prev) =>
      [...prev].sort((a, b) => b.initiative - a.initiative)
    );
    setCurrentTurnIndex(0);
  }, []);

  const nextTurn = useCallback(() => {
    if (entries.length === 0) return;
    setCurrentTurnIndex((i) => (i + 1) % entries.length);
  }, [entries.length]);

  const openAddPc = useCallback(async () => {
    setAddPcOpen(true);
    const res = await getCampaignCharacters(campaignId);
    if (res.success && res.data) {
      setPcList(res.data.map((c) => ({ id: c.id, name: c.name })));
    } else {
      setPcList([]);
    }
  }, [campaignId]);

  const addPcEntry = useCallback(
    (characterId: string, name: string) => {
      setEntries((prev) => [
        ...prev,
        {
          id: generateId(),
          name,
          type: "pc",
          hp: 0,
          maxHp: 0,
          initiative: 0,
          playerId: characterId,
        },
      ]);
      setAddPcOpen(false);
    },
    []
  );

  const openAddMonster = useCallback(async () => {
    setAddMonsterOpen(true);
    setMonsterQuantity(1);
    const res = await getMonstersForInitiative(campaignId);
    if (res.success && res.data) {
      setMonsterList(res.data);
    } else {
      setMonsterList([]);
    }
  }, [campaignId]);

  const addMonsterEntry = useCallback(
    (monsterId: string, name: string, hp: number, count: number) => {
      const newEntries: InitiativeEntry[] = [];
      for (let i = 0; i < count; i++) {
        newEntries.push({
          id: generateId(),
          name: count > 1 ? `${name} ${i + 1}` : name,
          type: "monster",
          hp,
          maxHp: hp,
          initiative: 0,
        });
      }
      setEntries((prev) => [...prev, ...newEntries]);
      setAddMonsterOpen(false);
    },
    []
  );

  const addManualEntry = useCallback(() => {
    setEntries((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "Nemico Sconosciuto",
        type: "custom",
        hp: 0,
        maxHp: 0,
        initiative: 0,
      },
    ]);
  }, []);

  const handleCellSave = useCallback(
    (id: string, field: "hp" | "initiative", value: string) => {
      const num = parseInt(value, 10);
      const v = Number.isNaN(num) ? 0 : num;
      if (field === "hp") {
        setEntries((prev) =>
          prev.map((e) => {
            if (e.id !== id) return e;
            const hp = v;
            const maxHp = e.maxHp > 0 ? e.maxHp : Math.max(e.maxHp, hp);
            return { ...e, hp, maxHp };
          })
        );
      } else {
        updateEntry(id, { initiative: v });
      }
      setEditingCell(null);
    },
    [updateEntry]
  );

  const hpColor = (entry: InitiativeEntry) => {
    if (entry.maxHp <= 0) return "text-zinc-400";
    const pct = entry.hp / entry.maxHp;
    if (pct > 0.5) return "text-emerald-400";
    if (pct > 0.25) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="flex h-full w-full flex-col p-6 text-zinc-100">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-amber-600/30 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-amber-400 md:text-3xl">
          Initiative Tracker
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-amber-600/40 text-amber-200 hover:bg-amber-600/20"
            onClick={sortByInitiative}
          >
            <ArrowDownUp className="mr-2 h-4 w-4" />
            Ordina Iniziativa
          </Button>
          {entries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-600/40 text-amber-200 hover:bg-amber-600/20"
              onClick={nextTurn}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Prossimo Turno
            </Button>
          )}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          className="bg-amber-700 text-white hover:bg-amber-600"
          onClick={openAddPc}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Aggiungi PG
        </Button>
        <Button
          className="bg-amber-700 text-white hover:bg-amber-600"
          onClick={openAddMonster}
        >
          <Swords className="mr-2 h-4 w-4" />
          Aggiungi Mostro
        </Button>
        <Button
          variant="outline"
          className="border-amber-600/40 text-amber-200 hover:bg-amber-600/20"
          onClick={addManualEntry}
        >
          <Edit3 className="mr-2 h-4 w-4" />
          Aggiungi Manuale
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-amber-600/30 bg-zinc-900/80">
        <Table>
          <TableHeader>
            <TableRow className="border-amber-600/20 hover:bg-transparent">
              <TableHead className="h-12 px-4 text-base font-semibold text-amber-400">
                Nome
              </TableHead>
              <TableHead className="h-12 px-4 text-base font-semibold text-amber-400">
                HP
              </TableHead>
              <TableHead className="h-12 px-4 text-base font-semibold text-amber-400">
                Iniziativa
              </TableHead>
              <TableHead className="h-12 w-16 px-4 text-base font-semibold text-amber-400">
                Azioni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow className="border-amber-600/20">
                <TableCell
                  colSpan={4}
                  className="py-12 text-center text-lg text-zinc-500"
                >
                  Nessun partecipante. Aggiungi PG, mostri o nemici manuali.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, index) => (
                <TableRow
                  key={entry.id}
                  className={cn(
                    "border-amber-600/20 text-lg",
                    index === currentTurnIndex &&
                      "bg-amber-600/25 ring-1 ring-amber-500/50"
                  )}
                >
                  <TableCell className="px-4 py-3 font-medium text-zinc-100">
                    {entry.name}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "hp" ? (
                      <Input
                        type="number"
                        className="h-9 w-24 bg-zinc-800 text-zinc-100"
                        defaultValue={entry.hp}
                        autoFocus
                        onBlur={(e) =>
                          handleCellSave(entry.id, "hp", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(
                              entry.id,
                              "hp",
                              (e.target as HTMLInputElement).value
                            );
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "min-w-[4rem] rounded px-2 py-1 text-left text-lg font-medium transition-colors hover:bg-zinc-700/80",
                          hpColor(entry)
                        )}
                        onClick={() =>
                          setEditingCell({ id: entry.id, field: "hp" })
                        }
                      >
                        {entry.maxHp > 0 ? `${entry.hp}/${entry.maxHp}` : entry.hp}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "initiative" ? (
                      <Input
                        type="number"
                        className="h-9 w-20 bg-zinc-800 text-zinc-100"
                        defaultValue={entry.initiative}
                        autoFocus
                        onBlur={(e) =>
                          handleCellSave(
                            entry.id,
                            "initiative",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(
                              entry.id,
                              "initiative",
                              (e.target as HTMLInputElement).value
                            );
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="min-w-[3rem] rounded px-2 py-1 text-left text-lg font-medium text-zinc-200 transition-colors hover:bg-zinc-700/80"
                        onClick={() =>
                          setEditingCell({
                            id: entry.id,
                            field: "initiative",
                          })
                        }
                      >
                        {entry.initiative}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                      onClick={() => removeEntry(entry.id)}
                      aria-label="Rimuovi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Aggiungi PG */}
      <Dialog open={addPcOpen} onOpenChange={setAddPcOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              Aggiungi personaggio
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto">
            {pcList.length === 0 ? (
              <p className="py-4 text-zinc-500">
                Nessun PG in questa campagna.
              </p>
            ) : (
              <ul className="space-y-1">
                {pcList.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-3 py-2 text-left text-base hover:bg-amber-600/20 hover:text-amber-200"
                      onClick={() => addPcEntry(c.id, c.name)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Aggiungi Mostro */}
      <Dialog open={addMonsterOpen} onOpenChange={setAddMonsterOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              Aggiungi mostro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Quantità (stesso mostro più volte)
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={monsterQuantity}
                onChange={(e) =>
                  setMonsterQuantity(
                    Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1))
                  )
                }
                className="w-24 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {monsterList.length === 0 ? (
                <p className="py-4 text-zinc-500">
                  Nessun mostro nel wiki. Crea voci tipo &quot;Mostro&quot; nella Wiki.
                </p>
              ) : (
                <ul className="space-y-1">
                  {monsterList.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-base hover:bg-amber-600/20 hover:text-amber-200"
                        onClick={() =>
                          addMonsterEntry(m.id, m.name, m.hp, monsterQuantity)
                        }
                      >
                        <span className="font-medium">{m.name}</span>
                        <span className="ml-2 text-sm text-zinc-500">
                          HP {m.hp}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

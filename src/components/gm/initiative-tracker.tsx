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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCampaignCharacters } from "@/app/campaigns/character-actions";
import { getMonstersForInitiative, getMonstersXpForIds, setWikiEntityGlobalStatus } from "@/app/campaigns/wiki-actions";
import { UserPlus, Swords, Edit3, Trash2, ArrowDownUp, SkipForward, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CHALLENGE_RATING_OPTIONS } from "@/lib/dnd-constants";

export type InitiativeEntry = {
  id: string;
  name: string;
  type: "pc" | "monster" | "custom";
  hp: number;
  maxHp: number;
  initiative: number;
  playerId?: string;
  /** Wiki entity id quando aggiunto da lista mostri (campagne Long: per aggiornare global_status). */
  entityId?: string;
  isCore?: boolean;
  /** Grado di Sfida (es. "2", "1/2") se presente. */
  gs?: string;
  /** Punti esperienza singoli per la creatura (se valorizzati). */
  exp?: number;
};

const STORAGE_KEY_PREFIX = "gm-screen-initiative-";

function generateId(): string {
  return `init-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type MonsterForInitiative = {
  id: string;
  name: string;
  hp: number;
  is_core?: boolean;
  global_status?: "alive" | "dead";
  xp_value?: number;
};

type InitiativeTrackerProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
};

export function InitiativeTracker({ campaignId, campaignType }: InitiativeTrackerProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${campaignId}`;
  const isLongCampaign = campaignType === "long";

  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [editingCell, setEditingCell] = useState<{ id: string; field: "name" | "hp" | "initiative" } | null>(null);
  const [addPcOpen, setAddPcOpen] = useState(false);
  const [addMonsterOpen, setAddMonsterOpen] = useState(false);
  const [pcList, setPcList] = useState<{ id: string; name: string }[]>([]);
  const [monsterList, setMonsterList] = useState<MonsterForInitiative[]>([]);
  const [monsterQuantity, setMonsterQuantity] = useState(1);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customHp, setCustomHp] = useState<string>("");
  const [customInit, setCustomInit] = useState<string>("");
  const [customGs, setCustomGs] = useState<string>("");
  const [customExp, setCustomExp] = useState<number>(0);

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

  /** Restituisce il prossimo nome con numero progressivo (es. "Goblin" -> "Goblin 2", "Goblin 2" -> "Goblin 3"). */
  const getNextDuplicateName = useCallback((currentName: string, allEntries: InitiativeEntry[]): string => {
    const match = currentName.match(/^(.+?)\s+(\d+)$/);
    const baseName = match ? match[1].trim() : currentName;
    let maxNum = 0;
    for (const e of allEntries) {
      if (e.name === baseName) maxNum = Math.max(maxNum, 1);
      const m = e.name.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(\\d+)$`));
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    return maxNum === 0 ? `${baseName} 2` : `${baseName} ${maxNum + 1}`;
  }, []);

  const duplicateEntry = useCallback((entry: InitiativeEntry) => {
    const newName = getNextDuplicateName(entry.name, entries);
    setEntries((prev) => [
      ...prev,
      {
        ...entry,
        id: generateId(),
        name: newName,
      },
    ]);
  }, [entries, getNextDuplicateName]);

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

  const resetTracker = useCallback(() => {
    setEntries([]);
    setCurrentTurnIndex(0);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

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
      const baseList = res.data;
      // Arricchisci con XP dalla Wiki se disponibili
      const ids = baseList.map((m) => m.id);
      const xpRes = await getMonstersXpForIds(campaignId, ids);
      if (xpRes.success && xpRes.data) {
        const xpMap = new Map(xpRes.data.map((r) => [r.id, r.xp_value]));
        setMonsterList(
          baseList.map((m) => ({
            ...m,
            xp_value: xpMap.get(m.id) ?? 0,
          }))
        );
      } else {
        setMonsterList(baseList);
      }
    } else {
      setMonsterList([]);
    }
  }, [campaignId]);

  const addMonsterEntry = useCallback(
    (monster: MonsterForInitiative, count: number) => {
      const newEntries: InitiativeEntry[] = [];
      for (let i = 0; i < count; i++) {
        newEntries.push({
          id: generateId(),
          name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
          type: "monster",
          hp: monster.hp,
          maxHp: monster.hp,
          initiative: 0,
          ...(typeof monster.xp_value === "number" && monster.xp_value > 0
            ? { exp: monster.xp_value }
            : {}),
          ...(isLongCampaign && monster.is_core && { entityId: monster.id, isCore: true }),
        });
      }
      setEntries((prev) => [...prev, ...newEntries]);
      setAddMonsterOpen(false);
    },
    [isLongCampaign]
  );

  const openAddCustom = useCallback(() => {
    setCustomName("");
    setCustomHp("");
    setCustomInit("");
    setCustomGs("");
    setCustomExp(0);
    setAddCustomOpen(true);
  }, []);

  const handleCreateCustom = useCallback(() => {
    const name = customName.trim() || "Nemico Sconosciuto";
    const hpNum = parseInt(customHp, 10);
    const initNum = parseInt(customInit, 10);
    const hp = Number.isNaN(hpNum) ? 0 : hpNum;
    const initiative = Number.isNaN(initNum) ? 0 : initNum;
    setEntries((prev) => [
      ...prev,
      {
        id: generateId(),
        name,
        type: "custom",
        hp,
        maxHp: hp,
        initiative,
        ...(customGs && { gs: customGs }),
        ...(customExp > 0 && { exp: customExp }),
      },
    ]);
    setAddCustomOpen(false);
  }, [customName, customHp, customInit, customGs, customExp]);

  const handleCellSave = useCallback(
    async (id: string, field: "name" | "hp" | "initiative", value: string) => {
      if (field === "name") {
        updateEntry(id, { name: value.trim() || "Senza nome" });
      } else {
        const num = parseInt(value, 10);
        const v = Number.isNaN(num) ? 0 : num;
        if (field === "hp") {
          const entry = entries.find((e) => e.id === id);
          setEntries((prev) =>
            prev.map((e) => {
              if (e.id !== id) return e;
              const hp = v;
              const maxHp = e.maxHp > 0 ? e.maxHp : Math.max(e.maxHp, hp);
              return { ...e, hp, maxHp };
            })
          );
          if (
            isLongCampaign &&
            entry?.entityId &&
            entry.isCore &&
            v === 0
          ) {
            const res = await setWikiEntityGlobalStatus(entry.entityId, campaignId, "dead");
            if (res.success) toast.success(res.message);
          }
        } else {
          updateEntry(id, { initiative: v });
        }
      }
      setEditingCell(null);
    },
    [updateEntry, entries, isLongCampaign, campaignId]
  );

  const hpColor = (entry: InitiativeEntry) => {
    if (entry.maxHp <= 0) return "text-zinc-400";
    const pct = entry.hp / entry.maxHp;
    if (pct > 0.5) return "text-emerald-400";
    if (pct > 0.25) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="flex h-full w-full flex-col p-3 text-zinc-100">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/30 pb-2">
        <h1 className="text-sm font-bold tracking-tight text-amber-400">
          Initiative Tracker
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-amber-600/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
            onClick={sortByInitiative}
          >
            <ArrowDownUp className="mr-1 h-3 w-3" />
            Ordina
          </Button>
          {entries.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-amber-600/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
                onClick={nextTurn}
              >
                <SkipForward className="mr-1 h-3 w-3" />
                Turno
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-red-500/40 px-2 text-xs text-red-300 hover:bg-red-500/20"
                onClick={resetTracker}
                title="Cancella tutte le righe e inizia un nuovo incontro"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          className="h-7 bg-amber-700 px-2 text-xs text-white hover:bg-amber-600"
          onClick={openAddPc}
        >
          <UserPlus className="mr-1 h-3 w-3" />
          PG
        </Button>
        <Button
          size="sm"
          className="h-7 bg-amber-700 px-2 text-xs text-white hover:bg-amber-600"
          onClick={openAddMonster}
        >
          <Swords className="mr-1 h-3 w-3" />
          Mostro
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 border-amber-600/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
          onClick={openAddCustom}
        >
          <Edit3 className="mr-1 h-3 w-3" />
          Manuale
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded border border-amber-600/30 bg-zinc-900/80">
        <Table>
          <TableHeader>
            <TableRow className="border-amber-600/20 hover:bg-transparent">
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                Nome
              </TableHead>
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                HP
              </TableHead>
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                Init
              </TableHead>
              <TableHead className="h-8 w-12 px-1 text-xs font-semibold text-amber-400">
                Azioni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow className="border-amber-600/20">
                <TableCell
                  colSpan={4}
                  className="py-6 text-center text-xs text-zinc-500"
                >
                  Nessun partecipante.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, index) => (
                <TableRow
                  key={entry.id}
                  className={cn(
                    "border-amber-600/20 text-sm",
                    index === currentTurnIndex &&
                      "bg-amber-600/25 ring-1 ring-amber-500/50"
                  )}
                >
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "name" ? (
                      <Input
                        type="text"
                        className="h-7 min-w-[80px] bg-zinc-800 text-xs text-zinc-100"
                        defaultValue={entry.name}
                        autoFocus
                        onBlur={(e) =>
                          handleCellSave(entry.id, "name", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(
                              entry.id,
                              "name",
                              (e.target as HTMLInputElement).value
                            );
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="min-w-0 max-w-[140px] truncate rounded px-1.5 py-0.5 text-left text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-700/80 hover:text-amber-200"
                        onClick={() =>
                          setEditingCell({ id: entry.id, field: "name" })
                        }
                        title={entry.name}
                      >
                        {entry.name}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "hp" ? (
                      <Input
                        type="number"
                        className="h-7 w-16 bg-zinc-800 text-xs text-zinc-100"
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
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className={cn(
                            "min-w-[3rem] rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors hover:bg-zinc-700/80",
                            hpColor(entry)
                          )}
                          onClick={() =>
                            setEditingCell({ id: entry.id, field: "hp" })
                          }
                        >
                          {entry.maxHp > 0 ? `${entry.hp}/${entry.maxHp}` : entry.hp}
                        </button>
                        {typeof entry.exp === "number" && entry.exp > 0 && (
                          <span className="mt-0.5 text-[10px] font-medium text-amber-300/90">
                            EXP: {entry.exp}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "initiative" ? (
                      <Input
                        type="number"
                        className="h-7 w-12 bg-zinc-800 text-xs text-zinc-100"
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
                        className="min-w-[2rem] rounded px-1.5 py-0.5 text-left text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700/80"
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
                  <TableCell className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-400 hover:bg-amber-500/20 hover:text-amber-200"
                        onClick={() => duplicateEntry(entry)}
                        aria-label="Duplica"
                        title="Duplica (nome con numero progressivo)"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                        onClick={() => removeEntry(entry.id)}
                        aria-label="Rimuovi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
                  {monsterList.map((m) => {
                    const isDead = isLongCampaign && m.global_status === "dead";
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-base hover:bg-amber-600/20 hover:text-amber-200"
                          onClick={() => {
                            if (isDead && m.is_core) {
                              toast.warning("Questo mostro è già segnato come morto nella campagna (Core).");
                            }
                            addMonsterEntry(m, monsterQuantity);
                          }}
                        >
                          <span className="font-medium">{m.name}</span>
                          <span className="ml-2 text-sm text-zinc-500">
                            HP {m.hp}
                          </span>
                          {isDead && (
                            <span className="ml-2 rounded bg-red-500/30 px-1.5 py-0.5 text-xs text-red-300">
                              Morto
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Aggiungi Mostro Manuale */}
      <Dialog open={addCustomOpen} onOpenChange={setAddCustomOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              Aggiungi mostro manuale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm text-zinc-300">Nome</label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Es. Goblin"
                className="bg-zinc-800 text-zinc-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">HP</label>
                <Input
                  type="number"
                  min={0}
                  value={customHp}
                  onChange={(e) => setCustomHp(e.target.value)}
                  className="bg-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">
                  Iniziativa
                </label>
                <Input
                  type="number"
                  value={customInit}
                  onChange={(e) => setCustomInit(e.target.value)}
                  className="bg-zinc-800 text-zinc-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">
                  Grado di Sfida (GS)
                </label>
                <Select
                  value={customGs}
                  onValueChange={(val) => {
                    setCustomGs(val);
                    const opt = CHALLENGE_RATING_OPTIONS.find(
                      (o) => o.value === val
                    );
                    setCustomExp(opt?.xp ?? 0);
                  }}
                >
                  <SelectTrigger className="h-9 w-full border-amber-600/40 bg-zinc-800 text-xs text-zinc-100">
                    <SelectValue placeholder="Scegli GS" />
                  </SelectTrigger>
                  <SelectContent className="border-amber-600/40 bg-zinc-900 text-xs text-zinc-100">
                    {CHALLENGE_RATING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">
                  Punti Esperienza
                </label>
                <div className="rounded border border-amber-600/40 bg-zinc-800 px-3 py-2 text-xs text-amber-200">
                  {customExp > 0 ? `${customExp} EXP` : "Nessun GS selezionato"}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-600/40 text-amber-100"
                onClick={() => setAddCustomOpen(false)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                onClick={handleCreateCustom}
              >
                Aggiungi alla iniziativa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { UserPlus, Swords, Edit3, Trash2, ArrowDownUp, SkipForward, Copy, RotateCcw, Skull } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CHALLENGE_RATING_OPTIONS } from "@/lib/dnd-constants";

export type InitiativeEntry = {
  id: string;
  name: string;
  type: "pc" | "monster" | "custom";
  characterClass?: string | null;
  armorClass: number;
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
  /** Stato esplicito di morte per mostri/custom. */
  isDead?: boolean;
};

const STORAGE_KEY_PREFIX = "gm-screen-initiative-";

function areInitiativeEntriesEqual(a: InitiativeEntry[], b: InitiativeEntry[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.name !== right.name ||
      left.type !== right.type ||
      left.characterClass !== right.characterClass ||
      left.armorClass !== right.armorClass ||
      left.hp !== right.hp ||
      left.maxHp !== right.maxHp ||
      left.initiative !== right.initiative ||
      left.playerId !== right.playerId ||
      left.entityId !== right.entityId ||
      left.isCore !== right.isCore ||
      left.gs !== right.gs ||
      left.exp !== right.exp ||
      left.isDead !== right.isDead
    ) {
      return false;
    }
  }
  return true;
}

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
  availableCharacters?: Array<{
    id: string;
    name: string;
    character_class: string | null;
    armor_class?: number | null;
    hit_points?: number | null;
  }>;
  value?: {
    entries: InitiativeEntry[];
    currentTurnIndex: number;
  };
  onChange?: (state: { entries: InitiativeEntry[]; currentTurnIndex: number }) => void;
};

export function InitiativeTracker({
  campaignId,
  campaignType,
  availableCharacters,
  value,
  onChange,
}: InitiativeTrackerProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${campaignId}`;
  const isLongCampaign = campaignType === "long";
  const isControlled = typeof onChange === "function" && value != null;

  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [editingCell, setEditingCell] = useState<{ id: string; field: "name" | "hp" | "initiative" | "armorClass" } | null>(null);
  const [addPcOpen, setAddPcOpen] = useState(false);
  const [addMonsterOpen, setAddMonsterOpen] = useState(false);
  const [pcList, setPcList] = useState<Array<{ id: string; name: string; characterClass: string | null; armorClass: number | null; hitPoints: number | null }>>([]);
  const [selectedPcIds, setSelectedPcIds] = useState<Set<string>>(new Set());
  const [monsterList, setMonsterList] = useState<MonsterForInitiative[]>([]);
  const [selectedMonsterIds, setSelectedMonsterIds] = useState<Set<string>>(new Set());
  const [monsterQuantity, setMonsterQuantity] = useState(1);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customHp, setCustomHp] = useState<string>("");
  const [customAc, setCustomAc] = useState<string>("");
  const [customInit, setCustomInit] = useState<string>("");
  const [customGs, setCustomGs] = useState<string>("");
  const [customExp, setCustomExp] = useState<number>(0);
  const [lastResetState, setLastResetState] = useState<{
    entries: InitiativeEntry[];
    currentTurnIndex: number;
    at: number;
  } | null>(null);
  const entriesRef = useRef(entries);
  const currentTurnIndexRef = useRef(currentTurnIndex);
  const skipControlledEchoRef = useRef(false);

  useEffect(() => {
    entriesRef.current = entries;
    currentTurnIndexRef.current = currentTurnIndex;
  }, [currentTurnIndex, entries]);

  useEffect(() => {
    if (!isControlled) return;
    const nextEntries = Array.isArray(value?.entries) ? value.entries : [];
    const nextTurnIndex =
      nextEntries.length > 0 ? Math.max(0, Math.min(value.currentTurnIndex ?? 0, nextEntries.length - 1)) : 0;
    const entriesChanged = !areInitiativeEntriesEqual(entriesRef.current, nextEntries);
    const turnChanged = currentTurnIndexRef.current !== nextTurnIndex;
    if (!entriesChanged && !turnChanged) return;
    skipControlledEchoRef.current = true;
    if (entriesChanged) {
      setEntries(nextEntries);
    }
    if (turnChanged) {
      setCurrentTurnIndex(nextTurnIndex);
    }
  }, [isControlled, value]);

  // Restore from localStorage on mount
  useEffect(() => {
    if (isControlled) return;
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
  }, [isControlled, storageKey]);

  // Persist to localStorage when entries or currentTurnIndex change
  useEffect(() => {
    if (isControlled) {
      if (skipControlledEchoRef.current) {
        skipControlledEchoRef.current = false;
        return;
      }
      onChange?.({ entries, currentTurnIndex });
      return;
    }
    if (entries.length === 0) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ entries, currentTurnIndex })
      );
    } catch {
      // ignore
    }
  }, [currentTurnIndex, entries, isControlled, onChange, storageKey]);

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
    if (entries.length > 0) {
      setLastResetState({ entries, currentTurnIndex, at: Date.now() });
    }
    setEntries([]);
    setCurrentTurnIndex(0);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey, entries, currentTurnIndex]);

  const undoReset = useCallback(() => {
    if (!lastResetState) return;
    setEntries(lastResetState.entries);
    setCurrentTurnIndex(
      Math.min(
        Math.max(0, lastResetState.currentTurnIndex),
        Math.max(0, lastResetState.entries.length - 1)
      )
    );
    setLastResetState(null);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          entries: lastResetState.entries,
          currentTurnIndex: Math.min(
            Math.max(0, lastResetState.currentTurnIndex),
            Math.max(0, lastResetState.entries.length - 1)
          ),
        })
      );
    } catch {
      // ignore
    }
    toast.success("Reset annullato.");
  }, [lastResetState, storageKey]);

  const openAddPc = useCallback(async () => {
    setAddPcOpen(true);
    setSelectedPcIds(new Set());
    if (availableCharacters) {
      setPcList(
        availableCharacters.map((character) => ({
          id: character.id,
          name: character.name,
          characterClass: character.character_class ?? null,
          armorClass: character.armor_class ?? null,
          hitPoints: character.hit_points ?? null,
        }))
      );
      return;
    }
    const res = await getCampaignCharacters(campaignId);
    if (res.success && res.data) {
      setPcList(
        res.data.map((c) => ({
          id: c.id,
          name: c.name,
          characterClass: c.character_class ?? null,
          armorClass: c.armor_class ?? null,
          hitPoints: c.hit_points ?? null,
        }))
      );
    } else {
      setPcList([]);
    }
  }, [availableCharacters, campaignId]);

  const addPcEntry = useCallback(
    (characterId: string, name: string, characterClass: string | null, armorClass: number | null, hitPoints: number | null) => {
      const hp = Math.max(0, hitPoints ?? 0);
      setEntries((prev) => [
        ...prev,
        {
          id: generateId(),
          name,
          type: "pc",
          characterClass: characterClass ?? null,
          armorClass: Math.max(0, armorClass ?? 0),
          hp,
          maxHp: hp,
          initiative: 0,
          playerId: characterId,
        },
      ]);
    },
    []
  );

  const addSelectedPcs = useCallback(() => {
    const ids = Array.from(selectedPcIds);
    if (ids.length === 0) {
      toast.error("Seleziona almeno un personaggio.");
      return;
    }
    const map = new Map(pcList.map((p) => [p.id, p]));
    for (const id of ids) {
      const player = map.get(id);
      if (player) {
        addPcEntry(id, player.name, player.characterClass, player.armorClass, player.hitPoints);
      }
    }
    setAddPcOpen(false);
  }, [selectedPcIds, pcList, addPcEntry]);

  const openAddMonster = useCallback(async () => {
    setAddMonsterOpen(true);
    setMonsterQuantity(1);
    setSelectedMonsterIds(new Set());
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
          armorClass: 0,
          hp: monster.hp,
          maxHp: monster.hp,
          initiative: 0,
          isDead: false,
          ...(typeof monster.xp_value === "number" && monster.xp_value > 0
            ? { exp: monster.xp_value }
            : {}),
          ...(isLongCampaign && monster.is_core && { entityId: monster.id, isCore: true }),
        });
      }
      setEntries((prev) => [...prev, ...newEntries]);
    },
    [isLongCampaign]
  );

  const addSelectedMonsters = useCallback(() => {
    const ids = Array.from(selectedMonsterIds);
    if (ids.length === 0) {
      toast.error("Seleziona almeno un mostro.");
      return;
    }
    const list = monsterList.filter((m) => ids.includes(m.id));
    for (const m of list) {
      const isDead = isLongCampaign && m.global_status === "dead";
      if (isDead && m.is_core) {
        toast.warning(`"${m.name}" è già segnato come morto nella campagna (Core).`);
      }
      addMonsterEntry(m, monsterQuantity);
    }
    setAddMonsterOpen(false);
  }, [selectedMonsterIds, monsterList, addMonsterEntry, monsterQuantity, isLongCampaign]);

  const applyHpChange = useCallback(
    async (entryId: string, nextHp: number) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      const clamped = Math.max(0, Math.min(nextHp, entry.maxHp > 0 ? entry.maxHp : nextHp));
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          const maxHp = e.maxHp > 0 ? e.maxHp : Math.max(e.maxHp, clamped);
          const nextDead =
            e.type === "monster" || e.type === "custom" ? clamped === 0 : e.isDead;
          return { ...e, hp: clamped, maxHp, isDead: nextDead };
        })
      );
      if (isLongCampaign && entry.entityId && entry.isCore) {
        const res = await setWikiEntityGlobalStatus(
          entry.entityId,
          campaignId,
          clamped === 0 ? "dead" : "alive"
        );
        if (res.success) toast.success(res.message);
      }
    },
    [entries, isLongCampaign, campaignId]
  );

  const adjustHp = useCallback(
    async (entryId: string, delta: number) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      await applyHpChange(entryId, entry.hp + delta);
    },
    [entries, applyHpChange]
  );

  const toggleDead = useCallback(
    async (entryId: string) => {
      const entry = entries.find((item) => item.id === entryId);
      if (!entry || (entry.type !== "monster" && entry.type !== "custom")) return;

      const nextDead = !entry.isDead;
      const revivedHp = entry.maxHp > 0 ? 1 : Math.max(1, entry.hp);
      setEntries((prev) =>
        prev.map((item) =>
          item.id === entryId
            ? {
                ...item,
                isDead: nextDead,
                hp: nextDead ? 0 : revivedHp,
              }
            : item
        )
      );

      if (isLongCampaign && entry.entityId && entry.isCore) {
        const res = await setWikiEntityGlobalStatus(
          entry.entityId,
          campaignId,
          nextDead ? "dead" : "alive"
        );
        if (res.success) toast.success(res.message);
      }
    },
    [campaignId, entries, isLongCampaign]
  );

  const openAddCustom = useCallback(() => {
    setCustomName("");
    setCustomHp("");
    setCustomAc("");
    setCustomInit("");
    setCustomGs("");
    setCustomExp(0);
    setAddCustomOpen(true);
  }, []);

  const handleCreateCustom = useCallback(() => {
    const name = customName.trim() || "Nemico Sconosciuto";
    const hpNum = parseInt(customHp, 10);
    const acNum = parseInt(customAc, 10);
    const initNum = parseInt(customInit, 10);
    const hp = Number.isNaN(hpNum) ? 0 : hpNum;
    const armorClass = Number.isNaN(acNum) ? 0 : acNum;
    const initiative = Number.isNaN(initNum) ? 0 : initNum;
    setEntries((prev) => [
      ...prev,
      {
        id: generateId(),
        name,
        type: "custom",
        armorClass,
        hp,
        maxHp: hp,
        initiative,
        isDead: false,
        ...(customGs && { gs: customGs }),
        ...(customExp > 0 && { exp: customExp }),
      },
    ]);
    setAddCustomOpen(false);
  }, [customName, customHp, customAc, customInit, customGs, customExp]);

  const handleCellSave = useCallback(
    async (id: string, field: "name" | "hp" | "initiative" | "armorClass", value: string) => {
      if (field === "name") {
        updateEntry(id, { name: value.trim() || "Senza nome" });
      } else {
        const num = parseInt(value, 10);
        const v = Number.isNaN(num) ? 0 : num;
        if (field === "hp") {
          await applyHpChange(id, v);
        } else if (field === "armorClass") {
          updateEntry(id, { armorClass: Math.max(0, v) });
        } else {
          updateEntry(id, { initiative: v });
        }
      }
      setEditingCell(null);
    },
    [updateEntry, applyHpChange]
  );

  const hpColor = (entry: InitiativeEntry) => {
    if (entry.isDead) return "text-red-300 line-through";
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
          {entries.length === 0 && lastResetState && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-amber-500/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
              onClick={undoReset}
              title="Ripristina l'ultimo stato prima del reset"
            >
              Annulla Reset
            </Button>
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
                Classe
              </TableHead>
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                HP
              </TableHead>
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                CA
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
                  colSpan={6}
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
                    entry.isDead && "bg-red-950/25 text-zinc-500",
                    index === currentTurnIndex &&
                      "bg-amber-600/25 ring-1 ring-amber-500/50"
                  )}
                >
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "name" ? (
                      <Input
                        type="text"
                        className="h-10 min-w-[120px] bg-zinc-800 text-sm text-zinc-100"
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
                        className={cn(
                          "min-w-0 max-w-[140px] truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors hover:bg-zinc-700/80 hover:text-amber-200",
                          entry.isDead ? "text-zinc-500 line-through" : "text-zinc-100"
                        )}
                        onClick={() =>
                          setEditingCell({ id: entry.id, field: "name" })
                        }
                        title={entry.name}
                      >
                        {entry.name}
                      </button>
                    )}
                    {entry.isDead && (
                      <span className="mt-1 inline-flex rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                        Morto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <span className="inline-block max-w-[120px] truncate text-xs text-zinc-300" title={entry.characterClass ?? "—"}>
                      {entry.characterClass?.trim() || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "hp" ? (
                      <Input
                        type="number"
                        className="h-10 w-28 bg-zinc-800 text-sm text-zinc-100"
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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 border-amber-600/30 bg-zinc-900/60 px-0 text-zinc-200 hover:bg-amber-600/20"
                            onClick={() => void adjustHp(entry.id, -1)}
                            title="-1 HP"
                          >
                            -
                          </Button>
                          <button
                            type="button"
                            className={cn(
                              "min-w-[5.5rem] rounded px-2 py-1 text-left text-sm font-semibold transition-colors hover:bg-zinc-700/80",
                              hpColor(entry)
                            )}
                            onClick={() =>
                              setEditingCell({ id: entry.id, field: "hp" })
                            }
                            title="Clicca per inserire un valore preciso"
                          >
                            {entry.maxHp > 0 ? `${entry.hp}/${entry.maxHp}` : entry.hp}
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 border-amber-600/30 bg-zinc-900/60 px-0 text-zinc-200 hover:bg-amber-600/20"
                            onClick={() => void adjustHp(entry.id, +1)}
                            title="+1 HP"
                          >
                            +
                          </Button>
                        </div>
                        {typeof entry.exp === "number" && entry.exp > 0 && (
                          <span className="mt-0.5 text-[10px] font-medium text-amber-300/90">
                            EXP: {entry.exp}
                          </span>
                        )}
                        {(entry.type === "monster" || entry.type === "custom") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 justify-start px-0 text-[10px]",
                              entry.isDead ? "text-red-300 hover:bg-red-500/10" : "text-zinc-400 hover:bg-zinc-700/30"
                            )}
                            onClick={() => void toggleDead(entry.id)}
                          >
                            <Skull className="mr-1 h-3 w-3" />
                            {entry.isDead ? "Ripristina vivo" : "Segna morto"}
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id && editingCell?.field === "armorClass" ? (
                      <Input
                        type="number"
                        className="h-10 w-20 bg-zinc-800 text-sm text-zinc-100"
                        defaultValue={entry.armorClass}
                        autoFocus
                        onBlur={(e) => handleCellSave(entry.id, "armorClass", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(entry.id, "armorClass", (e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="min-w-[2rem] rounded px-1.5 py-0.5 text-left text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700/80"
                        onClick={() => setEditingCell({ id: entry.id, field: "armorClass" })}
                      >
                        {entry.armorClass}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "initiative" ? (
                      <Input
                        type="number"
                        className="h-10 w-20 bg-zinc-800 text-sm text-zinc-100"
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
                      {(entry.type === "monster" || entry.type === "custom") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 hover:text-red-200",
                            entry.isDead ? "text-red-300 hover:bg-red-500/20" : "text-zinc-500 hover:bg-zinc-700/40"
                          )}
                          onClick={() => void toggleDead(entry.id)}
                          aria-label={entry.isDead ? "Ripristina vivo" : "Segna morto"}
                          title={entry.isDead ? "Ripristina vivo" : "Segna morto"}
                        >
                          <Skull className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">
                Seleziona più PG e aggiungili in un colpo solo.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedPcIds(new Set(pcList.map((p) => p.id)))}
                  disabled={pcList.length === 0}
                >
                  Tutti
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedPcIds(new Set())}
                  disabled={selectedPcIds.size === 0}
                >
                  Nessuno
                </Button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-amber-600/20 bg-zinc-950/30 p-2">
            {pcList.length === 0 ? (
              <p className="py-4 text-zinc-500">
                Nessun PG in questa campagna.
              </p>
            ) : (
              <ul className="space-y-1">
                {pcList.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-amber-600/20 hover:text-amber-200">
                      <input
                        type="checkbox"
                        checked={selectedPcIds.has(c.id)}
                        onChange={() =>
                          setSelectedPcIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className="text-base">{c.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-zinc-500">
                {selectedPcIds.size} selezionati
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setAddPcOpen(false)}
                >
                  Chiudi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  onClick={addSelectedPcs}
                  disabled={selectedPcIds.size === 0}
                >
                  Aggiungi selezionati
                </Button>
              </div>
            </div>
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
                Quantità (per ogni mostro selezionato)
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">
                Seleziona più mostri e aggiungili in batch.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedMonsterIds(new Set(monsterList.map((m) => m.id)))}
                  disabled={monsterList.length === 0}
                >
                  Tutti
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedMonsterIds(new Set())}
                  disabled={selectedMonsterIds.size === 0}
                >
                  Nessuno
                </Button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-amber-600/20 bg-zinc-950/30 p-2">
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
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-amber-600/20 hover:text-amber-200">
                          <input
                            type="checkbox"
                            checked={selectedMonsterIds.has(m.id)}
                            onChange={() =>
                              setSelectedMonsterIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(m.id)) next.delete(m.id);
                                else next.add(m.id);
                                return next;
                              })
                            }
                            className="h-4 w-4 accent-amber-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-medium">{m.name}</span>
                              <span className="text-sm text-zinc-500">HP {m.hp}</span>
                              {isDead && (
                                <span className="rounded bg-red-500/30 px-1.5 py-0.5 text-xs text-red-300">
                                  Morto
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-zinc-500">
                {selectedMonsterIds.size} selezionati
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setAddMonsterOpen(false)}
                >
                  Chiudi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  onClick={addSelectedMonsters}
                  disabled={selectedMonsterIds.size === 0}
                >
                  Aggiungi selezionati
                </Button>
              </div>
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
            <div className="grid grid-cols-3 gap-3">
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
                <label className="block text-sm text-zinc-300">CA</label>
                <Input
                  type="number"
                  min={0}
                  value={customAc}
                  onChange={(e) => setCustomAc(e.target.value)}
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

"use client";

import { useState } from "react";
import { Dices, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  RANDOM_DUNGEON_MAX_ROOMS,
  RANDOM_DUNGEON_MIN_ROOMS,
  RANDOM_DUNGEON_PROP_THEME_OPTIONS,
  RANDOM_DUNGEON_ROOM_SIZE_OPTIONS,
  clampRoomCount,
  type RandomDungeonPropTheme,
  type RandomDungeonRoomSize,
} from "@/lib/map-core/scene-editor/random-dungeon";

export type RandomDungeonSettings = {
  roomCount: number;
  withDoors: boolean;
  withProps: boolean;
  roomSize: RandomDungeonRoomSize;
  propTheme: RandomDungeonPropTheme;
  /** Vuoto = seed casuale a ogni generazione. */
  seed: string;
  appendToLayer: boolean;
};

type Props = {
  onGenerate: (settings: RandomDungeonSettings) => void;
  lastSeedUsed?: string | null;
};

export function RandomDungeonDialog({ onGenerate, lastSeedUsed = null }: Props) {
  const [open, setOpen] = useState(false);
  const [roomCount, setRoomCount] = useState(5);
  const [withDoors, setWithDoors] = useState(true);
  const [withProps, setWithProps] = useState(true);
  const [roomSize, setRoomSize] = useState<RandomDungeonRoomSize>("medium");
  const [propTheme, setPropTheme] = useState<RandomDungeonPropTheme>("dungeon");
  const [seed, setSeed] = useState("");
  const [appendToLayer, setAppendToLayer] = useState(false);

  const handleGenerate = () => {
    const settings: RandomDungeonSettings = {
      roomCount: clampRoomCount(roomCount),
      withDoors,
      withProps,
      roomSize,
      propTheme,
      seed: seed.trim(),
      appendToLayer,
    };
    onGenerate(settings);
    setOpen(false);
  };

  const rollRandomSeed = () => {
    const n = Math.floor(Math.random() * 1_000_000_000);
    setSeed(String(n));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="border-barber-gold/40">
          <Dices className="mr-2 h-4 w-4" />
          Dungeon casuale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-barber-gold/30 bg-barber-dark">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-barber-gold" />
            Genera dungeon casuale
          </DialogTitle>
          <DialogDescription>
            Stanze, corridoi, porte e prop sul layer attivo. Per impostazione predefinita{" "}
            <strong>sostituisce</strong> il contenuto del layer; attiva «Aggiungi» per unire al
            disegno esistente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="dungeon-rooms">
              Numero di stanze ({RANDOM_DUNGEON_MIN_ROOMS}–{RANDOM_DUNGEON_MAX_ROOMS})
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={RANDOM_DUNGEON_MIN_ROOMS}
                max={RANDOM_DUNGEON_MAX_ROOMS}
                step={1}
                value={roomCount}
                onChange={(e) => setRoomCount(Number(e.target.value))}
                className="h-8 flex-1"
                aria-label="Numero di stanze"
              />
              <Input
                id="dungeon-rooms"
                type="number"
                min={RANDOM_DUNGEON_MIN_ROOMS}
                max={RANDOM_DUNGEON_MAX_ROOMS}
                value={roomCount}
                onChange={(e) => setRoomCount(Number(e.target.value) || RANDOM_DUNGEON_MIN_ROOMS)}
                className="h-8 w-16 border-barber-gold/30 bg-barber-dark text-center text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dungeon-room-size">Dimensione stanze</Label>
            <select
              id="dungeon-room-size"
              value={roomSize}
              onChange={(e) => setRoomSize(e.target.value as RandomDungeonRoomSize)}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
            >
              {RANDOM_DUNGEON_ROOM_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dungeon-prop-theme">Tema prop</Label>
            <select
              id="dungeon-prop-theme"
              value={propTheme}
              onChange={(e) => setPropTheme(e.target.value as RandomDungeonPropTheme)}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
            >
              {RANDOM_DUNGEON_PROP_THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-barber-paper/55">
              Taverna: tavoli e sedie. Caverna: rocce e colonne. Dungeon: mix classico con scale.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dungeon-seed">Seed (opzionale, per rigenerare lo stesso layout)</Label>
            <div className="flex gap-2">
              <Input
                id="dungeon-seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Es. 42 o «taverna-segreta»"
                className="border-barber-gold/30 bg-barber-dark text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-barber-gold/30"
                title="Genera seed casuale"
                onClick={rollRandomSeed}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {lastSeedUsed ? (
              <p className="text-[11px] text-barber-paper/55">
                Ultimo seed usato: <code className="text-barber-gold">{lastSeedUsed}</code>
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-md border border-barber-gold/20 px-3 py-2">
            <Label htmlFor="dungeon-append" className="cursor-pointer text-sm">
              Aggiungi al layer (non sostituire)
            </Label>
            <Switch id="dungeon-append" checked={appendToLayer} onCheckedChange={setAppendToLayer} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-barber-gold/20 px-3 py-2">
            <Label htmlFor="dungeon-doors" className="cursor-pointer text-sm">
              Porte agli ingressi delle stanze
            </Label>
            <Switch id="dungeon-doors" checked={withDoors} onCheckedChange={setWithDoors} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-barber-gold/20 px-3 py-2">
            <Label htmlFor="dungeon-props" className="cursor-pointer text-sm">
              Prop nelle stanze
            </Label>
            <Switch id="dungeon-props" checked={withProps} onCheckedChange={setWithProps} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button
            type="button"
            className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            onClick={() => {
              handleGenerate();
            }}
          >
            <Dices className="mr-2 h-4 w-4" />
            Genera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

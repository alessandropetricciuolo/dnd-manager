"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  unlockPlayerAchievementFully,
  updatePlayerAchievementProgress,
} from "@/lib/actions/gamification";
import { Trophy, Swords } from "lucide-react";

type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];

type PlayerOption = {
  id: string;
  label: string;
};

type Props = {
  players: PlayerOption[];
  achievements: AchievementRow[];
};

export function GamificationPlayerTab({ players, achievements }: Props) {
  const [playerId, setPlayerId] = useState<string>("");
  const [achievementId, setAchievementId] = useState<string>("");
  const [progress, setProgress] = useState<string>("0");
  const [isPending, startTransition] = useTransition();

  const selectedAchievement = achievements.find((a) => a.id === achievementId) || null;

  function handleUnlockFull() {
    if (!playerId || !achievementId) {
      toast.error("Seleziona giocatore e achievement.");
      return;
    }
    startTransition(async () => {
      const res = await unlockPlayerAchievementFully({ player_id: playerId, achievement_id: achievementId });
      if (res.success) {
        toast.success("Achievement sbloccato per il giocatore.");
      } else {
        toast.error(res.message ?? "Errore nello sblocco.");
      }
    });
  }

  function handleUpdateProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playerId || !achievementId) {
      toast.error("Seleziona giocatore e achievement.");
      return;
    }
    const value = Number(progress);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Progresso non valido.");
      return;
    }
    startTransition(async () => {
      const res = await updatePlayerAchievementProgress({
        player_id: playerId,
        achievement_id: achievementId,
        current_progress: value,
      });
      if (res.success) {
        toast.success("Progresso aggiornato.");
      } else {
        toast.error(res.message ?? "Errore nell'aggiornamento del progresso.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-barber-paper/70">
        Usa questo pannello per assegnare manualmente achievement ai giocatori o aggiornare il
        loro progresso (es. per recuperare uno stato precedente o premiare manualmente).
      </p>

      <div className="space-y-3 rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-barber-paper/90">Giocatore</Label>
            <Select
              value={playerId}
              onValueChange={setPlayerId}
              disabled={isPending || players.length === 0}
            >
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
                <SelectValue placeholder="Seleziona giocatore" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-barber-paper/90">Achievement</Label>
            <Select
              value={achievementId}
              onValueChange={setAchievementId}
              disabled={isPending || achievements.length === 0}
            >
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
                <SelectValue placeholder="Seleziona achievement" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                {achievements.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title} ({a.points} PF)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedAchievement && (
          <p className="text-xs text-barber-paper/60">
            {selectedAchievement.is_incremental
              ? `Incrementale: target ${selectedAchievement.max_progress} progressi.`
              : "Non incrementale: viene sbloccato con un singolo evento."}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <form onSubmit={handleUpdateProgress} className="space-y-2">
            <Label htmlFor="player-progress" className="text-barber-paper/90">
              Progresso corrente
            </Label>
            <Input
              id="player-progress"
              name="current_progress"
              type="number"
              min={0}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
              disabled={isPending}
            />
            <Button
              type="submit"
              disabled={isPending}
              className="mt-1 w-full bg-barber-gold/90 text-barber-dark hover:bg-barber-gold"
            >
              {isPending && <Swords className="mr-2 h-4 w-4 animate-spin" />}
              Aggiorna Progresso
            </Button>
          </form>

          <div className="space-y-2">
            <Label className="text-barber-paper/90">Sblocco istantaneo</Label>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleUnlockFull}
              className="mt-1 w-full bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              {isPending && <Trophy className="mr-2 h-4 w-4 animate-spin" />}
              Sblocca completamente
            </Button>
            <p className="text-xs text-barber-paper/60">
              Imposta il progresso al massimo e assegna i Punti Fama relativi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


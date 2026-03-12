"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  unlockPlayerAchievementFullyBulk,
  updatePlayerAchievementProgressBulk,
} from "@/lib/actions/gamification";
import { Trophy, Swords, CheckSquare, Square } from "lucide-react";

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
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [achievementId, setAchievementId] = useState<string>("");
  const [progress, setProgress] = useState<string>("0");
  const [isPending, startTransition] = useTransition();

  const selectedAchievement = achievements.find((a) => a.id === achievementId) || null;
  const selectedCount = selectedPlayerIds.size;

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedPlayerIds(new Set(players.map((p) => p.id)));
  }

  function deselectAll() {
    setSelectedPlayerIds(new Set());
  }

  function handleUnlockFull() {
    if (!achievementId) {
      toast.error("Seleziona un achievement.");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Seleziona almeno un giocatore.");
      return;
    }
    startTransition(async () => {
      const res = await unlockPlayerAchievementFullyBulk({
        player_ids: Array.from(selectedPlayerIds),
        achievement_id: achievementId,
      });
      if (res.success) {
        const { data } = res;
        if (data && data.fail > 0) {
          toast.warning(res.message ?? "Operazione completata con alcuni errori.");
        } else {
          toast.success(
            data?.ok === 1 ? "Achievement sbloccato per il giocatore." : `Achievement sbloccato per ${data?.ok ?? selectedCount} giocatori.`
          );
        }
      } else {
        toast.error(res.message ?? "Errore nello sblocco.");
      }
    });
  }

  function handleUpdateProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!achievementId) {
      toast.error("Seleziona un achievement.");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Seleziona almeno un giocatore.");
      return;
    }
    const value = Number(progress);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Progresso non valido.");
      return;
    }
    startTransition(async () => {
      const res = await updatePlayerAchievementProgressBulk({
        player_ids: Array.from(selectedPlayerIds),
        achievement_id: achievementId,
        current_progress: value,
      });
      if (res.success) {
        const { data } = res;
        if (data && data.fail > 0) {
          toast.warning(res.message ?? "Operazione completata con alcuni errori.");
        } else {
          toast.success(
            data?.ok === 1 ? "Progresso aggiornato." : `Progresso aggiornato per ${data?.ok ?? selectedCount} giocatori.`
          );
        }
      } else {
        toast.error(res.message ?? "Errore nell'aggiornamento del progresso.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-barber-paper/70">
        Seleziona uno o più giocatori dalla lista, scegli un achievement e aggiorna il progresso o
        sblocca l’achievement per tutti i giocatori selezionati.
      </p>

      <div className="space-y-3 rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-barber-paper/90">Giocatori</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={isPending || players.length === 0}
                className="h-8 text-barber-gold hover:bg-barber-gold/20"
              >
                Tutti
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                disabled={isPending || selectedCount === 0}
                className="h-8 text-barber-paper/70 hover:bg-barber-gold/20"
              >
                Nessuno
              </Button>
            </div>
          </div>
          <p className="text-xs text-barber-paper/60">
            {selectedCount === 0
              ? "Seleziona i giocatori a cui assegnare l’achievement."
              : `${selectedCount} giocatore/i selezionato/i.`}
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-2">
            {players.length === 0 ? (
              <li className="py-2 text-center text-sm text-barber-paper/50">Nessun giocatore.</li>
            ) : (
              players.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-barber-paper hover:bg-barber-gold/10">
                    <input
                      type="checkbox"
                      checked={selectedPlayerIds.has(p.id)}
                      onChange={() => togglePlayer(p.id)}
                      className="sr-only"
                      aria-label={`Seleziona ${p.label}`}
                    />
                    <span className="flex shrink-0">
                      {selectedPlayerIds.has(p.id) ? (
                        <CheckSquare className="h-5 w-5 text-barber-gold" aria-hidden />
                      ) : (
                        <Square className="h-5 w-5 text-barber-paper/50" aria-hidden />
                      )}
                    </span>
                    <span className="truncate">{p.label}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
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
              disabled={isPending || selectedCount === 0 || !achievementId}
              className="mt-1 w-full bg-barber-gold/90 text-barber-dark hover:bg-barber-gold"
            >
              {isPending && <Swords className="mr-2 h-4 w-4 animate-spin" />}
              Aggiorna progresso {selectedCount > 0 ? `(${selectedCount})` : ""}
            </Button>
          </form>

          <div className="space-y-2">
            <Label className="text-barber-paper/90">Sblocco istantaneo</Label>
            <Button
              type="button"
              disabled={isPending || selectedCount === 0 || !achievementId}
              onClick={handleUnlockFull}
              className="mt-1 w-full bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              {isPending && <Trophy className="mr-2 h-4 w-4 animate-spin" />}
              Sblocca completamente {selectedCount > 0 ? `(${selectedCount})` : ""}
            </Button>
            <p className="text-xs text-barber-paper/60">
              Imposta il progresso al massimo e assegna i Punti Fama per i giocatori selezionati.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


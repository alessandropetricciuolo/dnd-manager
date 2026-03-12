"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { upsertAchievement, deleteAchievement } from "@/lib/actions/gamification";
import { Award, Plus, Trash2 } from "lucide-react";

type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];

const ACHIEVEMENT_CATEGORIES = [
  "Titoli di Fine Sessione",
  "Combattimento",
  "Esplorazione",
  "Storia",
  "Generale",
] as const;

type Props = {
  achievements: AchievementRow[];
};

export function GamificationAchievementsTab({ achievements }: Props) {
  const [open, setOpen] = useState(false);
  const [isIncremental, setIsIncremental] = useState(false);
  const [category, setCategory] = useState<string>("Generale");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get("title") as string | null)?.trim() || "";
    const description = (formData.get("description") as string | null) ?? "";
    const pointsRaw = (formData.get("points") as string | null) ?? "0";
    const iconName = (formData.get("icon_name") as string | null) ?? "Award";
    const maxProgressRaw = (formData.get("max_progress") as string | null) ?? "1";
    const incremental = isIncremental;

    if (!title) {
      toast.error("Titolo obbligatorio.");
      return;
    }

    const points = Number.isNaN(Number(pointsRaw)) ? 0 : Number(pointsRaw);
    const maxProgress = Number.isNaN(Number(maxProgressRaw)) ? 1 : Number(maxProgressRaw);

    startTransition(async () => {
      const res = await upsertAchievement({
        title,
        description,
        points,
        icon_name: iconName || "Award",
        is_incremental: incremental,
        max_progress: incremental ? maxProgress : 1,
        category: ACHIEVEMENT_CATEGORIES.includes(category as (typeof ACHIEVEMENT_CATEGORIES)[number]) ? category : "Generale",
      });
      setCategory("Generale");

      if (res.success) {
        toast.success("Achievement salvato.");
        setOpen(false);
        form.reset();
        setIsIncremental(false);
        setCategory("Generale");
      } else {
        toast.error(res.message ?? "Errore nel salvataggio.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Eliminare questo achievement?")) return;
    startTransition(async () => {
      const res = await deleteAchievement(id);
      if (res.success) {
        toast.success("Achievement eliminato.");
      } else {
        toast.error(res.message ?? "Errore durante l'eliminazione.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-barber-paper/90">Catalogo Achievement</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nuovo Achievement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-barber-gold/40 bg-barber-dark text-barber-paper">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-barber-gold">
                <Award className="h-5 w-5" />
                Crea Achievement
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ach-title" className="text-barber-paper/90">
                  Titolo
                </Label>
                <Input
                  id="ach-title"
                  name="title"
                  placeholder="es. Battesimo del Fuoco"
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ach-description" className="text-barber-paper/90">
                  Descrizione
                </Label>
                <Textarea
                  id="ach-description"
                  name="description"
                  rows={3}
                  placeholder="Hai completato la tua prima sessione."
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ach-category" className="text-barber-paper/90">
                  Categoria
                </Label>
                <Select value={category} onValueChange={setCategory} disabled={isPending}>
                  <SelectTrigger
                    id="ach-category"
                    className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  >
                    <SelectValue placeholder="Generale" />
                  </SelectTrigger>
                  <SelectContent className="border-barber-gold/20 bg-barber-dark">
                    {ACHIEVEMENT_CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat}
                        value={cat}
                        className="text-barber-paper focus:bg-barber-gold/20"
                      >
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ach-points" className="text-barber-paper/90">
                    Punti Fama
                  </Label>
                  <Input
                    id="ach-points"
                    name="points"
                    type="number"
                    min={0}
                    defaultValue={10}
                    className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ach-icon" className="text-barber-paper/90">
                    Icona (Lucide)
                  </Label>
                  <Input
                    id="ach-icon"
                    name="icon_name"
                    placeholder="es. Flame, Award..."
                    defaultValue="Award"
                    className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-lg border border-barber-gold/30 bg-barber-dark/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="ach-incremental"
                    className="text-sm font-normal text-barber-paper/90"
                  >
                    È incrementale?
                  </Label>
                  <Switch
                    id="ach-incremental"
                    checked={isIncremental}
                    onCheckedChange={setIsIncremental}
                    disabled={isPending}
                  />
                </div>
                {isIncremental && (
                  <div className="space-y-2">
                    <Label htmlFor="ach-max" className="text-barber-paper/90">
                      Target massimo (progressi)
                    </Label>
                    <Input
                      id="ach-max"
                      name="max_progress"
                      type="number"
                      min={1}
                      defaultValue={100}
                      className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                      disabled={isPending}
                    />
                    <p className="text-xs text-barber-paper/60">
                      Quando il progresso raggiunge questo valore, l&apos;achievement viene sbloccato.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-barber-gold/40 text-barber-paper"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                >
                  {isPending && <span className="mr-2 h-4 w-4 animate-spin border-2 border-b-transparent border-barber-dark rounded-full" />}
                  Salva
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark/80">
        {achievements.length === 0 ? (
          <p className="px-4 py-6 text-sm text-barber-paper/60">
            Nessun achievement ancora. Crea il primo con &quot;Nuovo Achievement&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-barber-gold/20">
            {achievements.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 px-4 py-3 text-sm text-barber-paper/90"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-barber-gold/20 text-xs font-semibold text-barber-gold">
                      {a.points}
                    </span>
                    <span className="font-semibold">{a.title}</span>
                    {a.is_incremental && (
                      <span className="rounded-full bg-barber-gold/10 px-2 py-0.5 text-[10px] font-medium text-barber-gold">
                        Incrementale · {a.max_progress}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="truncate text-xs text-barber-paper/70">{a.description}</p>
                  )}
                  <p className="text-[11px] text-barber-paper/50">
                    {"category" in a && a.category && (
                      <span className="mr-1.5 rounded bg-barber-gold/10 px-1.5 py-0.5 text-[10px] text-barber-gold">
                        {a.category}
                      </span>
                    )}
                    Icona: {a.icon_name} · Punti Fama: {a.points}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:bg-red-950/40 hover:text-red-200"
                  onClick={() => handleDelete(a.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createAvatarFromUpload } from "@/app/admin/gamification/actions";
import { deleteAvatar } from "@/lib/actions/gamification";
import Image from "next/image";
import { Plus, Trash2, UserCircle2 } from "lucide-react";

type AvatarRow = Database["public"]["Tables"]["avatars"]["Row"];
type AchievementRow = Database["public"]["Tables"]["achievements"]["Row"];

type Props = {
  avatars: AvatarRow[];
  achievements: AchievementRow[];
};

export function GamificationAvatarsTab({ avatars, achievements }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!isDefault && selectedAchievementId) {
      formData.set("required_achievement_id", selectedAchievementId);
    }
    if (isDefault) {
      formData.delete("required_achievement_id");
    }

    startTransition(async () => {
      const res = await createAvatarFromUpload(formData);
      if (res.success) {
        toast.success(res.message);
        setDialogOpen(false);
        form.reset();
        setIsDefault(false);
        setSelectedAchievementId(undefined);
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Eliminare questo avatar?")) return;
    startTransition(async () => {
      const res = await deleteAvatar(id);
      if (res.success) {
        toast.success("Avatar eliminato.");
      } else {
        toast.error(res.message ?? "Errore eliminando avatar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-barber-paper/90">Catalogo Avatar</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Carica Avatar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md border-barber-gold/40 bg-barber-dark text-barber-paper">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-barber-gold">
                <UserCircle2 className="h-5 w-5" />
                Nuovo Avatar
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="avatar-name" className="text-barber-paper/90">
                  Nome
                </Label>
                <Input
                  id="avatar-name"
                  name="name"
                  placeholder="es. Guerriero Dorato"
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar-image" className="text-barber-paper/90">
                  Immagine
                </Label>
                <Input
                  id="avatar-image"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-gold/20 file:px-3 file:py-1.5 file:text-barber-gold file:text-sm"
                  disabled={isPending}
                  required
                />
              </div>
              <div className="space-y-3 rounded-lg border border-barber-gold/30 bg-barber-dark/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor="avatar-default"
                    className="text-sm font-normal text-barber-paper/90"
                  >
                    È di base (gratuito)?
                  </Label>
                  <Switch
                    id="avatar-default"
                    checked={isDefault}
                    onCheckedChange={(val) => {
                      setIsDefault(val);
                      if (val) setSelectedAchievementId(undefined);
                    }}
                    disabled={isPending}
                  />
                  <input type="hidden" name="is_default" value={isDefault ? "on" : ""} />
                </div>
                {!isDefault && (
                  <div className="space-y-2">
                    <Label className="text-barber-paper/90">
                      Sbloccato da Achievement
                    </Label>
                    <Select
                      value={selectedAchievementId ?? ""}
                      onValueChange={setSelectedAchievementId}
                      disabled={isPending || achievements.length === 0}
                    >
                      <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
                        <SelectValue placeholder="Seleziona achievement (opzionale)" />
                      </SelectTrigger>
                      <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                        {achievements.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.title} ({a.points} PF)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="hidden"
                      name="required_achievement_id"
                      value={selectedAchievementId ?? ""}
                    />
                    <p className="text-xs text-barber-paper/60">
                      Se vuoto, l&apos;avatar potrà essere sbloccato solo manualmente.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-barber-gold/40 text-barber-paper"
                  onClick={() => setDialogOpen(false)}
                  disabled={isPending}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                >
                  {isPending && (
                    <span className="mr-2 h-4 w-4 animate-spin border-2 border-b-transparent border-barber-dark rounded-full" />
                  )}
                  Salva
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {avatars.length === 0 ? (
        <p className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-4 py-6 text-sm text-barber-paper/60">
          Nessun avatar definito. Usa &quot;Carica Avatar&quot; per aggiungerne uno.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className="relative overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark/80"
            >
              <div className="relative h-32 w-full bg-barber-dark">
                {avatar.image_url ? (
                  <Image
                    src={avatar.image_url}
                    alt={avatar.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-barber-paper/40">
                    <UserCircle2 className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="space-y-1 px-3 py-2 text-sm text-barber-paper/90">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold">{avatar.name}</p>
                  {avatar.is_default && (
                    <span className="rounded-full bg-barber-gold/15 px-2 py-0.5 text-[10px] font-medium text-barber-gold">
                      Default
                    </span>
                  )}
                </div>
                {avatar.required_achievement_id && (
                  <p className="text-[11px] text-barber-paper/60">
                    Richiede achievement associato
                  </p>
                )}
              </div>
              <div className="flex justify-end border-t border-barber-gold/20 px-3 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:bg-red-950/40 hover:text-red-200"
                  onClick={() => handleDelete(avatar.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


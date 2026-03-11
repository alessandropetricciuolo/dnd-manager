"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePlayerProfile } from "@/app/dashboard/settings/profile/actions";
import { Loader2, Trophy, Bell, BellOff } from "lucide-react";

type PlayerProfileFormProps = {
  defaultValues: {
    nickname: string | null;
    avatar_url: string | null;
    is_player_public: boolean;
    notifications_disabled: boolean;
  };
};

export function PlayerProfileForm({ defaultValues }: PlayerProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(defaultValues.avatar_url);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updatePlayerProfile(formData);
      if (result.success) {
        toast.success(result.message);
        setAvatarPreview(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview(defaultValues.avatar_url);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-barber-paper/90">Avatar</Label>
        <p className="text-xs text-barber-paper/60">
          Immagine profilo quadrata o rotonda (usata in Classifica Eroi).
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {(avatarPreview || defaultValues.avatar_url) && (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-barber-gold/30 bg-barber-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarPreview || defaultValues.avatar_url || ""}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              onChange={onAvatarChange}
              disabled={isPending}
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-gold/20 file:px-3 file:py-1 file:text-barber-gold"
            />
            {defaultValues.avatar_url && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper/80">
                <input
                  type="checkbox"
                  name="remove_avatar"
                  disabled={isPending}
                  className="h-4 w-4 rounded border-barber-gold/50 bg-barber-dark text-barber-gold"
                />
                Rimuovi avatar
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nickname" className="text-barber-paper/90">
          Nickname
        </Label>
        <Input
          id="nickname"
          name="nickname"
          defaultValue={defaultValues.nickname ?? ""}
          placeholder="es. GuerrieroSolare"
          minLength={2}
          className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
          disabled={isPending}
        />
        <p className="text-xs text-barber-paper/60">
          Nome pubblico univoco per la Classifica Eroi (almeno 2 caratteri).
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-barber-gold/20 bg-barber-dark/50 p-4">
        <input
          type="checkbox"
          id="is_player_public"
          name="is_player_public"
          defaultChecked={defaultValues.is_player_public}
          disabled={isPending}
          className="h-4 w-4 rounded border-barber-gold/50 bg-barber-dark text-barber-gold"
        />
        <Label htmlFor="is_player_public" className="cursor-pointer text-barber-paper/90">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-barber-gold" />
            Mostra il mio profilo nella Classifica Eroi
          </span>
        </Label>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-barber-gold/20 bg-barber-dark/50 p-4">
        <input
          type="checkbox"
          id="notifications_disabled"
          name="notifications_disabled"
          defaultChecked={defaultValues.notifications_disabled}
          disabled={isPending}
          className="h-4 w-4 rounded border-barber-gold/50 bg-barber-dark text-barber-gold"
        />
        <Label htmlFor="notifications_disabled" className="cursor-pointer text-barber-paper/90">
          <span className="flex items-center gap-2">
            {defaultValues.notifications_disabled ? (
              <BellOff className="h-4 w-4 text-amber-400" />
            ) : (
              <Bell className="h-4 w-4 text-barber-gold" />
            )}
            Blocca avvisi automatici (email sessioni, conferme, assegnazione PG)
          </span>
        </Label>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Salvataggio..." : "Salva profilo"}
      </Button>
    </form>
  );
}

"use client";

import { useTransition, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updatePlayerProfile } from "@/app/dashboard/settings/profile/actions";
import { Loader2, Trophy, Bell, BellOff, UserCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PlayerProfileFormProps = {
  defaultValues: {
    nickname: string | null;
    avatar_url: string | null;
    is_player_public: boolean;
    notifications_disabled: boolean;
  };
};

const NICKNAME_UNIQUE_ERROR = "già in uso";

export function PlayerProfileForm({ defaultValues }: PlayerProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(defaultValues.avatar_url);
  const [isPlayerPublic, setIsPlayerPublic] = useState(defaultValues.is_player_public);
  const [notificationsDisabled, setNotificationsDisabled] = useState(
    defaultValues.notifications_disabled
  );
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) setLastError(null);
  }, [isPending]);

  const nicknameError = lastError?.toLowerCase().includes(NICKNAME_UNIQUE_ERROR) ?? false;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLastError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("is_player_public", isPlayerPublic ? "on" : "");
    formData.set("notifications_disabled", notificationsDisabled ? "on" : "");
    startTransition(async () => {
      const result = await updatePlayerProfile(formData);
      if (result.success) {
        toast.success(result.message);
        setAvatarPreview(null);
      } else {
        setLastError(result.message);
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
    <form onSubmit={onSubmit} className="space-y-8">
      {/* 1. Avatar */}
      <section className="space-y-3">
        <Label className="text-barber-paper/90">Avatar</Label>
        <p className="text-xs text-barber-paper/60">
          Immagine profilo (quadrata o rotonda). Verrà mostrata nella Classifica Eroi.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 items-center justify-center">
            {(avatarPreview || defaultValues.avatar_url) ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-barber-gold/30 bg-barber-dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview || defaultValues.avatar_url || ""}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-barber-gold/20 bg-barber-dark/60">
                <UserCircle className="h-12 w-12 text-barber-paper/40" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Input
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              onChange={onAvatarChange}
              disabled={isPending}
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-gold/20 file:px-3 file:py-1.5 file:text-barber-gold file:text-sm"
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
      </section>

      {/* 2. Nickname */}
      <section className="space-y-2">
        <Label htmlFor="nickname" className="text-barber-paper/90">
          Nickname
        </Label>
        <Input
          id="nickname"
          name="nickname"
          defaultValue={defaultValues.nickname ?? ""}
          placeholder="es. GuerrieroSolare"
          minLength={2}
          disabled={isPending}
          className={cn(
            "border-barber-gold/30 bg-barber-dark/80 text-barber-paper placeholder:text-barber-paper/40",
            nicknameError && "border-red-500/60 focus-visible:ring-red-500/50"
          )}
          aria-invalid={nicknameError}
          aria-describedby={nicknameError ? "nickname-error" : "nickname-hint"}
        />
        <p id="nickname-hint" className="text-xs text-barber-paper/60">
          Questo sarà il tuo nome pubblico nella Hall of Fame. Univoco, almeno 2 caratteri.
        </p>
        {nicknameError && (
          <div
            id="nickname-error"
            className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {lastError}
          </div>
        )}
      </section>

      {/* 3. Privacy e Notifiche */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-barber-gold">Privacy e Notifiche</h3>
        <div className="space-y-4 rounded-xl border border-barber-gold/20 bg-barber-dark/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <Label
              htmlFor="wizard-leaderboard"
              className="cursor-pointer text-barber-paper/90 font-normal"
            >
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-barber-gold" />
                Mostra il mio profilo nella Classifica Eroi (Hall of Fame)
              </span>
              <p className="mt-0.5 text-xs text-barber-paper/50">
                Se disattivato, non apparirai nella leaderboard pubblica.
              </p>
            </Label>
            <Switch
              id="wizard-leaderboard"
              checked={isPlayerPublic}
              onCheckedChange={setIsPlayerPublic}
              disabled={isPending}
            />
          </div>

          <div className="border-t border-barber-gold/10 pt-4">
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="wizard-notifications"
                className="cursor-pointer text-barber-paper/90 font-normal"
              >
                <span className="flex items-center gap-2">
                  {notificationsDisabled ? (
                    <BellOff className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Bell className="h-4 w-4 text-barber-gold" />
                  )}
                  Blocca avvisi automatici
                </span>
                <p className="mt-0.5 text-xs text-barber-paper/50">
                  Email per: nuove sessioni, conferme iscrizioni, assegnazione personaggi.
                </p>
              </Label>
              <Switch
                id="wizard-notifications"
                checked={notificationsDisabled}
                onCheckedChange={setNotificationsDisabled}
                disabled={isPending}
              />
            </div>
          </div>
        </div>
      </section>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Salvataggio..." : "Salva Modifiche"}
      </Button>
    </form>
  );
}

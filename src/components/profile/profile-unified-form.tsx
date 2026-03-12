"use client";

import { useTransition, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateProfile } from "@/app/profile/actions";
import { updatePlayerProfile } from "@/app/dashboard/settings/profile/actions";
import { AvatarSelector } from "@/components/dashboard/avatar-selector";
import type { AvatarGalleryData } from "@/lib/avatar-gallery";
import { Loader2, Trophy, Bell, BellOff, UserCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ProfileUnifiedFormProps = {
  defaultValues: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone: string;
    nickname: string | null;
    avatar_url: string | null;
    is_player_public: boolean;
    notifications_disabled: boolean;
  };
  avatarGallery: AvatarGalleryData | null;
};

const NICKNAME_UNIQUE_ERROR = "già in uso";

export function ProfileUnifiedForm({ defaultValues, avatarGallery }: ProfileUnifiedFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(defaultValues.avatar_url);
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
      const [resProfile, resPlayer] = await Promise.all([
        updateProfile(formData),
        updatePlayerProfile(formData),
      ]);
      if (resProfile.success && resPlayer.success) {
        toast.success("Profilo aggiornato.");
      } else {
        const msg = !resProfile.success ? resProfile.message : resPlayer.message;
        setLastError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* 1. Dati personali */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-barber-gold">Dati personali</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name" className="text-barber-paper/90">
              Nome
            </Label>
            <Input
              id="first_name"
              name="first_name"
              defaultValue={defaultValues.first_name}
              placeholder="Mario"
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name" className="text-barber-paper/90">
              Cognome
            </Label>
            <Input
              id="last_name"
              name="last_name"
              defaultValue={defaultValues.last_name}
              placeholder="Rossi"
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
              disabled={isPending}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth" className="text-barber-paper/90">
            Data di nascita
          </Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={defaultValues.date_of_birth}
            className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-barber-paper/90">
            Cellulare
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
            placeholder="+39 333 1234567"
            className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
            disabled={isPending}
          />
        </div>
      </section>

      {/* 2. Avatar - Galleria sbloccabili */}
      <section className="space-y-3">
        <Label className="text-barber-paper/90">Avatar</Label>
        <p className="text-xs text-barber-paper/60">
          Scegli un avatar dalla galleria. Sblocca nuovi avatar completando achievement.
        </p>
        <input type="hidden" name="avatar_url" value={selectedAvatarUrl ?? ""} />
        <input type="hidden" name="remove_avatar" value={selectedAvatarUrl === null ? "on" : ""} />
        {avatarGallery ? (
          <AvatarSelector
            avatars={avatarGallery.avatars}
            unlockedAchievementIds={avatarGallery.unlockedAchievementIds}
            value={selectedAvatarUrl}
            onChange={setSelectedAvatarUrl}
            disabled={isPending}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-barber-gold/20 bg-barber-dark/60">
            <UserCircle className="h-12 w-12 text-barber-paper/40" />
          </div>
        )}
      </section>

      {/* 3. Nickname */}
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
          Nome pubblico nella Hall of Fame. Univoco, almeno 2 caratteri.
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

      {/* 4. Privacy e Notifiche */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-barber-gold">Privacy e Notifiche</h3>
        <div className="space-y-4 rounded-xl border border-barber-gold/20 bg-barber-dark/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <Label
              htmlFor="unified-leaderboard"
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
              id="unified-leaderboard"
              checked={isPlayerPublic}
              onCheckedChange={setIsPlayerPublic}
              disabled={isPending}
            />
          </div>
          <div className="border-t border-barber-gold/10 pt-4">
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="unified-notifications"
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
                id="unified-notifications"
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
        {isPending ? "Salvataggio..." : "Salva modifiche"}
      </Button>
    </form>
  );
}

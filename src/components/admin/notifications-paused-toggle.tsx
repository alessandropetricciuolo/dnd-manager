"use client";

import { useTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Bell, BellOff } from "lucide-react";
import {
  getNotificationsPausedSetting,
  setNotificationsPausedAction,
} from "@/app/admin/actions";

export function NotificationsPausedToggle() {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getNotificationsPausedSetting().then((res) => {
      setLoading(false);
      if (res.success && res.paused !== undefined) setPaused(res.paused);
    });
  }, []);

  function onToggle(checked: boolean) {
    startTransition(async () => {
      const res = await setNotificationsPausedAction(checked);
      if (res.success) {
        setPaused(!!res.paused);
        toast.success(
          checked
            ? "Avvisi automatici sospesi. Nessuna email verrà inviata per sessioni, conferme o assegnazioni."
            : "Avvisi automatici riattivati."
        );
      } else {
        toast.error(res.message ?? "Errore aggiornamento.");
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-barber-gold" />
        <span className="text-sm text-barber-paper/70">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
      <div>
        <Label
          htmlFor="admin-notifications-paused"
          className="flex cursor-pointer items-center gap-2 text-barber-paper/90"
        >
          {paused ? (
            <BellOff className="h-5 w-5 text-amber-400" />
          ) : (
            <Bell className="h-5 w-5 text-barber-gold" />
          )}
          Avvisi automatici sospesi
        </Label>
        <p className="mt-1 text-xs text-barber-paper/50">
          Se attivo, nessuna email verrà inviata per nuove sessioni, conferme iscrizioni o assegnazione personaggi. Utile durante inserimenti massivi.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-barber-gold" />}
        <Switch
          id="admin-notifications-paused"
          checked={paused}
          onCheckedChange={onToggle}
          disabled={isPending}
        />
      </div>
    </div>
  );
}

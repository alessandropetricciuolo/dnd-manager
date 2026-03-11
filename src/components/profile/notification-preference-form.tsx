"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationsPreference } from "@/app/profile/actions";
import { Bell, BellOff } from "lucide-react";

type NotificationPreferenceFormProps = {
  notificationsDisabled: boolean;
};

export function NotificationPreferenceForm({ notificationsDisabled }: NotificationPreferenceFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      const result = await updateNotificationsPreference(checked);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-barber-paper/90">
        {notificationsDisabled ? (
          <BellOff className="h-4 w-4 text-amber-400" />
        ) : (
          <Bell className="h-4 w-4 text-barber-gold" />
        )}
        Avvisi email
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-3 hover:bg-barber-dark/80">
        <input
          type="checkbox"
          defaultChecked={notificationsDisabled}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold focus:ring-barber-gold"
        />
        <div>
          <span className="text-sm font-medium text-barber-paper">Blocca avvisi automatici</span>
          <p className="mt-0.5 text-xs text-barber-paper/60">
            Se attivo, non riceverai email per: nuove sessioni in calendario, nuove campagne, conferme di iscrizione e assegnazione personaggi.
          </p>
        </div>
      </label>
      {isPending && <p className="text-xs text-barber-paper/50">Salvataggio...</p>}
    </div>
  );
}

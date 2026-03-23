"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveCampaignImageStyleAction } from "./actions";

type AiStyleFormProps = {
  campaignId: string;
  initialValue: string | null;
  styles: Array<{ key: string; name: string; description: string | null; is_active: boolean }>;
};

export function AiStyleForm({ campaignId, initialValue, styles }: AiStyleFormProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await saveCampaignImageStyleAction(campaignId, null, formData);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ai_image_style_key" className="text-barber-paper">
          Stile Immagini Globale
        </Label>
        <select
          id="ai_image_style_key"
          name="ai_image_style_key"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-11 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 text-barber-paper"
          disabled={isPending}
        >
          <option value="">Nessuno (fallback ai paletti campagna)</option>
          {styles
            .filter((s) => s.is_active || s.key === value)
            .map((style) => (
              <option key={style.key} value={style.key}>
                {style.name}
              </option>
            ))}
        </select>
        <p className="text-sm text-barber-paper/70">
          Lo stile e definito globalmente nel pannello Admin. Qui agganci la campagna a uno stile.
          I paletti della campagna (es. dark fantasy) restano comunque applicati in generazione.
        </p>
        {value && (
          <p className="text-xs text-barber-paper/60">
            Stile selezionato:{" "}
            {styles.find((s) => s.key === value)?.description || styles.find((s) => s.key === value)?.name || value}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="bg-violet-600 text-white hover:bg-violet-500"
      >
        {isPending ? "Salvataggio..." : "Salva Stile Campagna"}
      </Button>
    </form>
  );
}

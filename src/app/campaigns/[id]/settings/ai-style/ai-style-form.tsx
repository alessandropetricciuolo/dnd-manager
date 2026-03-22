"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveImageStylePromptAction } from "./actions";

type AiStyleFormProps = {
  campaignId: string;
  initialValue: string;
};

export function AiStyleForm({ campaignId, initialValue }: AiStyleFormProps) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await saveImageStylePromptAction(campaignId, null, formData);
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
        <Label htmlFor="image_style_prompt" className="text-barber-paper">
          Template Stile Visivo Immagini
        </Label>
        <Textarea
          id="image_style_prompt"
          name="image_style_prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Esempio: Dark fantasy grimdark sketch, desaturated palette, ink wash textures, dramatic chiaroscuro lighting, medieval worn materials, cinematic composition..."
          className="min-h-[180px] resize-y border-barber-gold/30 bg-barber-dark text-barber-paper"
          disabled={isPending}
        />
        <p className="text-sm text-barber-paper/70">
          Incolla qui il prompt strutturato (risultato del reverse engineering) che definisce lo stile unico di
          questa campagna (es. Dark Fantasy Grimdark Sketch). L&apos;IA lo userà per tutte le immagini generated.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="bg-violet-600 text-white hover:bg-violet-500"
      >
        {isPending ? "Salvataggio..." : "Salva Template Stile"}
      </Button>
    </form>
  );
}

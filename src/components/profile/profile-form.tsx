"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/profile/actions";

type ProfileFormProps = {
  defaultValues: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone: string;
    whatsapp_opt_in: boolean;
  };
};

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name" className="text-slate-200">
            Nome
          </Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={defaultValues.first_name}
            placeholder="Mario"
            className="border-slate-600 bg-slate-900/70 text-slate-50"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name" className="text-slate-200">
            Cognome
          </Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={defaultValues.last_name}
            placeholder="Rossi"
            className="border-slate-600 bg-slate-900/70 text-slate-50"
            disabled={isPending}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date_of_birth" className="text-slate-200">
          Data di nascita
        </Label>
        <Input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          defaultValue={defaultValues.date_of_birth}
          className="border-slate-600 bg-slate-900/70 text-slate-50"
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-slate-200">
          Cellulare
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone}
          placeholder="+39 333 1234567"
          className="border-slate-600 bg-slate-900/70 text-slate-50"
          disabled={isPending}
        />
      </div>
      <div className="rounded-md border border-emerald-500/30 bg-emerald-950/20 p-3">
        <label htmlFor="whatsapp_opt_in" className="flex items-start gap-3 text-sm text-slate-100/90">
          <input
            id="whatsapp_opt_in"
            name="whatsapp_opt_in"
            type="checkbox"
            defaultChecked={defaultValues.whatsapp_opt_in}
            className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900"
            disabled={isPending}
          />
          <span>
            Acconsento a restare nella community WhatsApp di Barber & Dragons per organizzazione sessioni, aggiornamenti
            utili e comunicazioni di gioco (zero spam).
          </span>
        </label>
      </div>
      <Button
        type="submit"
        disabled={isPending}
        className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      >
        {isPending ? "Salvataggio..." : "Salva"}
      </Button>
    </form>
  );
}

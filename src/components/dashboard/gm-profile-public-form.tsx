"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateGmPublicProfile } from "@/app/dashboard/settings/profile/actions";
import { Loader2, Swords, Theater, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

const LETHALITY_OPTIONS = ["Bassa", "Media", "Alta", "Implacabile"] as const;

type GmProfilePublicFormProps = {
  defaultValues: {
    username: string | null;
    bio: string | null;
    portrait_url: string | null;
    is_gm_public: boolean;
    stat_combat: number;
    stat_roleplay: number;
    stat_lethality: string;
  };
};

export function GmProfilePublicForm({ defaultValues }: GmProfilePublicFormProps) {
  const [isPending, startTransition] = useTransition();
  const [statCombat, setStatCombat] = useState(defaultValues.stat_combat);
  const [statRoleplay, setStatRoleplay] = useState(defaultValues.stat_roleplay);
  const [statLethality, setStatLethality] = useState(defaultValues.stat_lethality);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(
    defaultValues.portrait_url
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("stat_combat", String(statCombat));
    formData.set("stat_roleplay", String(statRoleplay));
    formData.set("stat_lethality", statLethality);
    startTransition(async () => {
      const result = await updateGmPublicProfile(formData);
      if (result.success) {
        toast.success(result.message);
        setPortraitPreview(null);
      } else {
        toast.error(result.message);
      }
    });
  }

  function onPortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPortraitPreview(URL.createObjectURL(file));
    } else {
      setPortraitPreview(defaultValues.portrait_url);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label className="text-barber-paper/90">Ritratto / Portrait</Label>
        <p className="text-xs text-barber-paper/60">
          Usa un&apos;immagine verticale 3:4 o 9:16. Salvata su Supabase.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {(portraitPreview || defaultValues.portrait_url) && (
            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg border border-barber-gold/30 bg-barber-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraitPreview || defaultValues.portrait_url || ""}
                alt="Anteprima ritratto"
                className="h-full w-full object-cover object-top"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Input
              type="file"
              name="portrait"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPortraitChange}
              disabled={isPending}
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-gold/20 file:px-3 file:py-1 file:text-barber-gold"
            />
            {defaultValues.portrait_url && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper/80">
                <input
                  type="checkbox"
                  name="remove_portrait"
                  disabled={isPending}
                  className="h-4 w-4 rounded border-barber-gold/50 bg-barber-dark text-barber-gold"
                />
                Rimuovi ritratto
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-barber-paper/90">
          Username (per URL pubblico)
        </Label>
        <Input
          id="username"
          name="username"
          defaultValue={defaultValues.username ?? ""}
          placeholder="es. master_drago"
          className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
          disabled={isPending}
        />
        <p className="text-xs text-barber-paper/60">
          Univoco, usato in /master/[username]. Lascia vuoto per non avere dossier pubblico.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-barber-paper/90">
          Bio
        </Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={defaultValues.bio ?? ""}
          placeholder="Presentati come narratore..."
          rows={5}
          className="min-h-[100px] resize-y border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-barber-gold/20 bg-barber-dark/50 p-4">
        <input
          type="checkbox"
          id="is_gm_public"
          name="is_gm_public"
          defaultChecked={defaultValues.is_gm_public}
          disabled={isPending}
          className="h-4 w-4 rounded border-barber-gold/50 bg-barber-dark text-barber-gold"
        />
        <Label htmlFor="is_gm_public" className="cursor-pointer text-barber-paper/90">
          Profilo pubblico visibile nell&apos;Albo dei Master
        </Label>
      </div>

      <div className="space-y-4 rounded-xl border border-barber-gold/30 bg-barber-dark/60 p-4">
        <h3 className="text-sm font-semibold text-barber-gold">Statistiche del Master</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-barber-paper/90">
              <Swords className="h-4 w-4 text-barber-gold/80" />
              Combattimento
            </Label>
            <span className="text-sm font-medium text-barber-gold">{statCombat}</span>
          </div>
          <Slider
            value={[statCombat]}
            onValueChange={([v]) => setStatCombat(v)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-barber-paper/90">
              <Theater className="h-4 w-4 text-barber-gold/80" />
              Roleplay
            </Label>
            <span className="text-sm font-medium text-barber-gold">{statRoleplay}</span>
          </div>
          <Slider
            value={[statRoleplay]}
            onValueChange={([v]) => setStatRoleplay(v)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-barber-paper/90">
            <Skull className="h-4 w-4 text-barber-gold/80" />
            Mortalità
          </Label>
          <input type="hidden" name="stat_lethality" value={statLethality} />
          <Select
            value={statLethality}
            onValueChange={setStatLethality}
            disabled={isPending}
          >
            <SelectTrigger className={cn("border-barber-gold/30 bg-barber-dark/80 text-barber-paper")}>
              <SelectValue placeholder="Mortalità" />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/20 bg-barber-dark">
              {LETHALITY_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt}
                  value={opt}
                  className="text-barber-paper focus:bg-barber-gold/20 focus:text-barber-gold"
                >
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? "Salvataggio..." : "Salva profilo pubblico"}
      </Button>
    </form>
  );
}

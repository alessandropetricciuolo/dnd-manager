"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAiImageStyleAction,
  upsertAiImageStyleAction,
  type AdminAiImageStyleRow,
} from "./actions";

type StyleManagerProps = {
  initialStyles: AdminAiImageStyleRow[];
};

type DraftStyle = Omit<AdminAiImageStyleRow, "id"> & { id?: string };

const NEW_STYLE_TEMPLATE: DraftStyle = {
  key: "",
  name: "",
  description: "",
  positive_prompt: "",
  negative_prompt: "",
  is_active: true,
  sort_order: 0,
};

export function StyleManager({ initialStyles }: StyleManagerProps) {
  const [styles, setStyles] = useState<DraftStyle[]>(initialStyles);
  const [isPending, startTransition] = useTransition();

  function updateStyle(index: number, patch: Partial<DraftStyle>) {
    setStyles((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStyle() {
    setStyles((prev) => [...prev, { ...NEW_STYLE_TEMPLATE }]);
  }

  function removeLocal(index: number) {
    setStyles((prev) => prev.filter((_, i) => i !== index));
  }

  function saveStyle(style: DraftStyle) {
    startTransition(async () => {
      const fd = new FormData();
      if (style.id) fd.set("id", style.id);
      fd.set("key", style.key);
      fd.set("name", style.name);
      fd.set("description", style.description ?? "");
      fd.set("positive_prompt", style.positive_prompt);
      fd.set("negative_prompt", style.negative_prompt ?? "");
      fd.set("is_active", String(style.is_active));
      fd.set("sort_order", String(style.sort_order ?? 0));
      const result = await upsertAiImageStyleAction(fd);
      result.success ? toast.success(result.message) : toast.error(result.message);
    });
  }

  function deleteStyle(style: DraftStyle, index: number) {
    if (!style.id) {
      removeLocal(index);
      return;
    }
    if (!confirm(`Eliminare lo stile "${style.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteAiImageStyleAction(style.id!);
      if (result.success) {
        toast.success(result.message);
        removeLocal(index);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={addStyle}
          className="bg-violet-600 text-white hover:bg-violet-500"
          disabled={isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuovo stile
        </Button>
      </div>

      <div className="space-y-4">
        {styles.map((style, index) => (
          <article key={style.id ?? `new-${index}`} className="space-y-3 rounded-xl border border-barber-gold/25 bg-barber-dark/70 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={style.name}
                  onChange={(e) => updateStyle(index, { name: e.target.value })}
                  placeholder="Dark Fantasy"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <Label>Chiave (slug)</Label>
                <Input
                  value={style.key}
                  onChange={(e) => updateStyle(index, { key: e.target.value })}
                  placeholder="dark_fantasy"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <Label>Ordinamento</Label>
                <Input
                  type="number"
                  value={style.sort_order}
                  onChange={(e) => updateStyle(index, { sort_order: Number(e.target.value || 0) })}
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descrizione (opzionale)</Label>
              <Input
                value={style.description ?? ""}
                onChange={(e) => updateStyle(index, { description: e.target.value })}
                placeholder="Toni cupi, drammatici e medievali"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <Label>Prompt positivo</Label>
              <Textarea
                value={style.positive_prompt}
                onChange={(e) => updateStyle(index, { positive_prompt: e.target.value })}
                className="min-h-[120px] resize-y"
                disabled={isPending}
              />
            </div>

            <div className="space-y-1">
              <Label>Prompt negativo (opzionale)</Label>
              <Textarea
                value={style.negative_prompt ?? ""}
                onChange={(e) => updateStyle(index, { negative_prompt: e.target.value })}
                className="min-h-[90px] resize-y"
                disabled={isPending}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-barber-paper/85">
                <input
                  type="checkbox"
                  checked={style.is_active}
                  onChange={(e) => updateStyle(index, { is_active: e.target.checked })}
                  disabled={isPending}
                />
                Stile attivo
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => deleteStyle(style, index)} disabled={isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina
                </Button>
                <Button type="button" onClick={() => saveStyle(style)} disabled={isPending} className="bg-violet-600 text-white hover:bg-violet-500">
                  <Save className="mr-2 h-4 w-4" />
                  Salva
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

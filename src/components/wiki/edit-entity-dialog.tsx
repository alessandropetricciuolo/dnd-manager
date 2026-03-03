"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateEntity } from "@/app/campaigns/wiki-actions";
import { getEmptyAttributes } from "@/types/wiki";
import type { WikiEntity } from "@/app/campaigns/wiki-actions";

const ENTITY_TYPES = [
  { value: "npc", label: "NPC" },
  { value: "location", label: "Luogo" },
  { value: "monster", label: "Mostro" },
  { value: "item", label: "Oggetto" },
  { value: "lore", label: "Lore" },
] as const;

type EntityType = (typeof ENTITY_TYPES)[number]["value"];

type EditEntityDialogProps = {
  campaignId: string;
  entity: WikiEntity;
  contentBody: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const defaultAttributes = (type: EntityType) =>
  getEmptyAttributes(type) as Record<string, unknown>;

function mergeAttributes(
  type: EntityType,
  existing: Record<string, unknown> | null
): Record<string, unknown> {
  const def = defaultAttributes(type);
  if (!existing || typeof existing !== "object") return def;
  const merged = { ...def };
  for (const [k, v] of Object.entries(existing)) {
    if (v !== undefined && v !== null) {
      if (typeof v === "object" && !Array.isArray(v) && merged[k] && typeof merged[k] === "object") {
        (merged as Record<string, unknown>)[k] = { ...(merged[k] as object), ...(v as object) };
      } else {
        (merged as Record<string, unknown>)[k] = v;
      }
    }
  }
  return merged;
}

export function EditEntityDialog({
  campaignId,
  entity,
  contentBody,
  open,
  onOpenChange,
}: EditEntityDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<EntityType>((entity.type as EntityType) || "npc");
  const [attributes, setAttributes] = useState<Record<string, unknown>>(() =>
    mergeAttributes((entity.type as EntityType) || "npc", entity.attributes)
  );
  const [sortOrder, setSortOrder] = useState<string>(
    entity.sort_order != null ? String(entity.sort_order) : ""
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setType((entity.type as EntityType) || "npc");
      setAttributes(mergeAttributes((entity.type as EntityType) || "npc", entity.attributes));
      setSortOrder(entity.sort_order != null ? String(entity.sort_order) : "");
      setPreview(null);
      setRemoveImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, entity.type, entity.attributes, entity.sort_order]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setRemoveImage(false);
  }

  function onTypeChange(newType: string) {
    const t = newType as EntityType;
    setType(t);
    setAttributes(defaultAttributes(t));
    setSortOrder("");
  }

  function setAttr(path: string, value: unknown) {
    setAttributes((prev) => {
      const next = { ...prev };
      if (path.includes(".")) {
        const [key, sub] = path.split(".");
        const obj = (next[key] as Record<string, unknown>) ?? {};
        (next as Record<string, unknown>)[key] = { ...obj, [sub]: value };
      } else {
        (next as Record<string, unknown>)[path] = value;
      }
      return next;
    });
  }

  function getAttr(path: string): string {
    const parts = path.split(".");
    let v: unknown = attributes;
    for (const p of parts) v = (v as Record<string, unknown>)?.[p];
    return String(v ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("attributes", JSON.stringify(attributes));
    if (sortOrder.trim() !== "") formData.set("sort_order", sortOrder.trim());
    if (removeImage) formData.set("remove_image", "on");

    setIsLoading(true);
    try {
      const result = await updateEntity(entity.id, campaignId, formData);

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
    onOpenChange(next);
  }

  const currentImageUrl = preview ? null : entity.image_url;
  const showCurrentImage = currentImageUrl && !removeImage;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Modifica voce wiki</DialogTitle>
          <DialogDescription className="text-slate-400">
            Modifica titolo, contenuto, immagine e attributi della voce.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-entity-title">Titolo</Label>
            <Input
              id="edit-entity-title"
              name="title"
              defaultValue={entity.name}
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-entity-type">Tipo</Label>
            <select
              id="edit-entity-type"
              name="type"
              required
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            >
              {ENTITY_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-entity-image">
              <ImageIcon className="mr-1.5 inline h-4 w-4" />
              Immagine
            </Label>
            {showCurrentImage && (
              <div className="relative mb-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                <Image
                  src={currentImageUrl}
                  alt="Attuale"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <Input
              id="edit-entity-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="bg-slate-900/70 border-slate-700 text-slate-50 file:mr-2 file:rounded file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-slate-950"
              disabled={isLoading}
              ref={fileInputRef}
              onChange={onFileChange}
            />
            {preview && (
              <div className="relative mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                <Image src={preview} alt="Nuova" fill className="object-contain" unoptimized />
              </div>
            )}
            {(entity.image_url || preview) && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-remove-image"
                  checked={removeImage}
                  onChange={(e) => setRemoveImage(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                />
                <Label htmlFor="edit-remove-image" className="text-slate-400">
                  Rimuovi immagine
                </Label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-entity-content">
              {type === "lore" ? "Testo" : "Storia / Descrizione"}
            </Label>
            <Textarea
              id="edit-entity-content"
              name="content"
              defaultValue={contentBody}
              className="min-h-[120px] resize-y bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
            />
          </div>

          {type === "npc" && (
            <>
              <div className="space-y-2">
                <Label>Rapporti interpersonali</Label>
                <Textarea
                  value={getAttr("relationships")}
                  onChange={(e) => setAttr("relationships", e.target.value)}
                  className="min-h-[80px] resize-y bg-slate-900/70 border-slate-700 text-slate-50"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Loot</Label>
                <Textarea
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  className="min-h-[60px] resize-y bg-slate-900/70 border-slate-700 text-slate-50"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "location" && (
            <div className="space-y-2">
              <Label>Loot</Label>
              <Textarea
                value={getAttr("loot")}
                onChange={(e) => setAttr("loot", e.target.value)}
                className="min-h-[80px] resize-y bg-slate-900/70 border-slate-700 text-slate-50"
                disabled={isLoading}
              />
            </div>
          )}

          {type === "monster" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>HP</Label>
                  <Input
                    value={getAttr("combat_stats.hp")}
                    onChange={(e) => setAttr("combat_stats.hp", e.target.value)}
                    className="bg-slate-900/70 border-slate-700 text-slate-50"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>AC</Label>
                  <Input
                    value={getAttr("combat_stats.ac")}
                    onChange={(e) => setAttr("combat_stats.ac", e.target.value)}
                    className="bg-slate-900/70 border-slate-700 text-slate-50"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CR</Label>
                  <Input
                    value={getAttr("combat_stats.cr")}
                    onChange={(e) => setAttr("combat_stats.cr", e.target.value)}
                    className="bg-slate-900/70 border-slate-700 text-slate-50"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Attacchi / Azioni speciali</Label>
                <Textarea
                  value={getAttr("combat_stats.attacks")}
                  onChange={(e) => setAttr("combat_stats.attacks", e.target.value)}
                  className="min-h-[80px] resize-y bg-slate-900/70 border-slate-700 text-slate-50"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Loot</Label>
                <Textarea
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  className="min-h-[60px] resize-y bg-slate-900/70 border-slate-700 text-slate-50"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "lore" && (
            <>
              <div className="space-y-2">
                <Label>Numero capitolo</Label>
                <Input
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="bg-slate-900/70 border-slate-700 text-slate-50"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Riassunto</Label>
                <Textarea
                  value={getAttr("summary")}
                  onChange={(e) => setAttr("summary", e.target.value)}
                  className="min-h-[80px] resize-y bg-slate-900/70 border-slate-700 text-slate-50"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-entity-secret"
              name="is_secret"
              value="on"
              defaultChecked={entity.is_secret}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              disabled={isLoading}
            />
            <Label htmlFor="edit-entity-secret" className="cursor-pointer text-slate-300">
              Segreto
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-slate-600 text-slate-300"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              {isLoading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { ImageSourceField } from "@/components/ui/image-source-field";
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
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (open) {
      setType((entity.type as EntityType) || "npc");
      setAttributes(mergeAttributes((entity.type as EntityType) || "npc", entity.attributes));
      setSortOrder(entity.sort_order != null ? String(entity.sort_order) : "");
      setRemoveImage(false);
    }
  }, [open, entity.type, entity.attributes, entity.sort_order]);

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
    onOpenChange(next);
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Modifica voce wiki</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
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
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
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
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
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
            <ImageSourceField
              fileInputName="image"
              urlFieldName="image_url"
              label="Immagine"
              previewUrl={removeImage ? undefined : entity.image_url}
              disabled={isLoading}
              previewClassName="max-w-xs"
            />
            {entity.image_url && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-remove-image"
                  name="remove_image"
                  checked={removeImage}
                  onChange={(e) => setRemoveImage(e.target.checked)}
                  className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                />
                <Label htmlFor="edit-remove-image" className="text-barber-paper/70">
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
              className="min-h-[120px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
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
                  className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Loot</Label>
                <Textarea
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  className="min-h-[60px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
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
                className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
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
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>AC</Label>
                  <Input
                    value={getAttr("combat_stats.ac")}
                    onChange={(e) => setAttr("combat_stats.ac", e.target.value)}
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CR</Label>
                  <Input
                    value={getAttr("combat_stats.cr")}
                    onChange={(e) => setAttr("combat_stats.cr", e.target.value)}
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Attacchi / Azioni speciali</Label>
                <Textarea
                  value={getAttr("combat_stats.attacks")}
                  onChange={(e) => setAttr("combat_stats.attacks", e.target.value)}
                  className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Loot</Label>
                <Textarea
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  className="min-h-[60px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
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
                  className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Riassunto</Label>
                <Textarea
                  value={getAttr("summary")}
                  onChange={(e) => setAttr("summary", e.target.value)}
                  className="min-h-[80px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
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
              className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold focus:ring-barber-gold"
              disabled={isLoading}
            />
            <Label htmlFor="edit-entity-secret" className="cursor-pointer text-barber-paper/80">
              Segreto
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-barber-gold/40 text-barber-paper/80"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              {isLoading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

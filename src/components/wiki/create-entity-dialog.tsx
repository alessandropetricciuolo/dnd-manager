"use client";

import { useState, useRef, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEntity } from "@/app/campaigns/wiki-actions";
import { getEmptyAttributes } from "@/types/wiki";

const ENTITY_TYPES = [
  { value: "npc", label: "NPC" },
  { value: "location", label: "Luogo" },
  { value: "monster", label: "Mostro" },
  { value: "item", label: "Oggetto" },
  { value: "lore", label: "Lore" },
] as const;

type EntityType = (typeof ENTITY_TYPES)[number]["value"];

type CreateEntityDialogProps = {
  campaignId: string;
};

const defaultAttributes = (type: EntityType) =>
  getEmptyAttributes(type) as Record<string, unknown>;

export function CreateEntityDialog({ campaignId }: CreateEntityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<EntityType>("npc");
  const [attributes, setAttributes] = useState<Record<string, unknown>>(defaultAttributes("npc"));
  const [sortOrder, setSortOrder] = useState<string>("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    formData.set("campaign_id", campaignId);
    formData.set("attributes", JSON.stringify(attributes));
    if (sortOrder.trim() !== "") formData.set("sort_order", sortOrder.trim());

    setIsLoading(true);
    try {
      const result = await createEntity(campaignId, formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        form.reset();
        setType("npc");
        setAttributes(defaultAttributes("npc"));
        setSortOrder("");
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Nuova voce
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Nuova voce wiki</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Aggiungi un NPC, un luogo, un mostro, un oggetto o una voce di lore.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entity-title">Titolo</Label>
            <Input
              id="entity-title"
              name="title"
              placeholder="Es. Taverna del Drago"
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity-type">Tipo</Label>
            <select
              id="entity-type"
              name="type"
              required
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
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
            <Label htmlFor="entity-image">
              <ImageIcon className="mr-1.5 inline h-4 w-4" />
              Immagine (opzionale)
            </Label>
            <Input
              id="entity-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="bg-barber-dark border-barber-gold/30 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-red file:px-3 file:py-1 file:text-barber-paper"
              disabled={isLoading}
              ref={fileInputRef}
              onChange={onFileChange}
            />
            {preview && (
              <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg border border-barber-gold/30 bg-barber-dark">
                <Image
                  src={preview}
                  alt="Anteprima"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* Contenuto principale (storia/descrizione) */}
          <div className="space-y-2">
            <Label htmlFor="entity-content">
              {type === "lore" ? "Testo" : "Storia / Descrizione"}
            </Label>
            <Textarea
              id="entity-content"
              name="content"
              placeholder="Descrizione in Markdown..."
              className="min-h-[120px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          {/* Campi dinamici per tipo */}
          {type === "npc" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="attr-relationships">Rapporti interpersonali</Label>
                <Textarea
                  id="attr-relationships"
                  value={getAttr("relationships")}
                  onChange={(e) => setAttr("relationships", e.target.value)}
                  placeholder="Relazioni con altri NPC, fazioni..."
                  className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-loot-npc">Loot</Label>
                <Textarea
                  id="attr-loot-npc"
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  placeholder="Oggetti che può avere o lasciare..."
                  className="min-h-[60px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "location" && (
            <div className="space-y-2">
              <Label htmlFor="attr-loot-location">Loot</Label>
              <Textarea
                id="attr-loot-location"
                value={getAttr("loot")}
                onChange={(e) => setAttr("loot", e.target.value)}
                placeholder="Tesori nascosti, oggetti nel luogo..."
                className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
          )}

          {type === "monster" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="attr-hp">HP</Label>
                  <Input
                    id="attr-hp"
                    value={getAttr("combat_stats.hp")}
                    onChange={(e) => setAttr("combat_stats.hp", e.target.value)}
                    placeholder="Es. 45"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr-ac">AC</Label>
                  <Input
                    id="attr-ac"
                    value={getAttr("combat_stats.ac")}
                    onChange={(e) => setAttr("combat_stats.ac", e.target.value)}
                    placeholder="Es. 15"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attr-cr">CR (Grado di Sfida)</Label>
                  <Input
                    id="attr-cr"
                    value={getAttr("combat_stats.cr")}
                    onChange={(e) => setAttr("combat_stats.cr", e.target.value)}
                    placeholder="Es. 2"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-attacks">Attacchi / Azioni speciali</Label>
                <Textarea
                  id="attr-attacks"
                  value={getAttr("combat_stats.attacks")}
                  onChange={(e) => setAttr("combat_stats.attacks", e.target.value)}
                  placeholder="Descrizione attacchi e azioni..."
                  className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-loot-monster">Loot</Label>
                <Textarea
                  id="attr-loot-monster"
                  value={getAttr("loot")}
                  onChange={(e) => setAttr("loot", e.target.value)}
                  placeholder="Tesoro che può lasciare..."
                  className="min-h-[60px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {type === "lore" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="entity-sort-order">Numero capitolo</Label>
                <Input
                  id="entity-sort-order"
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="Es. 1 (per ordinare come Capitolo 1)"
                  className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
                <p className="text-xs text-barber-paper/60">
                  Opzionale. Usato per mostrare le voci Lore come indice (Capitolo 1, 2, 3...).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attr-summary">Riassunto</Label>
                <Textarea
                  id="attr-summary"
                  value={getAttr("summary")}
                  onChange={(e) => setAttr("summary", e.target.value)}
                  placeholder="Breve riassunto (box collassabile nella lettura)..."
                  className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="entity-secret"
              name="is_secret"
              value="on"
              className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold focus:ring-barber-gold"
              disabled={isLoading}
            />
            <Label htmlFor="entity-secret" className="cursor-pointer text-barber-paper/80">
              Segreto (solo il GM può vedere questa voce)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
              {isLoading ? "Creazione..." : "Crea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

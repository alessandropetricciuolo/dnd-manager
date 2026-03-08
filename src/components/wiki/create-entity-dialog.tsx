"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
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
import { ImageSourceField } from "@/components/ui/image-source-field";
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

const VISIBILITY_OPTIONS = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
] as const;

type CreateEntityDialogProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  eligiblePlayers?: { id: string; label: string }[];
};

const defaultAttributes = (type: EntityType) =>
  getEmptyAttributes(type) as Record<string, unknown>;

export function CreateEntityDialog({
  campaignId,
  campaignType,
  eligiblePlayers = [],
}: CreateEntityDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState<EntityType>("npc");
  const [attributes, setAttributes] = useState<Record<string, unknown>>(defaultAttributes("npc"));
  const [sortOrder, setSortOrder] = useState<string>("");
  const [visibility, setVisibility] = useState<string>("public");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isCore, setIsCore] = useState(false);
  const showCoreCheckbox = campaignType === "long" && (type === "npc" || type === "monster");

  function onTypeChange(newType: string) {
    const t = newType as EntityType;
    setType(t);
    const next = defaultAttributes(t) as Record<string, unknown>;
    const currentGmNotes = attributes.gm_notes ?? "";
    if (typeof currentGmNotes === "string") next.gm_notes = currentGmNotes;
    setAttributes(next);
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
    formData.set("visibility", visibility);
    formData.set("allowed_user_ids", JSON.stringify(visibility === "selective" ? selectedPlayerIds : []));
    if (sortOrder.trim() !== "") formData.set("sort_order", sortOrder.trim());
    if (showCoreCheckbox && isCore) formData.set("is_core", "on");

    setIsLoading(true);
    try {
      const result = await createEntity(campaignId, formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
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
      <DialogContent className="flex max-h-[90vh] flex-col gap-2 border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader className="shrink-0">
          <DialogTitle>Nuova voce wiki</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Aggiungi un NPC, un luogo, un mostro, un oggetto o una voce di lore.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-scroll overflow-x-hidden py-1 pr-1">
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

          {showCoreCheckbox && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="entity-is-core"
                checked={isCore}
                onChange={(e) => setIsCore(e.target.checked)}
                className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
              />
              <Label htmlFor="entity-is-core" className="text-barber-paper/90">
                NPC/Mostro Core (stato vita/morte condiviso nella campagna)
              </Label>
            </div>
          )}

          <ImageSourceField
            fileInputName="image"
            urlFieldName="image_url"
            label="Immagine (opzionale)"
            disabled={isLoading}
          />

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

          <div className="space-y-2">
            <Label>Visibilità</Label>
            <select
              name="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 py-2 text-barber-paper"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {visibility === "selective" && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-barber-gold/30 bg-barber-dark/60 p-2">
                <p className="mb-2 text-xs font-medium text-barber-paper/80">Giocatori che possono vedere questa voce</p>
                {eligiblePlayers.length === 0 ? (
                  <p className="text-xs text-barber-paper/50">Nessun giocatore iscritto alla campagna.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {eligiblePlayers.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper">
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.includes(p.id)}
                          onChange={() =>
                            setSelectedPlayerIds((prev) =>
                              prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                            )
                          }
                          className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity-gm-notes" className="text-barber-gold/90">
              Note GM (solo visibili a te e agli admin)
            </Label>
            <Textarea
              id="entity-gm-notes"
              value={getAttr("gm_notes")}
              onChange={(e) => setAttr("gm_notes", e.target.value)}
              placeholder="Appunti, reminder, idee per la sessione..."
              className="min-h-[80px] resize-y bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/40"
              disabled={isLoading}
            />
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-barber-gold/20 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="border-barber-gold/40 text-barber-paper/80"
            >
              Annulla
            </Button>
            <SubmitButton
              pending={isLoading}
              loadingText="Creazione..."
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              Crea
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

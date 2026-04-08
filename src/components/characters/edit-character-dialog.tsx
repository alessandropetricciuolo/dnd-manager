"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { FileText, User } from "lucide-react";

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
import { ImageSourceField } from "@/components/ui/image-source-field";
import { Textarea } from "@/components/ui/textarea";
import { updateCharacter } from "@/app/campaigns/character-actions";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { CharacterBuildFormFields } from "@/components/characters/character-build-form-fields";

const MAX_TOTAL_MB = 4;
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;

type EditCharacterDialogProps = {
  character: CampaignCharacterRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLongCampaign?: boolean;
};

export function EditCharacterDialog({
  character,
  open,
  onOpenChange,
  isLongCampaign = false,
}: EditCharacterDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [removeSheet, setRemoveSheet] = useState(false);

  useEffect(() => {
    if (open) {
      setRemoveImage(false);
      setRemoveSheet(false);
      if (sheetInputRef.current) sheetInputRef.current.value = "";
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string | null)?.trim();
    if (!name) {
      toast.error("Il nome del personaggio è obbligatorio.");
      return;
    }
    const levelRaw = (formData.get("level") as string | null)?.trim() || "";
    if (levelRaw) {
      const nextLevel = Number.parseInt(levelRaw, 10);
      if (Number.isNaN(nextLevel) || nextLevel < 1 || nextLevel > 20) {
        toast.error("Livello non valido (1-20).");
        return;
      }
      if (nextLevel < (character.level ?? 1)) {
        toast.error("Puoi solo aumentare manualmente il livello.");
        return;
      }
      const classSubclass = (formData.get("class_subclass") as string | null)?.trim() || "";
      if (nextLevel >= 3 && !classSubclass) {
        toast.error("Dal livello 3 in poi seleziona una sottoclasse.");
        return;
      }
    }

    const imageFile = formData.get("image") as File | null;
    const imageUrl = (formData.get("image_url") as string | null)?.trim() || null;
    const sheetFile = formData.get("sheet") as File | null;
    const hasNewImage = (imageFile && imageFile instanceof File && imageFile.size > 0) || !!imageUrl;
    const hasImage = hasNewImage || (character.image_url && !removeImage);
    if (!hasImage) {
      toast.error("Inserisci un avatar: carica un file, incolla un URL o mantieni quello attuale.");
      return;
    }

    if (removeImage) formData.set("remove_image", "on");
    if (removeSheet) formData.set("remove_sheet", "on");

    let totalBytes = 0;
    if (imageFile?.size) totalBytes += imageFile.size;
    if (sheetFile?.size) totalBytes += sheetFile.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      toast.error(`Immagine + PDF non devono superare i ${MAX_TOTAL_MB} MB totali.`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateCharacter(character.id, character.campaign_id, formData);
      if (result.success) {
        toast.success("Personaggio aggiornato.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore durante l'aggiornamento.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Modifica personaggio</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Modifica nome, classe, statistiche di combattimento, avatar, scheda PDF e background. L&apos;assegnazione al giocatore si gestisce dalla card.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-char-name">
              <User className="mr-1.5 inline h-4 w-4" />
              Nome
            </Label>
            <Input
              id="edit-char-name"
              name="name"
              required
              defaultValue={character.name}
              placeholder="Es. Aelar il Saggio"
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <CharacterBuildFormFields
            disabled={isLoading}
            initialRaceSlug={character.race_slug}
            initialSubclassSlug={character.subclass_slug}
            initialClassSubclass={character.class_subclass}
            initialBackgroundSlug={character.background_slug}
            initialClassLabel={character.character_class}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-char-level">Livello</Label>
              <Input
                id="edit-char-level"
                name="level"
                type="number"
                min={1}
                max={20}
                defaultValue={character.level ?? 1}
                className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
              <p className="text-[11px] text-barber-paper/60">
                Aumento manuale: dal livello 3 richiede una sottoclasse.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-char-ac">CA</Label>
              <Input
                id="edit-char-ac"
                name="armor_class"
                type="number"
                min={0}
                defaultValue={character.armor_class ?? ""}
                placeholder="Es. 15"
                className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-char-hp">PF</Label>
              <Input
                id="edit-char-hp"
                name="hit_points"
                type="number"
                min={0}
                defaultValue={character.hit_points ?? ""}
                placeholder="Es. 24"
                className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
          </div>

          {isLongCampaign && (
            <div className="space-y-2 rounded-lg border border-barber-gold/25 bg-barber-dark/50 p-3">
              <p className="text-xs font-medium text-barber-gold">Ricchezza (campagna lunga)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-char-coins-gp" className="text-[11px] text-barber-paper/80">
                    Oro
                  </Label>
                  <Input
                    id="edit-char-coins-gp"
                    name="coins_gp"
                    type="number"
                    min={0}
                    defaultValue={character.coins_gp ?? 0}
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-char-coins-sp" className="text-[11px] text-barber-paper/80">
                    Argento
                  </Label>
                  <Input
                    id="edit-char-coins-sp"
                    name="coins_sp"
                    type="number"
                    min={0}
                    defaultValue={character.coins_sp ?? 0}
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-char-coins-cp" className="text-[11px] text-barber-paper/80">
                    Rame
                  </Label>
                  <Input
                    id="edit-char-coins-cp"
                    name="coins_cp"
                    type="number"
                    min={0}
                    defaultValue={character.coins_cp ?? 0}
                    className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          <ImageSourceField
            fileInputName="image"
            urlFieldName="image_url"
            label="Avatar (immagine)"
            disabled={isLoading}
            previewClassName="aspect-[200/280] w-32"
            previewUrl={removeImage ? undefined : character.image_url ?? undefined}
          />
          {character.image_url && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-char-remove-image"
                checked={removeImage}
                onChange={(e) => setRemoveImage(e.target.checked)}
                className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                disabled={isLoading}
              />
              <Label htmlFor="edit-char-remove-image" className="text-barber-paper/70">
                Rimuovi immagine attuale
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-char-sheet">
              <FileText className="mr-1.5 inline h-4 w-4" />
              Scheda tecnica (PDF)
            </Label>
            <Input
              id="edit-char-sheet"
              name="sheet"
              type="file"
              accept="application/pdf"
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-red file:px-3 file:py-1 file:text-barber-paper"
              disabled={isLoading}
              ref={sheetInputRef}
            />
            <p className="text-xs text-barber-paper/60">
              Oppure inserisci un link alla scheda PDF. Lascia vuoto per mantenere l&apos;attuale.
            </p>
            <Input
              id="edit-char-sheet-url"
              name="sheet_url"
              type="url"
              placeholder="https://..."
              defaultValue={character.sheet_url?.startsWith("http") ? character.sheet_url : ""}
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/40"
              disabled={isLoading}
            />
            {character.sheet_url && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-char-remove-sheet"
                  name="remove_sheet"
                  checked={removeSheet}
                  onChange={(e) => setRemoveSheet(e.target.checked)}
                  className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                  disabled={isLoading}
                />
                <Label htmlFor="edit-char-remove-sheet" className="text-barber-paper/70">
                  Rimuovi scheda PDF attuale
                </Label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-char-background">Background / Storia</Label>
            <Textarea
              id="edit-char-background"
              name="background"
              defaultValue={character.background ?? ""}
              placeholder="Storia del personaggio, tratti, note..."
              className="min-h-[120px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
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

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, FileText, User } from "lucide-react";

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
import { createCharacter } from "@/app/campaigns/character-actions";

const PLACEHOLDER_AVATAR = "https://placehold.co/200x280/1c1917/fbbf24/png?text=PG";
const MAX_TOTAL_MB = 4;
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;

type CreateCharacterDialogProps = {
  campaignId: string;
};

export function CreateCharacterDialog({ campaignId }: CreateCharacterDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    const imageFile = formData.get("image") as File | null;
    const sheetFile = formData.get("sheet") as File | null;
    let totalBytes = 0;
    if (imageFile?.size) totalBytes += imageFile.size;
    if (sheetFile?.size) totalBytes += sheetFile.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      toast.error(`Immagine + PDF non devono superare i ${MAX_TOTAL_MB} MB totali. Riduci le dimensioni e riprova.`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCharacter(campaignId, formData);
      if (result.success) {
        toast.success("Personaggio creato.");
        setOpen(false);
        setPreview(null);
        form.reset();
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (sheetInputRef.current) sheetInputRef.current.value = "";
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Errore durante la creazione.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="border-barber-gold/50 bg-barber-dark text-barber-gold hover:bg-barber-gold/10">
          <User className="mr-2 h-4 w-4" />
          Nuovo personaggio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Nuovo personaggio</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Inserisci nome, avatar, scheda tecnica (PDF) e background. L&apos;assegnazione al giocatore potrai farla dalla griglia.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="char-name">
              <User className="mr-1.5 inline h-4 w-4" />
              Nome
            </Label>
            <Input
              id="char-name"
              name="name"
              required
              placeholder="Es. Aelar il Saggio"
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="char-image">
              <ImageIcon className="mr-1.5 inline h-4 w-4" />
              Avatar (immagine)
            </Label>
            <Input
              id="char-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-red file:px-3 file:py-1 file:text-barber-paper"
              disabled={isLoading}
              ref={imageInputRef}
              onChange={onImageChange}
            />
            {preview && (
              <div className="relative mt-2 aspect-[200/280] w-32 overflow-hidden rounded-lg border border-barber-gold/30 bg-barber-dark">
                <Image src={preview} alt="Anteprima" fill className="object-cover" unoptimized />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="char-sheet">
              <FileText className="mr-1.5 inline h-4 w-4" />
              Scheda tecnica (PDF)
            </Label>
            <Input
              id="char-sheet"
              name="sheet"
              type="file"
              accept="application/pdf"
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper file:mr-2 file:rounded file:border-0 file:bg-barber-red file:px-3 file:py-1 file:text-barber-paper"
              disabled={isLoading}
              ref={sheetInputRef}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="char-background">Background / Storia</Label>
            <Textarea
              id="char-background"
              name="background"
              placeholder="Storia del personaggio, tratti, note..."
              className="min-h-[120px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
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
              {isLoading ? "Creazione..." : "Crea personaggio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageSourceField } from "@/components/ui/image-source-field";
import { Textarea } from "@/components/ui/textarea";
import { createCharacter } from "@/app/campaigns/character-actions";
import { CharacterBuildFormFields } from "@/components/characters/character-build-form-fields";
import { backgroundBySlug } from "@/lib/character-build-catalog";

const MAX_TOTAL_MB = 4;
const MAX_TOTAL_BYTES = MAX_TOTAL_MB * 1024 * 1024;
const CREATE_CHARACTER_DRAFT_KEY_PREFIX = "create-character-draft";
const CREATE_CHARACTER_GENERATED_SHEET_KEY_PREFIX = "create-character-generated-sheet";

function parseDraftStrings(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

type StoredGeneratedSheet = {
  pdfBase64: string;
  fileName: string;
  armorClass: number;
  hitPoints: number;
  /** Presente se salvato dal generatore recente: consente di rigenerare il PDF con lo story in creazione PG. */
  sheetData?: Record<string, unknown>;
};

function parseStoredGeneratedSheet(raw: string | null): StoredGeneratedSheet | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      pdfBase64?: string;
      fileName?: string;
      armorClass?: number;
      hitPoints?: number;
      sheetData?: unknown;
    };
    if (
      typeof parsed.pdfBase64 === "string" &&
      typeof parsed.fileName === "string" &&
      typeof parsed.armorClass === "number" &&
      typeof parsed.hitPoints === "number" &&
      parsed.pdfBase64.length > 0
    ) {
      const sheetData =
        parsed.sheetData != null &&
        typeof parsed.sheetData === "object" &&
        !Array.isArray(parsed.sheetData)
          ? (parsed.sheetData as Record<string, unknown>)
          : undefined;
      return {
        pdfBase64: parsed.pdfBase64,
        fileName: parsed.fileName,
        armorClass: parsed.armorClass,
        hitPoints: parsed.hitPoints,
        sheetData,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Allineato al generatore scheda (nome · classe liv. 1 · Background: …). */
function buildStoryContextLineFromForm(fd: FormData): string {
  const characterName = (fd.get("name") as string | null)?.trim() ?? "";
  const classLabel = (fd.get("character_class") as string | null)?.trim() ?? "";
  const bgSlug = (fd.get("background_slug") as string | null)?.trim() ?? "";
  const bgEntry = backgroundBySlug(bgSlug);
  const classPart = [classLabel, "liv. 1"].filter(Boolean).join(" ");
  const bgLine = bgEntry?.label?.trim() ? `Background: ${bgEntry.label}` : "";
  return [characterName, classPart, bgLine].filter(Boolean).join(" · ");
}

type CreateCharacterDialogProps = {
  campaignId: string;
  initialOpen?: boolean;
};

export function CreateCharacterDialog({ campaignId, initialOpen = false }: CreateCharacterDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(!!initialOpen);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const draftStorageKey = `${CREATE_CHARACTER_DRAFT_KEY_PREFIX}:${campaignId}`;
  const generatedSheetStorageKey = `${CREATE_CHARACTER_GENERATED_SHEET_KEY_PREFIX}:${campaignId}`;

  /**
   * Snapshot testuale da localStorage quando il dialog è aperto.
   * Serve a `key` del form e alle props iniziali: i Select di CharacterBuildFormFields sono controllati da React
   * — impostare solo i campi hidden via DOM non basta (il prossimo render li resetta).
   */
  const draftRawStored = useMemo(
    () => (open && typeof window !== "undefined" ? localStorage.getItem(draftStorageKey) : null),
    [open, draftStorageKey]
  );
  const generatedSheetRawStored = useMemo(
    () => (open && typeof window !== "undefined" ? localStorage.getItem(generatedSheetStorageKey) : null),
    [open, generatedSheetStorageKey]
  );

  const formSeed = useMemo(() => {
    if (!open) return null;
    const draft = parseDraftStrings(draftRawStored);
    const generated = parseStoredGeneratedSheet(generatedSheetRawStored);
    return { draft, generated };
  }, [open, draftRawStored, generatedSheetRawStored]);

  /** Remount del form quando cambia il draft o il PDF generato (solo prefisso/buste, mai l'intero base64). */
  const formMountSignature = useMemo(() => {
    if (!open) return "closed";
    const d = draftRawStored?.length ?? 0;
    const g = generatedSheetRawStored?.length ?? 0;
    const head = draftRawStored?.slice(0, 96) ?? "";
    return `${d}-${g}-${head}`;
  }, [open, draftRawStored, generatedSheetRawStored]);

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  function persistDraftFromForm(form: HTMLFormElement) {
    try {
      const fd = new FormData(form);
      const payload: Record<string, string> = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === "string") payload[k] = v;
      }
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    } catch {
      // ignore draft persistence failures
    }
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
    const imageUrl = (formData.get("image_url") as string | null)?.trim() || null;
    const sheetFile = formData.get("sheet") as File | null;
    const hasImage = (imageFile && imageFile instanceof File && imageFile.size > 0) || !!imageUrl;
    if (!hasImage) {
      toast.error("Inserisci un avatar: carica un file o incolla un URL immagine.");
      return;
    }
    let totalBytes = 0;
    if (imageFile?.size) totalBytes += imageFile.size;
    if (sheetFile?.size) totalBytes += sheetFile.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      toast.error(`Immagine + PDF non devono superare i ${MAX_TOTAL_MB} MB totali. Riduci le dimensioni e riprova.`);
      return;
    }

    setIsLoading(true);
    try {
      const sheetUrl = (formData.get("sheet_url") as string | null)?.trim() || "";
      const background = (formData.get("background") as string | null)?.trim() ?? "";
      const gen = formSeed?.generated;
      if (gen && (!sheetFile || sheetFile.size === 0) && !sheetUrl) {
        let pdfBase64 = gen.pdfBase64;
        if (gen.sheetData && background) {
          try {
            const pdfRes = await fetch("/api/sheet-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fields: gen.sheetData,
                fileName: gen.fileName,
                storyText: background,
                storyContextLine: buildStoryContextLineFromForm(formData),
              }),
            });
            if (pdfRes.ok) {
              const ab = await pdfRes.arrayBuffer();
              pdfBase64 = arrayBufferToBase64(ab);
            } else {
              const err = (await pdfRes.json().catch(() => ({}))) as { error?: string };
              toast.error(
                err.error ?? "PDF con storia non generato; viene usata la scheda salvata dal generatore."
              );
            }
          } catch {
            toast.error("Errore di rete; viene usata la scheda salvata dal generatore.");
          }
        }
        formData.set("generated_sheet_pdf_base64", pdfBase64);
        formData.set("generated_sheet_file_name", gen.fileName);
        formData.set("generated_sheet_armor_class", String(gen.armorClass));
        formData.set("generated_sheet_hit_points", String(gen.hitPoints));
      }
      const result = await createCharacter(campaignId, formData);
      if (result.success) {
        toast.success("Personaggio creato.");
        setOpen(false);
        form.reset();
        if (sheetInputRef.current) sheetInputRef.current.value = "";
        try {
          localStorage.removeItem(draftStorageKey);
          localStorage.removeItem(generatedSheetStorageKey);
        } catch {
          // ignore cleanup failures
        }
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

  function openSheetGeneratorPreview() {
    if (!formRef.current) return;
    persistDraftFromForm(formRef.current);
    const fd = new FormData(formRef.current);
    const characterName = (fd.get("name") as string | null)?.trim() ?? "";
    const raceSlug = (fd.get("race_slug") as string | null)?.trim() ?? "";
    const subraceSlug = (fd.get("subclass_slug") as string | null)?.trim() ?? "";
    const classLabel = (fd.get("character_class") as string | null)?.trim() ?? "";
    const classSubclass = (fd.get("class_subclass") as string | null)?.trim() ?? "";
    const backgroundSlug = (fd.get("background_slug") as string | null)?.trim() ?? "";

    if (!characterName || !raceSlug || !classLabel || !backgroundSlug) {
      toast.error("Per l'anteprima compila almeno nome, razza, classe e background.");
      return;
    }

    const params = new URLSearchParams({
      characterName,
      raceSlug,
      classLabel,
      backgroundSlug,
      level: "1",
      autogen: "1",
      campaignId,
      returnTo: `/campaigns/${campaignId}?tab=pg&openCreateCharacter=1`,
    });
    if (subraceSlug) params.set("subraceSlug", subraceSlug);
    if (classSubclass) params.set("classSubclass", classSubclass);

    setOpen(false);
    router.push(`/generator?${params.toString()}`);
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
            Inserisci nome, classe, statistiche di combattimento, avatar, scheda tecnica (PDF) e background. L&apos;assegnazione al giocatore potrai farla dalla griglia.
          </DialogDescription>
        </DialogHeader>
        <form
          ref={formRef}
          key={formMountSignature}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
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
              defaultValue={formSeed?.draft.name ?? ""}
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <CharacterBuildFormFields
            disabled={isLoading}
            initialRaceSlug={formSeed?.draft.race_slug?.trim() || null}
            initialSubclassSlug={formSeed?.draft.subclass_slug?.trim() || null}
            initialClassLabel={formSeed?.draft.character_class?.trim() || null}
            initialClassSubclass={formSeed?.draft.class_subclass?.trim() || null}
            initialBackgroundSlug={formSeed?.draft.background_slug?.trim() || null}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="char-ac">CA</Label>
              <Input
                id="char-ac"
                name="armor_class"
                type="number"
                min={0}
                placeholder="Es. 15"
                defaultValue={
                  formSeed?.generated != null
                    ? String(formSeed.generated.armorClass)
                    : (formSeed?.draft.armor_class ?? "")
                }
                className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="char-hp">PF</Label>
              <Input
                id="char-hp"
                name="hit_points"
                type="number"
                min={0}
                placeholder="Es. 24"
                defaultValue={
                  formSeed?.generated != null
                    ? String(formSeed.generated.hitPoints)
                    : (formSeed?.draft.hit_points ?? "")
                }
                className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
          </div>

          <ImageSourceField
            fileInputName="image"
            urlFieldName="image_url"
            label="Avatar (immagine)"
            required
            disabled={isLoading}
            previewClassName="aspect-[200/280] w-32"
            presetUrl={formSeed?.draft.image_url?.trim() || null}
          />

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
            <p className="text-xs text-barber-paper/60">Oppure inserisci un link alla scheda PDF:</p>
            <Input
              id="char-sheet-url"
              name="sheet_url"
              type="url"
              placeholder="https://..."
              defaultValue={formSeed?.draft.sheet_url ?? ""}
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/40"
              disabled={isLoading}
            />
            {formSeed?.generated && (
              <p className="text-xs text-emerald-300/90">
                Scheda PDF generata pronta: verra salvata con il personaggio se non carichi un altro PDF.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="char-background">Background / Storia</Label>
            <Textarea
              id="char-background"
              name="background"
              placeholder="Storia del personaggio, tratti, note..."
              defaultValue={formSeed?.draft.background ?? ""}
              className="min-h-[120px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={openSheetGeneratorPreview}
              disabled={isLoading}
              className="border-barber-gold/40 text-barber-gold"
            >
              Anteprima scheda
            </Button>
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

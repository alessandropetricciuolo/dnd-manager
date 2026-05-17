"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { BookUp, Loader2 } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  importCatalogEntriesToCampaign,
  listCharacterCatalogForImport,
  type CharacterCatalogRow,
} from "@/app/campaigns/character-catalog-actions";

function previewText(s: string | null, max = 140): string {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

type ImportCharactersFromCatalogDialogProps = {
  campaignId: string;
};

export function ImportCharactersFromCatalogDialog({ campaignId }: ImportCharactersFromCatalogDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [entries, setEntries] = useState<CharacterCatalogRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const res = await listCharacterCatalogForImport();
      if (res.success) {
        setEntries(res.data);
      } else {
        toast.error(res.error);
        setEntries([]);
      }
    } catch {
      toast.error("Errore caricamento catalogo.");
      setEntries([]);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadCatalog();
      setSelected(new Set());
    }
  }, [open, loadCatalog]);

  function toggleId(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(entries.map((e) => e.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function handleImport() {
    if (importing) return;
    const ids = [...selected];
    if (!ids.length) {
      toast.error("Seleziona almeno un personaggio.");
      return;
    }
    setImporting(true);
    try {
      const res = await importCatalogEntriesToCampaign(campaignId, ids);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.imported > 0) {
        toast.success(
          res.imported === 1
            ? "1 personaggio importato."
            : `${res.imported} personaggi importati.`
        );
      }
      if (res.failures.length) {
        const msg = res.failures.map((f) => `${f.name}: ${f.error}`).join("\n");
        toast.error(`Alcuni import sono falliti:\n${msg}`, { duration: 12_000 });
      }
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Errore durante l’import.");
    } finally {
      setImporting(false);
    }
  }

  const totalSelected = selected.size;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="border-barber-gold/50 bg-barber-dark text-barber-gold hover:bg-barber-gold/10"
        >
          <BookUp className="mr-2 h-4 w-4" />
          Importa da catalogo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importa dal catalogo</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Scegli i personaggi dalla libreria globale Barber &amp; Dragons. Verranno creati in campagna come
            con «Nuovo personaggio»: scheda PDF copiata, immagine e background come in catalogo.
          </DialogDescription>
        </DialogHeader>

        {loadingCatalog ? (
          <div className="flex items-center justify-center gap-2 py-12 text-barber-paper/70">
            <Loader2 className="h-5 w-5 animate-spin" />
            Caricamento catalogo…
          </div>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-barber-paper/65">
            Nessuna voce nel catalogo. Usa lo script in{" "}
            <span className="font-mono text-barber-gold/90">scripts/import-character-catalog.ts</span>{" "}
            con un JSON come in <span className="font-mono text-barber-gold/90">scripts/character-catalog.import.example.json</span>.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-barber-gold"
                onClick={selectAll}
              >
                Seleziona tutti
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-barber-paper/70"
                onClick={selectNone}
              >
                Deseleziona
              </Button>
              <span className="ml-auto text-barber-paper/55">{totalSelected} selezionati</span>
            </div>
            <ScrollArea className="max-h-[min(420px,50vh)] pr-3">
              <ul className="space-y-3">
                {entries.map((row) => {
                  const checked = selected.has(row.id);
                  return (
                    <li
                      key={row.id}
                      className="rounded-lg border border-barber-gold/20 bg-barber-dark/90 p-3"
                    >
                      <label className="flex cursor-pointer gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleId(row.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-barber-red"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-medium text-barber-paper">{row.name}</span>
                            <span className="text-xs text-barber-paper/45">{row.slug}</span>
                          </div>
                          <p className="text-xs text-barber-paper/65">
                            {[row.character_class, row.armor_class != null ? `CA ${row.armor_class}` : null, row.hit_points != null ? `PF ${row.hit_points}` : null]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                          <p className="text-xs leading-snug text-barber-paper/55">
                            {previewText(row.background) || "Senza testo background."}
                          </p>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={importing}
            className="border-barber-gold/40 text-barber-paper/80"
          >
            Annulla
          </Button>
          <Button
            type="button"
            disabled={importing || loadingCatalog || entries.length === 0 || totalSelected === 0}
            onClick={() => void handleImport()}
            className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importazione…
              </>
            ) : (
              "Importa in campagna"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

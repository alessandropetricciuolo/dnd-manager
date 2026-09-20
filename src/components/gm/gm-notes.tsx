"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

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
import { ImageSourceField } from "@/components/ui/image-source-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listGmNotes,
  createGmNote,
  updateGmNote,
  deleteGmNote,
  type GmNoteRow,
} from "@/app/campaigns/gm-actions";

const PREVIEW_LEN = 120;

type GmNotesProps = {
  campaignId: string;
};

export function GmNotes({ campaignId }: GmNotesProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<GmNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GmNoteRow | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const result = await listGmNotes(campaignId);
    setLoading(false);
    if (result.success && result.data) setNotes(result.data);
    else if (!result.success) toast.error(result.error);
  }, [campaignId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const handler = () => openCreate();
    window.addEventListener("gm-notes:create", handler);
    return () => window.removeEventListener("gm-notes:create", handler);
  }, []);

  function openCreate() {
    setEditingNote(null);
    setDialogOpen(true);
  }

  function openEdit(note: GmNoteRow) {
    setEditingNote(note);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formLoading) return;
    const form = event.currentTarget;
    const title = (form.querySelector('[name="title"]') as HTMLInputElement)?.value?.trim() ?? "";
    if (!title) {
      toast.error("Il titolo è obbligatorio.");
      return;
    }
    const formData = new FormData(form);
    formData.set("title", title);
    formData.set("content", (form.querySelector('[name="content"]') as HTMLTextAreaElement)?.value?.trim() ?? "");
    formData.set("session_id", "");
    setFormLoading(true);
    try {
      if (editingNote) {
        const result = await updateGmNote(editingNote.id, formData);
        if (result.success) {
          toast.success("Nota aggiornata.");
          setDialogOpen(false);
          loadNotes();
          router.refresh();
        } else toast.error(result.error);
      } else {
        const result = await createGmNote(campaignId, formData);
        if (result.success) {
          toast.success("Nota creata.");
          setDialogOpen(false);
          form.reset();
          loadNotes();
          router.refresh();
        } else toast.error(result.error);
      }
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(note: GmNoteRow) {
    if (!confirm(`Eliminare la nota "${note.title}"?`)) return;
    setDeleteLoadingId(note.id);
    const result = await deleteGmNote(note.id);
    setDeleteLoadingId(null);
    if (result.success) {
      toast.success("Nota eliminata.");
      loadNotes();
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-barber-gold/20 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-barber-gold" />
          <h3 className="font-cinzel text-lg font-bold text-gold-relief">Taccuino Segreto del Master</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/15"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuova nota
            </Button>
          </DialogTrigger>
          <DialogContent className="border-barber-gold/40 bg-[#120f0d] text-barber-paper sm:max-w-lg">
            <DialogHeader className="border-b border-barber-gold/20 pb-2">
              <DialogTitle className="font-cinzel text-lg font-bold text-gold-relief">
                {editingNote ? "Modifica appunto segreto" : "Nuovo appunto segreto"}
              </DialogTitle>
              <DialogDescription className="text-barber-paper/65">
                Queste note sono protette e visibili esclusivamente al Dungeon Master.
              </DialogDescription>
            </DialogHeader>
            <form key={editingNote?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="gm-note-title" className="text-barber-paper/85">Titolo</Label>
                <Input
                  id="gm-note-title"
                  name="title"
                  defaultValue={editingNote?.title ?? ""}
                  placeholder="Es. Segreti del capitolo 2"
                  className="border-barber-gold/30 bg-black/50 text-barber-paper"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gm-note-content" className="text-barber-paper/85">Contenuto</Label>
                <Textarea
                  id="gm-note-content"
                  name="content"
                  defaultValue={editingNote?.content ?? ""}
                  placeholder="Scrivi qui i piani segreti, retroscena o incontri..."
                  rows={12}
                  className="min-h-[200px] resize-y border-barber-gold/30 bg-black/50 text-barber-paper"
                />
              </div>
              <ImageSourceField
                fileInputName="image"
                urlFieldName="image_url"
                label="Immagine di supporto (opzionale)"
                disabled={formLoading}
                previewUrl={editingNote?.image_url ?? null}
                hint="Carica o incolla URL; salvata su Telegram."
              />
              {editingNote?.image_url && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="gm-note-remove-image"
                    name="remove_image"
                    className="h-4 w-4 rounded border-barber-gold/40 bg-black/50 text-barber-gold"
                  />
                  <Label htmlFor="gm-note-remove-image" className="cursor-pointer text-sm text-barber-paper/70">
                    Rimuovi immagine
                  </Label>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="text-barber-paper/60 hover:text-barber-paper"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="btn-wax-seal text-white font-medium"
                >
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingNote ? "Salva appunto" : "Sigilla nota"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-barber-gold" />
        </div>
      ) : notes.length === 0 ? (
        <div className="card-guild-stone relative rounded-xl p-6 text-center">
          <span className="corner-ornament-tl" />
          <span className="corner-ornament-tr" />
          <span className="corner-ornament-bl" />
          <span className="corner-ornament-br" />
          <p className="font-cinzel text-base text-barber-gold/80">Il taccuino è intonso</p>
          <p className="mt-1 text-xs text-barber-paper/60">
            Nessuna nota registrata. Clicca &quot;Nuova nota&quot; per aggiungere retroscena o promemoria.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="card-guild-stone relative rounded-xl p-4 shadow-lg transition-all hover:border-barber-gold/50 min-w-0"
            >
              <span className="corner-ornament-tl" />
              <span className="corner-ornament-tr" />
              <span className="corner-ornament-bl" />
              <span className="corner-ornament-br" />
              
              <div className="flex items-start justify-between gap-2 border-b border-barber-gold/15 pb-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-barber-gold/80" />
                  <span className="font-cinzel text-sm font-bold text-barber-gold truncate">{note.title}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-barber-paper/70 hover:text-barber-gold hover:bg-barber-gold/10"
                    onClick={() => openEdit(note)}
                    title="Modifica appunto"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-barber-paper/70 hover:text-barber-red hover:bg-barber-red/10"
                    onClick={() => handleDelete(note)}
                    disabled={deleteLoadingId === note.id}
                    title="Elimina appunto"
                  >
                    {deleteLoadingId === note.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                {note.image_url && (
                  <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-md border border-barber-gold/25 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={note.image_url}
                      alt=""
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                )}
                <p className="line-clamp-3 text-xs text-barber-paper/80 leading-relaxed">
                  {note.content
                    ? note.content.length <= PREVIEW_LEN
                      ? note.content
                      : `${note.content.slice(0, PREVIEW_LEN)}…`
                    : "—"}
                </p>
              </div>
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}

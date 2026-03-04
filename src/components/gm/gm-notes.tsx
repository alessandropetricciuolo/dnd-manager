"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
    const content = (form.querySelector('[name="content"]') as HTMLTextAreaElement)?.value?.trim() ?? "";
    if (!title) {
      toast.error("Il titolo è obbligatorio.");
      return;
    }
    setFormLoading(true);
    try {
      if (editingNote) {
        const result = await updateGmNote(editingNote.id, { title, content });
        if (result.success) {
          toast.success("Nota aggiornata.");
          setDialogOpen(false);
          loadNotes();
          router.refresh();
        } else toast.error(result.error);
      } else {
        const result = await createGmNote(campaignId, { title, content });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-200">Note GM</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-violet-500/50 text-violet-200 hover:bg-violet-500/20"
              onClick={openCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuova nota
            </Button>
          </DialogTrigger>
          <DialogContent className="border-violet-800/50 bg-slate-900 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-violet-100">
                {editingNote ? "Modifica nota" : "Nuova nota"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Le note sono visibili solo a te (GM/Admin).
              </DialogDescription>
            </DialogHeader>
            <form key={editingNote?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gm-note-title">Titolo</Label>
                <Input
                  id="gm-note-title"
                  name="title"
                  defaultValue={editingNote?.title ?? ""}
                  placeholder="Es. Segreti del capitolo 2"
                  className="border-slate-600 bg-slate-800 text-slate-100"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gm-note-content">Contenuto</Label>
                <Textarea
                  id="gm-note-content"
                  name="content"
                  defaultValue={editingNote?.content ?? ""}
                  placeholder="Scrivi qui le tue note..."
                  rows={12}
                  className="min-h-[200px] resize-y border-slate-600 bg-slate-800 text-slate-100"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="text-slate-400"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingNote ? "Salva" : "Crea"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      ) : notes.length === 0 ? (
        <p className="rounded-lg border border-violet-800/40 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-400">
          Nessuna nota. Clicca &quot;Nuova nota&quot; per aggiungerne una.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {notes.map((note) => (
            <Card
              key={note.id}
              className="border-violet-800/40 bg-slate-900/60 transition-colors hover:border-violet-700/50"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-violet-100">
                  <FileText className="h-4 w-4 shrink-0 text-violet-400" />
                  <span className="line-clamp-1">{note.title}</span>
                </CardTitle>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-violet-300"
                    onClick={() => openEdit(note)}
                    title="Modifica"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-400"
                    onClick={() => handleDelete(note)}
                    disabled={deleteLoadingId === note.id}
                    title="Elimina"
                  >
                    {deleteLoadingId === note.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="line-clamp-2 text-sm text-slate-400">
                  {note.content
                    ? note.content.length <= PREVIEW_LEN
                      ? note.content
                      : `${note.content.slice(0, PREVIEW_LEN)}…`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

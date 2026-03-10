"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, FileText, Pin, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageSourceField } from "@/components/ui/image-source-field";
import {
  listGmNotes,
  createGmNote,
  updateGmNote,
  deleteGmNote,
  type GmNoteRow,
} from "@/app/campaigns/gm-actions";
import { cn } from "@/lib/utils";

type GmNotesGridProps = {
  campaignId: string;
  /** Se valorizzato, mostra anche le note di questa sessione oltre alle globali. */
  sessionId?: string | null;
  /** Nome/Data sessione per l'header "Appunti Sessione [Nome/Data]". */
  sessionLabel?: string;
};

export function GmNotesGrid({ campaignId, sessionId, sessionLabel }: GmNotesGridProps) {
  const [notes, setNotes] = useState<GmNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddIsGlobal, setQuickAddIsGlobal] = useState(true);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const result = await listGmNotes(campaignId, sessionId ?? undefined);
    setLoading(false);
    if (result.success && result.data) setNotes(result.data);
    else if (!result.success) toast.error(result.error);
  }, [campaignId, sessionId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const globalNotes = notes.filter((n) => n.session_id == null);
  const sessionNotes = sessionId ? notes.filter((n) => n.session_id === sessionId) : [];

  async function handleQuickAddSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (quickAddLoading) return;
    const form = e.currentTarget;
    const title = (form.querySelector('[name="quick-title"]') as HTMLInputElement)?.value?.trim() ?? "";
    const content = (form.querySelector('[name="quick-content"]') as HTMLTextAreaElement)?.value?.trim() ?? "";
    if (!title) {
      toast.error("Il titolo è obbligatorio.");
      return;
    }
    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("session_id", quickAddIsGlobal ? "" : sessionId ?? "");
    const fileInput = form.querySelector('input[name="image"]') as HTMLInputElement;
    if (fileInput?.files?.[0]) formData.set("image", fileInput.files[0]);
    const urlInput = form.querySelector('input[name="image_url"]') as HTMLInputElement;
    if (urlInput?.value?.trim()) formData.set("image_url", urlInput.value.trim());
    setQuickAddLoading(true);
    try {
      const result = await createGmNote(campaignId, formData);
      if (result.success) {
        toast.success("Nota creata.");
        setQuickAddOpen(false);
        form.reset();
        setQuickAddIsGlobal(true);
        loadNotes();
      } else toast.error(result.error);
    } finally {
      setQuickAddLoading(false);
    }
  }

  async function handleEditInDialog(noteId: string, formData: FormData) {
    const result = await updateGmNote(noteId, formData);
    if (result.success) {
      toast.success("Nota aggiornata.");
      loadNotes();
    } else toast.error(result.error);
  }

  async function handleDelete(note: GmNoteRow) {
    if (!confirm(`Eliminare la nota "${note.title}"?`)) return;
    setDeleteLoadingId(note.id);
    const result = await deleteGmNote(note.id);
    setDeleteLoadingId(null);
    if (result.success) {
      toast.success("Nota eliminata.");
      loadNotes();
    } else toast.error(result.error);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-amber-400">
        Note GM
      </h2>

      {/* Sezione A: Note Globali (sempre in alto) */}
      {globalNotes.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium tracking-wide text-amber-400/90">
            <Pin className="h-4 w-4" />
            Sempre a portata di mano
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {globalNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isGlobal
                currentSessionId={sessionId ?? null}
                onSaveEdit={handleEditInDialog}
                onDelete={handleDelete}
                deleteLoadingId={deleteLoadingId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sezione B: Note Sessione Corrente */}
      {sessionId != null && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium tracking-wide text-zinc-400">
            <Calendar className="h-4 w-4" />
            Appunti Sessione {sessionLabel ? `— ${sessionLabel}` : ""}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
              <DialogTrigger asChild>
                <Card
                  className={cn(
                    "flex min-h-[140px] cursor-pointer flex-col items-center justify-center border-amber-600/30 bg-zinc-900/50",
                    "transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-600/10 hover:shadow-[0_0_20px_rgba(251,191,36,0.08)]"
                  )}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-amber-500/50 text-amber-400">
                      <Plus className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-amber-200/90">
                      Nuova nota
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-lg border-amber-600/30 bg-zinc-900 text-zinc-100">
                <DialogHeader>
                  <DialogTitle className="text-amber-400">Nuova nota al volo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick-title" className="text-zinc-300">Titolo</Label>
                    <Input
                      id="quick-title"
                      name="quick-title"
                      placeholder="Es. Piano del Cattivo"
                      className="bg-zinc-800 border-amber-600/30 text-zinc-100"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-content" className="text-zinc-300">Contenuto</Label>
                    <Textarea
                      id="quick-content"
                      name="quick-content"
                      placeholder="Scrivi qui..."
                      rows={8}
                      className="min-h-[160px] resize-y bg-zinc-800 border-amber-600/30 text-zinc-100"
                    />
                  </div>
                  <ImageSourceField
                    fileInputName="image"
                    urlFieldName="image_url"
                    label="Immagine (opzionale)"
                    disabled={quickAddLoading}
                    hint="Carica o incolla URL; salvata su Telegram."
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="quick-is-global"
                      checked={quickAddIsGlobal}
                      onChange={(e) => setQuickAddIsGlobal(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-600/50 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                    />
                    <Label htmlFor="quick-is-global" className="cursor-pointer text-sm text-zinc-300">
                      Nota Globale (Visibile ovunque)
                    </Label>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setQuickAddOpen(false)}
                      className="border-amber-600/40 text-zinc-300"
                    >
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      disabled={quickAddLoading}
                      className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                    >
                      {quickAddLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Crea
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {sessionNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isGlobal={false}
                currentSessionId={sessionId}
                onSaveEdit={handleEditInDialog}
                onDelete={handleDelete}
                deleteLoadingId={deleteLoadingId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Nessuna sessione selezionata: mostra solo Quick Add per note globali e messaggio */}
      {sessionId == null && (
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
              <DialogTrigger asChild>
                <Card
                  className={cn(
                    "flex min-h-[140px] cursor-pointer flex-col items-center justify-center border-amber-600/30 bg-zinc-900/50",
                    "transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-600/10 hover:shadow-[0_0_20px_rgba(251,191,36,0.08)]"
                  )}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-amber-500/50 text-amber-400">
                      <Plus className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-amber-200/90">
                      Nuova nota
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-lg border-amber-600/30 bg-zinc-900 text-zinc-100">
                <DialogHeader>
                  <DialogTitle className="text-amber-400">Nuova nota al volo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick-title-none" className="text-zinc-300">Titolo</Label>
                    <Input
                      id="quick-title-none"
                      name="quick-title"
                      placeholder="Es. Piano del Cattivo"
                      className="bg-zinc-800 border-amber-600/30 text-zinc-100"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-content-none" className="text-zinc-300">Contenuto</Label>
                    <Textarea
                      id="quick-content-none"
                      name="quick-content"
                      placeholder="Scrivi qui..."
                      rows={8}
                      className="min-h-[160px] resize-y bg-zinc-800 border-amber-600/30 text-zinc-100"
                    />
                  </div>
                  <ImageSourceField
                    fileInputName="image"
                    urlFieldName="image_url"
                    label="Immagine (opzionale)"
                    disabled={quickAddLoading}
                    hint="Carica o incolla URL; salvata su Telegram."
                  />
                  <p className="text-xs text-zinc-500">
                    Senza sessione selezionata le nuove note sono sempre globali.
                  </p>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setQuickAddOpen(false)}
                      className="border-amber-600/40 text-zinc-300"
                    >
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      disabled={quickAddLoading}
                      className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                    >
                      {quickAddLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Crea
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </section>
      )}
    </div>
  );
}

type NoteCardProps = {
  note: GmNoteRow;
  isGlobal: boolean;
  currentSessionId: string | null;
  onSaveEdit: (noteId: string, formData: FormData) => Promise<void>;
  onDelete: (note: GmNoteRow) => void;
  deleteLoadingId: string | null;
};

function NoteCard({
  note,
  isGlobal,
  currentSessionId,
  onSaveEdit,
  onDelete,
  deleteLoadingId,
}: NoteCardProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [editIsGlobal, setEditIsGlobal] = useState(note.session_id == null);
  const [saving, setSaving] = useState(false);
  const editFormRef = useRef<HTMLFormElement>(null);

  function handleOpenChange(o: boolean) {
    if (o) {
      setEditTitle(note.title);
      setEditContent(note.content);
      setEditIsGlobal(note.session_id == null);
      setEditMode(false);
    }
    setOpen(o);
  }

  async function handleSaveEdit() {
    if (!editFormRef.current) return;
    const formData = new FormData(editFormRef.current);
    formData.set("title", editTitle);
    formData.set("content", editContent);
    formData.set("session_id", editIsGlobal ? "" : currentSessionId ?? "");
    setSaving(true);
    await onSaveEdit(note.id, formData);
    setSaving(false);
    setEditMode(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Card
          className={cn(
            "relative min-h-[140px] cursor-pointer transition-all duration-200",
            isGlobal
              ? "border-yellow-600/50 bg-zinc-900/70 hover:border-yellow-500/60 hover:bg-amber-600/5 hover:shadow-[0_0_18px_rgba(234,179,8,0.08)]"
              : "border-amber-600/30 bg-zinc-900/50 hover:border-amber-500/50 hover:bg-amber-600/5 hover:shadow-[0_0_18px_rgba(251,191,36,0.06)]"
          )}
        >
          {isGlobal && (
            <span className="absolute right-2 top-2 text-amber-400/90" title="Nota globale">
              <Pin className="h-4 w-4" />
            </span>
          )}
          <CardHeader className="pb-2 pr-8">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-zinc-100">
              <FileText className="h-4 w-4 shrink-0 text-amber-400/80" />
              <span className="line-clamp-1">{note.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {note.image_url && (
              <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-md border border-amber-600/20 bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={note.image_url}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              </div>
            )}
            <p className="line-clamp-4 text-sm text-zinc-400 leading-relaxed">
              {note.content || "—"}
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden border-amber-600/30 bg-zinc-900 text-zinc-100"
        onPointerDownOutside={() => setOpen(false)}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl font-bold text-amber-400 pr-8">
            {editMode ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-zinc-800 border-amber-600/30 text-zinc-100 text-lg font-bold"
              />
            ) : (
              note.title
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[55vh] min-h-0 overflow-y-auto overflow-x-hidden px-1">
          {editMode ? (
            <form ref={editFormRef} id={`edit-note-form-${note.id}`} className="space-y-3 py-2">
              <input type="hidden" name="session_id" value={editIsGlobal ? "" : currentSessionId ?? ""} />
              <Textarea
                name="content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={16}
                className="min-h-[300px] resize-y bg-zinc-800 border-amber-600/30 text-zinc-100 text-lg leading-relaxed"
              />
              <ImageSourceField
                fileInputName="image"
                urlFieldName="image_url"
                label="Immagine (opzionale)"
                disabled={saving}
                previewUrl={note.image_url}
                hint="Carica o incolla URL; salvata su Telegram."
              />
              {note.image_url && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`edit-remove-image-${note.id}`}
                    name="remove_image"
                    className="h-4 w-4 rounded border-amber-600/50 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                  />
                  <Label htmlFor={`edit-remove-image-${note.id}`} className="cursor-pointer text-sm text-zinc-300">
                    Rimuovi immagine
                  </Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-is-global"
                  checked={editIsGlobal}
                  onChange={(e) => setEditIsGlobal(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-600/50 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                />
                <Label htmlFor="edit-is-global" className="cursor-pointer text-sm text-zinc-300">
                  Nota Globale (Visibile ovunque)
                </Label>
              </div>
            </form>
          ) : (
            <>
              {note.image_url && (
                <div className="relative my-2 aspect-video w-full overflow-hidden rounded-lg border border-amber-600/20 bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={note.image_url}
                    alt=""
                    className="h-full w-full object-contain object-center"
                  />
                </div>
              )}
              <p className="py-4 text-lg leading-relaxed text-zinc-200 whitespace-pre-wrap">
                {note.content || "—"}
              </p>
            </>
          )}
        </div>
        <DialogFooter className="shrink-0 border-t border-amber-600/20 pt-4">
          {editMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditMode(false)}
                className="border-amber-600/40 text-zinc-300"
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salva
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="border-amber-600/40 text-zinc-300 hover:bg-amber-600/20"
                onClick={() => setEditMode(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/20"
                onClick={() => onDelete(note)}
                disabled={deleteLoadingId === note.id}
              >
                {deleteLoadingId === note.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Elimina
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

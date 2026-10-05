"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function WikiGalleryUpload({ disabled, id }: { disabled?: boolean; id: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  function applyFiles(next: File[]) {
    const transfer = new DataTransfer();
    next.forEach(file => transfer.items.add(file));
    if (inputRef.current) inputRef.current.files = transfer.files;
    setFiles(next);
  }
  function addFiles(incoming: File[]) {
    const next = [...files];
    for (const file of incoming) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 4 * 1024 * 1024) {
        toast.error(`${file.name}: usa JPG, PNG, WebP o GIF fino a 4 MB.`);
        continue;
      }
      if (!next.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) next.push(file);
    }
    if (next.length > 50 || next.reduce((sum, file) => sum + file.size, 0) > 8 * 1024 * 1024) {
      toast.error("Seleziona fino a 50 immagini e 8 MB per salvataggio.");
      applyFiles(files);
      return;
    }
    applyFiles(next);
  }
  return <div className="space-y-3">
    <input ref={inputRef} id={id} type="file" name="gallery_images" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={disabled} className="sr-only" onChange={event => addFiles(Array.from(event.target.files ?? []))} />
    <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}><Plus className="mr-2 h-4 w-4" />Aggiungi più immagini</Button>
    <p className="text-xs text-barber-paper/70" aria-live="polite">{files.length ? `${files.length} immagini pronte da caricare al salvataggio.` : "Seleziona più file insieme. Puoi aggiungerne altri prima di salvare."}</p>
    {files.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}`} className="min-w-0 rounded border border-barber-gold/30 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previews[index]} alt={file.name} className="h-24 w-full object-contain" />
        <p className="truncate py-1 text-xs text-barber-paper" title={file.name}>{file.name}</p>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} aria-label={`Rimuovi ${file.name}`} onClick={() => applyFiles(files.filter((_, position) => position !== index))}><Trash2 className="mr-1 h-3 w-3" />Rimuovi</Button>
      </li>)}
    </ul>}
  </div>;
}

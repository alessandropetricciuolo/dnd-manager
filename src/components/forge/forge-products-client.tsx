"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, ImageIcon, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteForgeProductAction,
  uploadForgeProductImageAction,
  upsertForgeProductAction,
} from "@/lib/forge/actions";
import type { ForgeProduct } from "@/lib/forge/types";
import { cn } from "@/lib/utils";

type Props = {
  initialProducts: ForgeProduct[];
  categories: string[];
};

const emptyForm = {
  id: undefined as string | undefined,
  name: "",
  category: "",
  description: "",
  image_url: "",
  cost_estimate: "0",
  sale_price: "0",
  stock: "0",
  min_stock: "0",
  active: true,
};

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function ProductThumbnail({ url, name, size = "md" }: { url?: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg" ? "h-28 w-28" : size === "md" ? "h-16 w-16" : "h-12 w-12";
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border border-barber-gold/25 bg-barber-dark/60",
        sizeClass
      )}
    >
      {url ? (
        <Image src={url} alt={name} fill className="object-cover" unoptimized sizes="112px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-barber-paper/30">
          <Package className={size === "lg" ? "h-10 w-10" : "h-6 w-6"} />
        </div>
      )}
    </div>
  );
}

export function ForgeProductsClient({ initialProducts, categories }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ForgeProduct | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (!showInactive && !p.active) return false;
      if (category !== "all" && (p.category ?? "") !== category) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.category?.toLowerCase().includes(q) ?? false);
    });
  }, [products, search, category, showInactive]);

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: ForgeProduct) {
    setForm({
      id: p.id,
      name: p.name,
      category: p.category ?? "",
      description: p.description ?? "",
      image_url: p.image_url ?? "",
      cost_estimate: String(p.cost_estimate),
      sale_price: String(p.sale_price),
      stock: String(p.stock ?? 0),
      min_stock: String(p.min_stock),
      active: p.active,
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) {
      toast.error("Il nome è obbligatorio.");
      return;
    }
    const stock = Number(form.stock);
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
      toast.error("Lo stock attuale deve essere un numero intero ≥ 0.");
      return;
    }
    startTransition(async () => {
      const res = await upsertForgeProductAction({
        id: form.id,
        name: form.name,
        category: form.category,
        description: form.description,
        image_url: form.image_url,
        cost_estimate: Number(form.cost_estimate) || 0,
        sale_price: Number(form.sale_price) || 0,
        min_stock: Number(form.min_stock) || 0,
        active: form.active,
        target_stock: stock,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(form.id ? "Prodotto aggiornato." : "Prodotto creato.");
      setOpen(false);
      window.location.reload();
    });
  }

  async function onImageUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadForgeProductImageAction(fd);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setForm((f) => ({ ...f, image_url: res.data!.publicUrl }));
      toast.success("Immagine caricata.");
    } finally {
      setUploading(false);
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const res = await deleteForgeProductAction(target.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (res.data?.deactivated) {
        toast.success("Prodotto disattivato (ha storico vendite o magazzino).");
        setProducts((prev) =>
          prev.map((p) => (p.id === target.id ? { ...p, active: false } : p))
        );
      } else {
        toast.success("Prodotto eliminato.");
        setProducts((prev) => prev.filter((p) => p.id !== target.id));
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-barber-gold sm:text-2xl">Prodotti</h1>
          <p className="text-sm text-barber-paper/60">Catalogo stampe 3D e stock</p>
        </div>
        <Button
          onClick={openCreate}
          className="h-11 w-full bg-barber-gold text-barber-dark hover:bg-barber-gold/90 sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuovo prodotto
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          placeholder="Cerca prodotto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 border-barber-gold/30 bg-barber-dark sm:max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 w-full border-barber-gold/30 bg-barber-dark sm:w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le categorie</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex h-11 items-center gap-2 text-sm text-barber-paper/70">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4"
          />
          Mostra disattivi
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-barber-gold/25 py-12 text-center text-sm text-barber-paper/50">
          Nessun prodotto trovato.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => {
            const low = (p.stock ?? 0) < p.min_stock;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-xl border border-barber-gold/25 bg-barber-dark/80",
                  !p.active && "opacity-60"
                )}
              >
                <div className="relative aspect-square w-full bg-barber-dark/60">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-barber-paper/25">
                      <Package className="h-12 w-12" />
                    </div>
                  )}
                  {!p.active ? (
                    <Badge className="absolute left-2 top-2 bg-barber-paper/20 text-barber-paper">
                      Disattivo
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-barber-paper/50">{p.category || "—"}</p>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-barber-gold">{money(Number(p.sale_price))}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        low ? "border-amber-500/50 text-amber-200" : "border-barber-gold/30"
                      )}
                    >
                      {p.stock ?? 0}
                      {low ? " ↓" : ""}
                    </Badge>
                  </div>
                  <div className="mt-auto flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 flex-1"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Modifica
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-red-300 hover:text-red-200"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden border-barber-gold/30 bg-barber-dark p-0 text-barber-paper sm:max-h-[90vh]">
          <DialogHeader className="shrink-0 border-b border-barber-gold/15 px-4 py-3">
            <DialogTitle>{form.id ? "Modifica prodotto" : "Nuovo prodotto"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
            <div className="flex flex-col items-center gap-3">
              <ProductThumbnail url={form.image_url} name={form.name} size="lg" />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void onImageUpload(e.target.files?.[0] ?? null)}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onImageUpload(e.target.files?.[0] ?? null)}
              />
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={uploading}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Scatta foto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={uploading}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Galleria
                </Button>
              </div>
              {uploading ? (
                <p className="text-xs text-barber-paper/50">Caricamento immagine…</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                className="h-11"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input
                className="h-11"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrizione</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Costo stim.</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-11"
                  value={form.cost_estimate}
                  onChange={(e) => setForm({ ...form, cost_estimate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Prezzo vendita</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-11"
                  value={form.sale_price}
                  onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Stock attuale</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className="h-11"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
                <p className="text-[11px] text-barber-paper/45">
                  Al salvataggio registra una correzione se cambi la quantità.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Stock min.</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className="h-11"
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4"
              />
              Prodotto attivo
            </label>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-barber-gold/15 px-4 py-3 sm:gap-0">
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={pending || uploading}
              onClick={save}
              className="h-11 flex-1 bg-barber-gold text-barber-dark sm:flex-none"
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-barber-paper/60">
              Se il prodotto ha vendite o movimenti di magazzino verrà disattivato. Altrimenti verrà
              eliminato definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="h-11">Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={confirmDelete}
              className="h-11 bg-red-700 text-white hover:bg-red-600"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

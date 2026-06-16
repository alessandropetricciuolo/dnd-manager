"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadForgeProductImageAction,
  upsertForgeProductAction,
} from "@/lib/forge/actions";
import type { ForgeProduct } from "@/lib/forge/types";

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
  min_stock: "0",
  active: true,
};

export function ForgeProductsClient({ initialProducts, categories }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && (p.category ?? "") !== category) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.category?.toLowerCase().includes(q) ?? false);
    });
  }, [products, search, category]);

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
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadForgeProductImageAction(fd);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setForm((f) => ({ ...f, image_url: res.data!.publicUrl }));
    toast.success("Immagine caricata.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-barber-gold">Prodotti</h1>
          <p className="text-sm text-barber-paper/60">Catalogo stampe 3D e stock calcolato</p>
        </div>
        <Button onClick={openCreate} className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90">
          <Plus className="mr-2 h-4 w-4" />
          Nuovo prodotto
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Cerca…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs border-barber-gold/30 bg-barber-dark"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44 border-barber-gold/30 bg-barber-dark">
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-barber-gold/25">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prodotto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Prezzo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const low = (p.stock ?? 0) < p.min_stock;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded border border-barber-gold/20">
                          <Image src={p.image_url} alt="" fill className="object-cover" unoptimized />
                        </div>
                      ) : null}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.category || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={low ? "border-amber-500/50 text-amber-200" : "border-barber-gold/30"}
                    >
                      {p.stock ?? 0}
                      {low ? " · basso" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell>€ {Number(p.sale_price).toFixed(2)}</TableCell>
                  <TableCell>{p.active ? "Attivo" : "Disattivo"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-barber-gold/30 bg-barber-dark text-barber-paper">
          <DialogHeader>
            <DialogTitle>{form.id ? "Modifica prodotto" : "Nuovo prodotto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>Costo stim.</Label>
                <Input type="number" step="0.01" value={form.cost_estimate} onChange={(e) => setForm({ ...form, cost_estimate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Prezzo vendita</Label>
                <Input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Stock min.</Label>
                <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Immagine</Label>
              <Input type="file" accept="image/*" onChange={(e) => void onImageUpload(e.target.files?.[0] ?? null)} />
              {form.image_url ? (
                <p className="truncate text-xs text-barber-paper/50">{form.image_url}</p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Prodotto attivo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button disabled={pending} onClick={save} className="bg-barber-gold text-barber-dark">
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

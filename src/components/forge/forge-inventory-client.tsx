"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createForgeInventoryMovementAction,
  deleteForgeInventoryMovementAction,
} from "@/lib/forge/actions";
import type { ForgeInventoryMovementType, ForgeProduct } from "@/lib/forge/types";

type MovementRow = {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  note: string | null;
  sale_id: string | null;
  created_at: string;
  product_name?: string;
};

type Props = {
  products: ForgeProduct[];
  initialMovements: MovementRow[];
  isAdmin: boolean;
};

const TYPES: ForgeInventoryMovementType[] = ["produzione", "scarto", "reso", "correzione"];

export function ForgeInventoryClient({ products, initialMovements, isAdmin }: Props) {
  const [movements, setMovements] = useState(initialMovements);
  const [productFilter, setProductFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [type, setType] = useState<ForgeInventoryMovementType>("produzione");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = movements.filter((m) => {
    if (productFilter !== "all" && m.product_id !== productFilter) return false;
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    return true;
  });

  function addMovement() {
    const qty = Number(quantity);
    if (!productId || !qty) {
      toast.error("Prodotto e quantità obbligatori.");
      return;
    }
    startTransition(async () => {
      const res = await createForgeInventoryMovementAction({
        product_id: productId,
        type,
        quantity: qty,
        note,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Movimento registrato.");
      window.location.reload();
    });
  }

  function removeMovement(id: string, saleId: string | null) {
    if (saleId && !isAdmin) {
      toast.error("Solo l'admin può eliminare movimenti di vendita.");
      return;
    }
    if (!confirm("Eliminare questo movimento?")) return;
    startTransition(async () => {
      const res = await deleteForgeInventoryMovementAction(id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setMovements((prev) => prev.filter((m) => m.id !== id));
      toast.success("Movimento eliminato.");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-barber-gold sm:text-2xl">Movimenti magazzino</h1>
        <p className="text-sm text-barber-paper/60">Produzione, scarti, resi e correzioni</p>
      </div>

      <div className="rounded-xl border border-barber-gold/25 bg-barber-dark/80 p-4">
        <h2 className="mb-3 text-sm font-semibold text-barber-gold">Nuovo movimento</h2>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Prodotto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as ForgeInventoryMovementType)}>
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Quantità</Label>
            <Input type="number" className="h-11" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <Button className="mt-3 h-11 w-full bg-barber-gold text-barber-dark sm:w-auto" disabled={pending} onClick={addMovement}>
          Registra movimento
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="h-11 w-full border-barber-gold/30 bg-barber-dark sm:w-48">
            <SelectValue placeholder="Prodotto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i prodotti</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-11 w-full border-barber-gold/30 bg-barber-dark sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {["produzione", "vendita", "scarto", "reso", "correzione"].map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((m) => (
          <div key={m.id} className="rounded-xl border border-barber-gold/25 bg-barber-dark/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{m.product_name}</p>
                <p className="text-xs text-barber-paper/50">
                  {new Date(m.created_at).toLocaleString("it-IT")} · {m.type}
                </p>
              </div>
              <span className="text-lg font-semibold text-barber-gold">{m.quantity}</span>
            </div>
            {m.note ? <p className="mt-2 text-sm text-barber-paper/60">{m.note}</p> : null}
            {!m.sale_id || isAdmin ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-9 text-red-300"
                onClick={() => removeMovement(m.id, m.sale_id)}
              >
                Elimina
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-barber-gold/25 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Prodotto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Qtà</TableHead>
              <TableHead>Note</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{new Date(m.created_at).toLocaleString("it-IT")}</TableCell>
                <TableCell>{m.product_name}</TableCell>
                <TableCell>{m.type}</TableCell>
                <TableCell>{m.quantity}</TableCell>
                <TableCell className="max-w-[200px] truncate">{m.note || "—"}</TableCell>
                <TableCell>
                  {!m.sale_id || isAdmin ? (
                    <Button size="sm" variant="ghost" onClick={() => removeMovement(m.id, m.sale_id)}>
                      Elimina
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

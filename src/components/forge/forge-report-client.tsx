"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteForgeSaleAction,
  updateForgeSaleAction,
} from "@/lib/forge/actions";
import type { ForgeAccount, ForgePaymentStatus } from "@/lib/forge/types";

type SaleRow = {
  id: string;
  sale_date: string;
  total_amount: number;
  account_id: string;
  event_name: string | null;
  customer_name: string | null;
  payment_status: string;
  note: string | null;
  forge_accounts?: { name: string } | null;
};

type ReportData = {
  sales: SaleRow[];
  revenue: number;
  outflowTotal: number;
  estimatedProfit: number;
  byAccount: Array<{ accountId: string; name: string; total: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  byEvent: Array<{ event: string; total: number }>;
};

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function defaultFrom() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ForgeReportClient({
  initialData,
  initialFrom,
  initialTo,
  accounts,
}: {
  initialData: ReportData;
  initialFrom: string;
  initialTo: string;
  accounts: ForgeAccount[];
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [pending, startTransition] = useTransition();
  const [editSale, setEditSale] = useState<SaleRow | null>(null);
  const [editForm, setEditForm] = useState({
    sale_date: "",
    payment_status: "pagato" as ForgePaymentStatus,
    customer_name: "",
    event_name: "",
    account_id: "",
    note: "",
  });

  const csvUrl = useMemo(() => {
    const header = "data,totale,evento,conto\n";
    const rows = initialData.sales
      .map((s) => {
        const date = new Date(s.sale_date).toISOString();
        const acc = s.forge_accounts?.name ?? "";
        return `${date},${s.total_amount},${s.event_name ?? ""},${acc}`;
      })
      .join("\n");
    return `data:text/csv;charset=utf-8,${encodeURIComponent(header + rows)}`;
  }, [initialData.sales]);

  function openEdit(s: SaleRow) {
    setEditSale(s);
    setEditForm({
      sale_date: toDatetimeLocal(s.sale_date),
      payment_status: (s.payment_status as ForgePaymentStatus) || "pagato",
      customer_name: s.customer_name ?? "",
      event_name: s.event_name ?? "",
      account_id: s.account_id,
      note: s.note ?? "",
    });
  }

  function saveEdit() {
    if (!editSale) return;
    if (!editForm.account_id) {
      toast.error("Seleziona un conto di incasso.");
      return;
    }
    startTransition(async () => {
      const res = await updateForgeSaleAction({
        sale_id: editSale.id,
        sale_date: new Date(editForm.sale_date).toISOString(),
        payment_status: editForm.payment_status,
        customer_name: editForm.customer_name,
        event_name: editForm.event_name,
        account_id: editForm.account_id,
        note: editForm.note,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Incasso aggiornato.");
      setEditSale(null);
      router.refresh();
    });
  }

  function deleteSale(s: SaleRow) {
    const label = s.customer_name || s.event_name || money(s.total_amount);
    if (!confirm(`Eliminare l'incasso «${label}»? Verranno ripristinati i prodotti a magazzino.`)) return;
    startTransition(async () => {
      const res = await deleteForgeSaleAction(s.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Incasso eliminato.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-barber-gold">Report incassi</h1>
          <p className="text-sm text-barber-paper/60">Vendite, incassi e uscite per periodo</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div className="space-y-1">
            <Label>Da</Label>
            <Input type="date" name="from" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>A</Label>
            <Input type="date" name="to" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="submit" variant="outline">
            Aggiorna
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Incassi periodo</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-barber-gold">
            {money(initialData.revenue)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Uscite periodo</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-red-300">
            {money(initialData.outflowTotal)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Utile stimato</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-emerald-400">
            {money(initialData.estimatedProfit)}
          </CardContent>
        </Card>
      </div>

      <Card className="border-barber-gold/25 bg-barber-dark/80">
        <CardHeader>
          <CardTitle className="text-barber-gold">Incassi nel periodo</CardTitle>
        </CardHeader>
        <CardContent>
          {initialData.sales.length === 0 ? (
            <p className="text-sm text-barber-paper/50">Nessun incasso nel periodo selezionato.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente / evento</TableHead>
                  <TableHead>Conto</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="w-[88px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.sale_date).toLocaleDateString("it-IT")}</TableCell>
                    <TableCell>{s.customer_name || s.event_name || "—"}</TableCell>
                    <TableCell>{s.forge_accounts?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs capitalize">{s.payment_status.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-medium text-barber-gold">
                      {money(s.total_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={pending}
                          onClick={() => openEdit(s)}
                          aria-label="Modifica incasso"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          disabled={pending}
                          onClick={() => deleteSale(s)}
                          aria-label="Elimina incasso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader>
            <CardTitle className="text-barber-gold">Per conto</CardTitle>
          </CardHeader>
          <CardContent>
            {initialData.byAccount.map((a) => (
              <div key={a.accountId} className="flex justify-between py-1 text-sm">
                <span>{a.name}</span>
                <span>{money(a.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader>
            <CardTitle className="text-barber-gold">Per evento</CardTitle>
          </CardHeader>
          <CardContent>
            {initialData.byEvent.map((e) => (
              <div key={e.event} className="flex justify-between py-1 text-sm">
                <span>{e.event}</span>
                <span>{money(e.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-barber-gold/25 bg-barber-dark/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-barber-gold">Prodotti più venduti</CardTitle>
          <a href={csvUrl} download="forgia-vendite.csv">
            <Button size="sm" variant="outline">
              Esporta CSV
            </Button>
          </a>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prodotto</TableHead>
                <TableHead>Qtà</TableHead>
                <TableHead className="text-right">Ricavi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.topProducts.map((p) => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.qty}</TableCell>
                  <TableCell className="text-right">{money(p.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editSale} onOpenChange={(o) => !o && setEditSale(null)}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto border-barber-gold/30 bg-barber-dark text-barber-paper">
          <DialogHeader>
            <DialogTitle className="text-barber-gold">Modifica incasso</DialogTitle>
          </DialogHeader>
          {editSale ? (
            <div className="grid gap-3">
              <p className="text-sm text-barber-paper/70">
                Totale vendita: <strong className="text-barber-gold">{money(editSale.total_amount)}</strong>
                {" "}(righe prodotto non modificabili da qui)
              </p>
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="datetime-local"
                  value={editForm.sale_date}
                  onChange={(e) => setEditForm({ ...editForm, sale_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Conto incasso</Label>
                <Select
                  value={editForm.account_id}
                  onValueChange={(v) => setEditForm({ ...editForm, account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona conto" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter((a) => a.active).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Stato pagamento</Label>
                <Select
                  value={editForm.payment_status}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, payment_status: v as ForgePaymentStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagato">Pagato</SelectItem>
                    <SelectItem value="da_pagare">Da pagare</SelectItem>
                    <SelectItem value="parziale">Parziale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cliente</Label>
                <Input
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Evento</Label>
                <Input
                  value={editForm.event_name}
                  onChange={(e) => setEditForm({ ...editForm, event_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSale(null)}>
              Annulla
            </Button>
            <Button disabled={pending} onClick={saveEdit} className="bg-barber-gold text-barber-dark">
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { defaultFrom };

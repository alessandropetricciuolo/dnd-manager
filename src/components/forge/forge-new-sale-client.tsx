"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createForgeSaleAction } from "@/lib/forge/actions";
import type { ForgeAccount, ForgePaymentStatus, ForgeProduct } from "@/lib/forge/types";

type Line = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

type Props = {
  products: ForgeProduct[];
  accounts: ForgeAccount[];
};

export function ForgeNewSaleClient({ products, accounts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paymentStatus, setPaymentStatus] = useState<ForgePaymentStatus>("pagato");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [eventName, setEventName] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [draftProductId, setDraftProductId] = useState("");
  const [draftQty, setDraftQty] = useState("1");

  const activeProducts = products.filter((p) => p.active);
  const total = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0),
    [lines]
  );

  function addLine() {
    const p = activeProducts.find((x) => x.id === draftProductId);
    if (!p) {
      toast.error("Seleziona un prodotto.");
      return;
    }
    const qty = Math.max(1, Number(draftQty) || 1);
    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === p.id ? { ...l, quantity: l.quantity + qty } : l
        );
      }
      return [...prev, { product_id: p.id, quantity: qty, unit_price: Number(p.sale_price) }];
    });
    setDraftQty("1");
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product_id !== productId));
  }

  function updateLinePrice(productId: string, price: number) {
    setLines((prev) =>
      prev.map((l) => (l.product_id === productId ? { ...l, unit_price: price } : l))
    );
  }

  function submit() {
    if (!accountId) {
      toast.error("Seleziona un conto di incasso.");
      return;
    }
    if (!lines.length) {
      toast.error("Aggiungi almeno un prodotto.");
      return;
    }
    startTransition(async () => {
      const res = await createForgeSaleAction({
        payment_status: paymentStatus,
        account_id: accountId,
        customer_name: customerName,
        event_name: eventName,
        note,
        items: lines,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Vendita registrata.");
      router.push("/forge");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-barber-gold">Nuova vendita</h1>
        <p className="text-sm text-barber-paper/60">Registra incasso, scarico magazzino e movimento conto</p>
      </div>

      <Card className="border-barber-gold/25 bg-barber-dark/80">
        <CardHeader>
          <CardTitle className="text-barber-gold">Dettagli</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="space-y-1">
            <Label>Conto incasso *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark">
                <SelectValue placeholder="Seleziona conto" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Stato pagamento</Label>
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as ForgePaymentStatus)}>
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pagato">Pagato</SelectItem>
                <SelectItem value="da_pagare">Da pagare</SelectItem>
                <SelectItem value="parziale">Parziale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Evento</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-barber-gold/25 bg-barber-dark/80">
        <CardHeader>
          <CardTitle className="text-barber-gold">Righe vendita</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1 space-y-1">
              <Label>Prodotto</Label>
              <Select value={draftProductId} onValueChange={setDraftProductId}>
                <SelectTrigger className="border-barber-gold/30 bg-barber-dark">
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  {activeProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (stock {p.stock ?? 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-20 space-y-1">
              <Label>Qtà</Label>
              <Input type="number" min={1} value={draftQty} onChange={(e) => setDraftQty(e.target.value)} />
            </div>
            <Button type="button" variant="outline" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" />
              Aggiungi
            </Button>
          </div>

          {lines.map((line) => {
            const p = products.find((x) => x.id === line.product_id);
            return (
              <div
                key={line.product_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-barber-gold/20 p-3"
              >
                <div>
                  <p className="font-medium">{p?.name}</p>
                  <p className="text-xs text-barber-paper/50">Qtà {line.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-24"
                    value={line.unit_price}
                    onChange={(e) => updateLinePrice(line.product_id, Number(e.target.value) || 0)}
                  />
                  <span className="text-sm text-barber-gold">
                    € {(line.quantity * line.unit_price).toFixed(2)}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => removeLine(line.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t border-barber-gold/20 pt-3 text-lg font-semibold">
            <span>Totale</span>
            <span className="text-barber-gold">€ {total.toFixed(2)}</span>
          </div>

          <Button
            disabled={pending || !lines.length}
            className="w-full bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            onClick={submit}
          >
            {pending ? "Salvataggio…" : "Registra vendita"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

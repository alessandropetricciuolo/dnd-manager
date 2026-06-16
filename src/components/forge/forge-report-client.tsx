"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportData = {
  sales: Array<{
    id: string;
    sale_date: string;
    total_amount: number;
    event_name: string | null;
    forge_accounts?: { name: string } | null;
  }>;
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

export function ForgeReportClient({ initialData, initialFrom, initialTo }: {
  initialData: ReportData;
  initialFrom: string;
  initialTo: string;
}) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const csvUrl = useMemo(() => {
    const header = "data,totale,evento,conto\n";
    const rows = initialData.sales
      .map((s) => {
        const date = new Date(s.sale_date).toISOString();
        const acc = (s as { forge_accounts?: { name: string } }).forge_accounts?.name ?? "";
        return `${date},${s.total_amount},${s.event_name ?? ""},${acc}`;
      })
      .join("\n");
    return `data:text/csv;charset=utf-8,${encodeURIComponent(header + rows)}`;
  }, [initialData.sales]);

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
    </div>
  );
}

export { defaultFrom };

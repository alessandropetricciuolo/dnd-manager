import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { fetchForgeDashboardData } from "@/lib/forge/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export default async function ForgeDashboardPage() {
  const data = await fetchForgeDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-barber-gold sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-barber-paper/60">Panoramica rapida di La Forgia</p>
        </div>
        <Button asChild className="h-11 w-full bg-barber-gold text-barber-dark hover:bg-barber-gold/90 sm:w-auto">
          <Link href="/forge/vendite/nuova">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Nuova vendita
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Incasso totale</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-barber-gold sm:text-2xl">
            {money(data.totalRevenue)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Incasso mese</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-barber-gold sm:text-2xl">
            {money(data.monthRevenue)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Utile stimato</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-emerald-400 sm:text-2xl">
            {money(data.estimatedProfit)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Saldo conti attivi</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-barber-paper sm:text-2xl">
            {money(data.totalBalance)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader>
            <CardTitle className="text-barber-gold">Prodotti attivi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{data.activeProductsCount}</p>
            {data.lowStock.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-amber-300">Sotto soglia minima:</p>
                {data.lowStock.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-200">
                      {p.stock} / min {p.min_stock}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-barber-paper/50">Nessun prodotto sotto soglia.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader>
            <CardTitle className="text-barber-gold">Saldi conti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.accounts.map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span>{a.name}</span>
                <span className="font-medium text-barber-gold">{money(a.balance)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader>
            <CardTitle className="text-barber-gold">Vendite recenti</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.sale_date).toLocaleDateString("it-IT")}</TableCell>
                    <TableCell>{s.customer_name || s.event_name || "—"}</TableCell>
                    <TableCell className="text-right">{money(Number(s.total_amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader>
            <CardTitle className="text-barber-gold">Ultime uscite</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOutflows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.movement_date).toLocaleDateString("it-IT")}</TableCell>
                    <TableCell>{m.reason || m.category || "—"}</TableCell>
                    <TableCell className="text-right text-red-300">
                      {money(Math.abs(Number(m.amount)))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Wallet } from "lucide-react";
import { fetchVaultDashboardData } from "@/lib/vault/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export default async function VaultDashboardPage() {
  const data = await fetchVaultDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-barber-gold sm:text-2xl">Il Vault</h1>
          <p className="text-sm text-barber-paper/60">Contabilità Barber And Dragons</p>
        </div>
        <Button asChild className="h-11 w-full bg-barber-gold text-barber-dark sm:w-auto">
          <Link href="/vault/conti">
            <Wallet className="mr-2 h-4 w-4" />
            Gestisci conti
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Saldo totale</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-barber-gold sm:text-2xl">
            {money(data.totalBalance)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Entrate mese</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-emerald-400 sm:text-2xl">
            {money(data.monthIn)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Uscite mese</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-red-300 sm:text-2xl">
            {money(data.monthOut)}
          </CardContent>
        </Card>
        <Card className="border-barber-gold/25 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-barber-paper/70">Netto mese</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-barber-paper sm:text-2xl">
            {money(data.monthNet)}
          </CardContent>
        </Card>
      </div>

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
          {data.accounts.length === 0 ? (
            <p className="text-sm text-barber-paper/50">Nessun conto attivo. Crea il primo da Conti.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-barber-gold/25 bg-barber-dark/80">
        <CardHeader>
          <CardTitle className="text-barber-gold">Movimenti recenti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentMovements.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 text-sm border-b border-barber-gold/10 pb-2">
              <div className="min-w-0">
                <p className="truncate">{m.reason || m.category || m.type}</p>
                <p className="text-xs text-barber-paper/50">
                  {new Date(m.movement_date).toLocaleString("it-IT")} · {m.type}
                </p>
              </div>
              <span className={Number(m.amount) >= 0 ? "text-emerald-300" : "text-red-300"}>
                {money(Number(m.amount))}
              </span>
            </div>
          ))}
          {data.recentMovements.length === 0 ? (
            <p className="text-sm text-barber-paper/50">Nessun movimento registrato.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

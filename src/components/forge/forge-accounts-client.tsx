"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Pencil } from "lucide-react";
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
  createForgeAccountMovementAction,
  createForgeTransferAction,
  upsertForgeAccountAction,
} from "@/lib/forge/actions";
import type { ForgeAccount, ForgeAccountMovement, ForgeAccountType } from "@/lib/forge/types";

type Props = {
  accounts: ForgeAccount[];
  movementsByAccount: Record<string, ForgeAccountMovement[]>;
};

const ACCOUNT_TYPES: ForgeAccountType[] = ["contanti", "banca", "paypal", "satispay", "altro"];

const OUTFLOW_CATEGORIES = [
  "filamento",
  "manutenzione",
  "spedizione",
  "accessori",
  "materiale fiera",
  "premi torneo",
  "altro",
];

function money(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export function ForgeAccountsClient({ accounts, movementsByAccount }: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [accountForm, setAccountForm] = useState({
    id: undefined as string | undefined,
    name: "",
    type: "contanti" as ForgeAccountType,
    opening_balance: "0",
    active: true,
    note: "",
  });

  const [movForm, setMovForm] = useState({
    type: "uscita" as "uscita" | "correzione",
    amount: "",
    reason: "",
    category: "altro",
    movement_date: new Date().toISOString().slice(0, 16),
  });

  const [transferForm, setTransferForm] = useState({
    from_account_id: "",
    to_account_id: "",
    amount: "",
    note: "",
    movement_date: new Date().toISOString().slice(0, 16),
  });

  const activeAccounts = accounts.filter((a) => a.active);

  function openCreateAccount() {
    setAccountForm({
      id: undefined,
      name: "",
      type: "contanti",
      opening_balance: "0",
      active: true,
      note: "",
    });
    setAccountOpen(true);
  }

  function openEditAccount(a: ForgeAccount) {
    setAccountForm({
      id: a.id,
      name: a.name,
      type: a.type,
      opening_balance: String(a.opening_balance),
      active: a.active,
      note: a.note ?? "",
    });
    setAccountOpen(true);
  }

  function saveAccount() {
    startTransition(async () => {
      const res = await upsertForgeAccountAction({
        id: accountForm.id,
        name: accountForm.name,
        type: accountForm.type,
        opening_balance: Number(accountForm.opening_balance) || 0,
        active: accountForm.active,
        note: accountForm.note,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Conto salvato.");
      setAccountOpen(false);
      window.location.reload();
    });
  }

  function openMovement(accountId: string) {
    setSelectedAccountId(accountId);
    setMovForm({
      type: "uscita",
      amount: "",
      reason: "",
      category: "altro",
      movement_date: new Date().toISOString().slice(0, 16),
    });
    setMovementOpen(true);
  }

  function openTransfer() {
    const first = activeAccounts[0]?.id ?? "";
    const second = activeAccounts[1]?.id ?? "";
    setTransferForm({
      from_account_id: first,
      to_account_id: second,
      amount: "",
      note: "",
      movement_date: new Date().toISOString().slice(0, 16),
    });
    setTransferOpen(true);
  }

  function saveTransfer() {
    const raw = Number(transferForm.amount);
    if (!raw) {
      toast.error("Importo obbligatorio.");
      return;
    }
    if (!transferForm.from_account_id || !transferForm.to_account_id) {
      toast.error("Seleziona conto di origine e destinazione.");
      return;
    }
    if (transferForm.from_account_id === transferForm.to_account_id) {
      toast.error("I due conti devono essere diversi.");
      return;
    }

    startTransition(async () => {
      const res = await createForgeTransferAction({
        from_account_id: transferForm.from_account_id,
        to_account_id: transferForm.to_account_id,
        amount: raw,
        note: transferForm.note,
        movement_date: new Date(transferForm.movement_date).toISOString(),
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Giroconto registrato.");
      setTransferOpen(false);
      window.location.reload();
    });
  }

  function saveMovement() {
    if (!selectedAccountId) return;
    const raw = Number(movForm.amount);
    if (!raw) {
      toast.error("Importo obbligatorio.");
      return;
    }
    const amount =
      movForm.type === "uscita" ? -Math.abs(raw) : movForm.type === "correzione" ? raw : raw;

    startTransition(async () => {
      const res = await createForgeAccountMovementAction({
        account_id: selectedAccountId,
        type: movForm.type,
        amount,
        reason: movForm.reason,
        category: movForm.category,
        movement_date: new Date(movForm.movement_date).toISOString(),
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Movimento registrato.");
      setMovementOpen(false);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-barber-gold sm:text-2xl">Conti</h1>
          <p className="text-sm text-barber-paper/60">Saldi, entrate, uscite e giroconti</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" className="h-11" onClick={openTransfer} disabled={activeAccounts.length < 2}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Giroconto
          </Button>
          <Button onClick={openCreateAccount} className="h-11 bg-barber-gold text-barber-dark">
            <Plus className="mr-2 h-4 w-4" />
            Nuovo conto
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {accounts.map((a) => {
          const movements = movementsByAccount[a.id] ?? [];
          const inflows = movements
            .filter((m) => m.type === "entrata")
            .reduce((s, m) => s + Number(m.amount), 0);
          const outflows = movements
            .filter((m) => m.type === "uscita")
            .reduce((s, m) => s + Math.abs(Number(m.amount)), 0);

          return (
            <Card key={a.id} className="border-barber-gold/25 bg-barber-dark/80">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-barber-gold">{a.name}</CardTitle>
                  <p className="text-xs text-barber-paper/50">{a.type}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEditAccount(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-semibold">{money(a.balance ?? 0)}</div>
                <div className="flex gap-4 text-xs text-barber-paper/60">
                  <span>Entrate: {money(inflows)}</span>
                  <span>Uscite: {money(outflows)}</span>
                </div>
                <Button size="sm" variant="outline" className="h-10 w-full sm:w-auto" onClick={() => openMovement(a.id)}>
                  Registra uscita / correzione
                </Button>
                {movements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.slice(0, 8).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs">
                            {new Date(m.movement_date).toLocaleDateString("it-IT")}
                          </TableCell>
                          <TableCell className="text-xs">{m.type}</TableCell>
                          <TableCell className="text-right text-xs">
                            {money(Number(m.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto border-barber-gold/30 bg-barber-dark text-barber-paper">
          <DialogHeader>
            <DialogTitle>{accountForm.id ? "Modifica conto" : "Nuovo conto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={accountForm.type}
                onValueChange={(v) => setAccountForm({ ...accountForm, type: v as ForgeAccountType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Saldo iniziale</Label>
              <Input
                type="number"
                step="0.01"
                value={accountForm.opening_balance}
                onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea value={accountForm.note} onChange={(e) => setAccountForm({ ...accountForm, note: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={accountForm.active}
                onChange={(e) => setAccountForm({ ...accountForm, active: e.target.checked })}
              />
              Conto attivo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>
              Annulla
            </Button>
            <Button disabled={pending} onClick={saveAccount} className="bg-barber-gold text-barber-dark">
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto border-barber-gold/30 bg-barber-dark text-barber-paper">
          <DialogHeader>
            <DialogTitle>Giroconto tra conti</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Da conto</Label>
              <Select
                value={transferForm.from_account_id}
                onValueChange={(v) => setTransferForm({ ...transferForm, from_account_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona conto" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({money(a.balance ?? 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Verso conto</Label>
              <Select
                value={transferForm.to_account_id}
                onValueChange={(v) => setTransferForm({ ...transferForm, to_account_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona conto" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts
                    .filter((a) => a.id !== transferForm.from_account_id)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({money(a.balance ?? 0)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Importo</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Note (opzionale)</Label>
              <Input
                value={transferForm.note}
                onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="datetime-local"
                value={transferForm.movement_date}
                onChange={(e) => setTransferForm({ ...transferForm, movement_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>
              Annulla
            </Button>
            <Button disabled={pending} onClick={saveTransfer} className="bg-barber-gold text-barber-dark">
              Registra giroconto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto border-barber-gold/30 bg-barber-dark text-barber-paper">
          <DialogHeader>
            <DialogTitle>Movimento conto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={movForm.type}
                onValueChange={(v) => setMovForm({ ...movForm, type: v as "uscita" | "correzione" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uscita">Uscita</SelectItem>
                  <SelectItem value="correzione">Correzione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Importo {movForm.type === "correzione" ? "(+/-)" : ""}</Label>
              <Input
                type="number"
                step="0.01"
                value={movForm.amount}
                onChange={(e) => setMovForm({ ...movForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={movForm.category} onValueChange={(v) => setMovForm({ ...movForm, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTFLOW_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input value={movForm.reason} onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="datetime-local"
                value={movForm.movement_date}
                onChange={(e) => setMovForm({ ...movForm, movement_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>
              Annulla
            </Button>
            <Button disabled={pending} onClick={saveMovement} className="bg-barber-gold text-barber-dark">
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

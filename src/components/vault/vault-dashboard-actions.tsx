"use client";

import { useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createVaultAccountMovementAction } from "@/lib/vault/actions";
import type { VaultAccount, VaultAccountMovementType } from "@/lib/vault/types";

const INFLOW_CATEGORIES = ["eventi", "iscrizioni", "sponsor", "merchandise", "donazioni", "altro"];
const OUTFLOW_CATEGORIES = ["affitto", "stipendi", "materiali", "marketing", "tasse", "forniture", "altro"];

type Props = {
  accounts: Pick<VaultAccount, "id" | "name" | "active" | "balance">[];
};

export function VaultDashboardQuickActions({ accounts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [movForm, setMovForm] = useState({
    type: "entrata" as VaultAccountMovementType,
    account_id: "",
    amount: "",
    reason: "",
    category: "eventi",
    movement_date: new Date().toISOString().slice(0, 16),
  });

  const activeAccounts = accounts.filter((a) => a.active);
  const categories = movForm.type === "entrata" ? INFLOW_CATEGORIES : OUTFLOW_CATEGORIES;

  function openMovement(type: VaultAccountMovementType) {
    setMovForm({
      type,
      account_id: activeAccounts[0]?.id ?? "",
      amount: "",
      reason: "",
      category: type === "entrata" ? "eventi" : "altro",
      movement_date: new Date().toISOString().slice(0, 16),
    });
    setOpen(true);
  }

  function saveMovement() {
    if (!movForm.account_id) {
      toast.error("Seleziona un conto.");
      return;
    }
    const raw = Number(movForm.amount);
    if (!raw) {
      toast.error("Importo obbligatorio.");
      return;
    }
    let amount = raw;
    if (movForm.type === "uscita") amount = -Math.abs(raw);
    if (movForm.type === "entrata") amount = Math.abs(raw);

    startTransition(async () => {
      const res = await createVaultAccountMovementAction({
        account_id: movForm.account_id,
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
      toast.success(movForm.type === "entrata" ? "Entrata registrata." : "Uscita registrata.");
      setOpen(false);
      router.refresh();
    });
  }

  if (activeAccounts.length === 0) return null;

  return (
    <>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-11 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
          disabled={pending}
          onClick={() => openMovement("entrata")}
        >
          <ArrowDownCircle className="mr-2 h-4 w-4" />
          Entrata
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 border-red-500/40 text-red-300 hover:bg-red-950/40"
          disabled={pending}
          onClick={() => openMovement("uscita")}
        >
          <ArrowUpCircle className="mr-2 h-4 w-4" />
          Uscita
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto border-barber-gold/30 bg-barber-dark text-barber-paper">
          <DialogHeader>
            <DialogTitle className="text-barber-gold">
              {movForm.type === "entrata" ? "Nuova entrata" : "Nuova uscita"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Conto</Label>
              <Select
                value={movForm.account_id}
                onValueChange={(v) => setMovForm({ ...movForm, account_id: v })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleziona conto" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
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
                className="h-11"
                value={movForm.amount}
                onChange={(e) => setMovForm({ ...movForm, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select
                value={movForm.category}
                onValueChange={(v) => setMovForm({ ...movForm, category: v })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input
                className="h-11"
                value={movForm.reason}
                onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="datetime-local"
                className="h-11"
                value={movForm.movement_date}
                onChange={(e) => setMovForm({ ...movForm, movement_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button disabled={pending} className="bg-barber-gold text-barber-dark" onClick={saveMovement}>
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

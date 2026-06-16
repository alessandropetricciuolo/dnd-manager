"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { grantVaultAccessAction, revokeVaultAccessAction } from "@/lib/vault/actions";
import type { VaultGmUser } from "@/lib/vault/types";

type Props = { gms: VaultGmUser[] };

export function VaultAccessClient({ gms }: Props) {
  const [pending, startTransition] = useTransition();

  function toggle(user: VaultGmUser, enable: boolean) {
    startTransition(async () => {
      const res = enable
        ? await grantVaultAccessAction(user.id)
        : await revokeVaultAccessAction(user.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(enable ? "Accesso al Vault concesso." : "Accesso revocato.");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-barber-gold sm:text-2xl">Accessi Il Vault</h1>
        <p className="text-sm text-barber-paper/60">Solo gli admin possono abilitare i GM</p>
      </div>
      <div className="space-y-3 md:hidden">
        {gms.map((gm) => {
          const enabled = gm.vault_access?.enabled === true;
          return (
            <div key={gm.id} className="rounded-xl border border-barber-gold/25 bg-barber-dark/80 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{gm.label}</p>
                  <p className="text-xs text-barber-paper/50">
                    {gm.vault_access?.granted_at
                      ? new Date(gm.vault_access.granted_at).toLocaleString("it-IT")
                      : "Mai abilitato"}
                  </p>
                </div>
                <Badge variant="outline" className={enabled ? "border-emerald-500/40 text-emerald-300" : ""}>
                  {enabled ? "Abilitato" : "Off"}
                </Badge>
              </div>
              <div className="mt-3">
                {enabled ? (
                  <Button className="h-11 w-full" variant="outline" disabled={pending} onClick={() => toggle(gm, false)}>
                    Revoca accesso
                  </Button>
                ) : (
                  <Button className="h-11 w-full bg-barber-gold text-barber-dark" disabled={pending} onClick={() => toggle(gm, true)}>
                    Abilita
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-barber-gold/25 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GM</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Concesso il</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gms.map((gm) => {
              const enabled = gm.vault_access?.enabled === true;
              return (
                <TableRow key={gm.id}>
                  <TableCell>{gm.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={enabled ? "border-emerald-500/40 text-emerald-300" : ""}>
                      {enabled ? "Abilitato" : "Non abilitato"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {gm.vault_access?.granted_at
                      ? new Date(gm.vault_access.granted_at).toLocaleString("it-IT")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {enabled ? (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => toggle(gm, false)}>
                        Revoca
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-barber-gold text-barber-dark" disabled={pending} onClick={() => toggle(gm, true)}>
                        Abilita
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

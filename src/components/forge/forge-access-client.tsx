"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { grantForgeAccessAction, revokeForgeAccessAction } from "@/lib/forge/actions";
import type { ForgeGmUser } from "@/lib/forge/types";

type Props = {
  gms: ForgeGmUser[];
};

export function ForgeAccessClient({ gms }: Props) {
  const [pending, startTransition] = useTransition();

  function toggle(user: ForgeGmUser, enable: boolean) {
    startTransition(async () => {
      const res = enable
        ? await grantForgeAccessAction(user.id)
        : await revokeForgeAccessAction(user.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(enable ? "Accesso concesso." : "Accesso revocato.");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-barber-gold">Accessi La Forgia</h1>
        <p className="text-sm text-barber-paper/60">Solo gli admin possono abilitare i GM</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-barber-gold/25">
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
              const enabled = gm.forge_access?.enabled === true;
              return (
                <TableRow key={gm.id}>
                  <TableCell>{gm.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={enabled ? "border-emerald-500/40 text-emerald-300" : ""}>
                      {enabled ? "Abilitato" : "Non abilitato"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {gm.forge_access?.granted_at
                      ? new Date(gm.forge_access.granted_at).toLocaleString("it-IT")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {enabled ? (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => toggle(gm, false)}>
                        Revoca
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-barber-gold text-barber-dark"
                        disabled={pending}
                        onClick={() => toggle(gm, true)}
                      >
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

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { updateLeadStatusAction } from "@/lib/actions/leads";
import type { LeadRow } from "@/app/admin/crm/page";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

const EXPERIENCE_OPTIONS = [
  { value: "all", label: "Tutte le esperienze" },
  { value: "first_time", label: "Prima volta in assoluto" },
  { value: "some", label: "Ho giocato qualche volta" },
  { value: "veteran", label: "Veterano navigato" },
] as const;

const STATUS_OPTIONS = [
  { value: "new", label: "Nuova Recluta" },
  { value: "contacted", label: "Contattato" },
  { value: "converted", label: "Tesserato" },
  { value: "archived", label: "Scartato/Non interessato" },
] as const;

function experienceLabel(level: string | null): string {
  if (!level) return "—";
  const opt = EXPERIENCE_OPTIONS.find((o) => o.value === level);
  return opt?.label ?? level;
}

function experienceBadgeVariant(
  level: string | null
): "default" | "secondary" | "outline" | "npc" | "location" | "monster" | "item" | "lore" {
  if (!level) return "outline";
  if (level === "first_time") return "location"; // verde
  if (level === "some") return "npc"; // ambra
  if (level === "veteran") return "monster"; // rosso
  return "outline";
}

export function LeadsCrmTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [experienceFilter, setExperienceFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = leads;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q)
      );
    }
    if (experienceFilter !== "all") {
      list = list.filter((l) => l.experience_level === experienceFilter);
    }
    return list;
  }, [leads, search, experienceFilter]);

  async function handleStatusChange(leadId: string, newStatus: string) {
    setUpdatingId(leadId);
    const id = toast.loading("Aggiornamento stato...");
    const result = await updateLeadStatusAction(leadId, newStatus);
    toast.dismiss(id);
    setUpdatingId(null);
    if (result.success) {
      toast.success("Stato recluta aggiornato");
      router.refresh();
    } else {
      toast.error(result.message ?? "Errore aggiornamento");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          type="search"
          placeholder="Cerca per nome o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-barber-dark/80 border-barber-gold/25 text-barber-paper placeholder:text-barber-paper/50"
        />
        <Select
          value={experienceFilter}
          onValueChange={setExperienceFilter}
        >
          <SelectTrigger className="w-[220px] border-barber-gold/25 bg-barber-dark/80 text-barber-paper">
            <SelectValue placeholder="Esperienza" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-barber-gold/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-barber-gold/20 hover:bg-transparent">
              <TableHead className="text-barber-paper/80">Data Iscrizione</TableHead>
              <TableHead className="text-barber-paper/80">Nome & Email</TableHead>
              <TableHead className="text-barber-paper/80">Esperienza</TableHead>
              <TableHead className="text-barber-paper/80">Origine</TableHead>
              <TableHead className="text-barber-paper/80">Consenso</TableHead>
              <TableHead className="text-barber-paper/80">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-barber-paper/60 py-8">
                  Nessuna recluta trovata.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow key={lead.id} className="border-barber-gold/10">
                  <TableCell className="text-barber-paper/90 whitespace-nowrap">
                    {format(new Date(lead.created_at), "d MMM, HH:mm", { locale: it })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-barber-paper">{lead.name}</span>
                      <span className="text-sm text-barber-paper/70">{lead.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={experienceBadgeVariant(lead.experience_level)}>
                      {experienceLabel(lead.experience_level)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-barber-paper/80 border-barber-gold/30">
                      {lead.source ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.marketing_opt_in ? (
                      <Check className="h-5 w-5 text-green-500" aria-label="Sì" />
                    ) : (
                      <X className="h-5 w-5 text-red-500/80" aria-label="No" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => handleStatusChange(lead.id, v)}
                      disabled={updatingId === lead.id}
                    >
                      <SelectTrigger className="w-full min-w-[160px] border-barber-gold/25 bg-barber-dark/80 text-barber-paper disabled:opacity-70">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type LeadExportRow = {
  created_at: string;
  name: string;
  email: string;
  experience_level: string | null;
  source: string | null;
  marketing_opt_in: boolean;
  status: string;
};

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function experienceLabel(level: string | null): string {
  if (!level) return "";
  if (level === "first_time") return "Prima volta in assoluto";
  if (level === "some") return "Ho giocato qualche volta";
  if (level === "veteran") return "Veterano navigato";
  return level;
}

function statusLabel(status: string): string {
  if (status === "new") return "Nuova Recluta";
  if (status === "contacted") return "Contattato";
  if (status === "converted") return "Tesserato";
  if (status === "archived") return "Scartato/Non interessato";
  return status;
}

export function ExportCsvButton({ data }: { data: LeadExportRow[] }) {
  function handleExport() {
    const headers = [
      "Data Iscrizione",
      "Nome",
      "Email",
      "Esperienza",
      "Origine",
      "Marketing Opt-in",
      "Stato",
    ];

    const rows = data.map((lead) => {
      const date = new Date(lead.created_at).toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return [
        escapeCsv(date),
        escapeCsv(lead.name ?? ""),
        escapeCsv(lead.email ?? ""),
        escapeCsv(experienceLabel(lead.experience_level)),
        escapeCsv(lead.source ?? ""),
        escapeCsv(lead.marketing_opt_in ? "Sì" : "No"),
        escapeCsv(statusLabel(lead.status)),
      ].join(",");
    });

    const csvContent = [headers.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `gilda-leads-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="border-barber-gold/30 text-barber-gold hover:bg-barber-gold/10"
      onClick={handleExport}
      disabled={data.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      Esporta CSV
    </Button>
  );
}


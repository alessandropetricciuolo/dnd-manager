"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importCampaignFull, type ImportCampaignJson } from "@/app/admin/import-actions";

export function ImportCampaignForm() {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    const raw = json.trim();
    if (!raw) {
      toast.error("Incolla il JSON della campagna.");
      return;
    }
    let data: ImportCampaignJson;
    try {
      data = JSON.parse(raw) as ImportCampaignJson;
    } catch {
      toast.error("JSON non valido. Controlla la sintassi.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await importCampaignFull(data);
      if (result.success) {
        toast.success(`Campagna importata. ID: ${result.campaignId}`);
        setJson("");
        router.push(`/campaigns/${result.campaignId}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error("Errore durante l'import.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="import-json" className="text-barber-paper/90">
          JSON campagna
        </Label>
        <Textarea
          id="import-json"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder='{"campaign":{"name":"..."}, "wiki":[], "maps":[], "characters":[], "gm_secrets":[]}'
          className="min-h-[280px] font-mono text-sm bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/40"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading}
        className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
      >
        {isLoading ? "Importazione..." : "Importa campagna"}
      </Button>
    </form>
  );
}

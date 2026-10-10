"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setCampaignDocument } from "@/app/campaigns/campaign-document-actions";

export function CampaignDocumentButton({ campaignId, entityId, document, updatedAt }: { campaignId: string; entityId: string; document: boolean; updatedAt: string }) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function move() {
    setSaving(true);
    try {
      const result = await setCampaignDocument(entityId, campaignId, !document, updatedAt);
      if (!result.success) { toast.error(result.message); return; }
      toast.success(result.message);
      router.refresh();
    } catch { toast.error("Impossibile cambiare la collocazione."); }
    finally { setSaving(false); }
  }
  return <Button variant="outline" size="sm" disabled={saving} onClick={move}>
    {saving ? "Spostamento…" : document ? "Riporta nella Wiki" : "Sposta nei Documenti di campagna"}
  </Button>;
}

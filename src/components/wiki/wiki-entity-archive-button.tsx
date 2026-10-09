"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setWikiEntityArchived } from "@/app/campaigns/wiki-actions";
import { cn } from "@/lib/utils";

type WikiEntityArchiveButtonProps = {
  campaignId: string;
  entityId: string;
  archived: boolean;
  compact?: boolean;
};

export function WikiEntityArchiveButton({
  campaignId,
  entityId,
  archived,
  compact = false,
}: WikiEntityArchiveButtonProps) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const label = archived ? "Ripristina" : "Archivia";

  async function handleClick() {
    setSaving(true);
    try {
      const result = await setWikiEntityArchived(entityId, campaignId, !archived);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  const Icon = saving ? Loader2 : archived ? ArchiveRestore : Archive;
  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "sm"}
      className={cn(
        "border-brass-base/40 bg-[#140e08] text-parchment-200 hover:border-brass-light hover:bg-brass-base/20 hover:text-gold-relief",
        compact ? "h-6 w-6" : "h-7 px-2 text-[11px] font-serif",
      )}
      disabled={saving}
      onClick={handleClick}
      title={label}
      aria-label={`${label} voce Wiki`}
    >
      <Icon className={cn("shrink-0", compact ? "h-3 w-3" : "mr-1 h-3.5 w-3.5", saving && "animate-spin")} />
      {!compact && label}
    </Button>
  );
}

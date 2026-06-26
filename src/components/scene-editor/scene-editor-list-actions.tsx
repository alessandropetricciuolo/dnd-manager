"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { duplicateSceneDocumentAction } from "@/app/campaigns/scene-document-actions";
import { Button } from "@/components/ui/button";

type Props = {
  campaignId: string;
  sceneId: string;
};

export function SceneEditorListActions({ campaignId, sceneId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      const res = await duplicateSceneDocumentAction(campaignId, sceneId);
      if (!res.success) {
        toast.error(res.error ?? "Duplicazione fallita.");
        return;
      }
      toast.success("Scena duplicata. Apri e salva per rigenerare le anteprime.");
      router.push(`/campaigns/${campaignId}/gm-only/scene-editor/${res.data!.sceneDocumentId}`);
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" variant="outline" className="border-barber-gold/40" asChild>
        <Link href={`/campaigns/${campaignId}/gm-only/scene-editor/${sceneId}`}>
          <Pencil className="mr-1 h-4 w-4" />
          Modifica
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-barber-gold/40"
        disabled={pending}
        onClick={handleDuplicate}
      >
        <Copy className="mr-1 h-4 w-4" />
        {pending ? "Copia..." : "Duplica"}
      </Button>
    </div>
  );
}

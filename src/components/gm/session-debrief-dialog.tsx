"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  getCoreEntitiesForDebrief,
  saveSessionDebrief,
  type CoreEntityForDebrief,
} from "@/app/campaigns/gm-actions";
import { Flag, Loader2 } from "lucide-react";

const STORAGE_KEY_PREFIX = "gm-screen-initiative-";

type SessionDebriefDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionLabel?: string;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  onSuccess?: () => void;
};

export function SessionDebriefDialog({
  open,
  onOpenChange,
  sessionId,
  sessionLabel,
  campaignId,
  campaignType,
  onSuccess,
}: SessionDebriefDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [summary, setSummary] = useState("");
  const [gmPrivateNotes, setGmPrivateNotes] = useState("");
  const [coreEntities, setCoreEntities] = useState<CoreEntityForDebrief[]>([]);
  const [statusByEntityId, setStatusByEntityId] = useState<Record<string, "alive" | "dead" | "missing">>({});
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLongCampaign = campaignType === "long";

  const loadTrackerEntityIds = useCallback(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${campaignId}`);
      if (!raw) return { entityIds: [] as string[], zeroHpEntityIds: new Set<string>() };
      const parsed = JSON.parse(raw) as { entries?: Array<{ entityId?: string; hp?: number }> };
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const entityIds = [...new Set(entries.map((e) => e.entityId).filter(Boolean))] as string[];
      const zeroHpEntityIds = new Set(
        entries.filter((e) => e.entityId && e.hp === 0).map((e) => e.entityId as string)
      );
      return { entityIds, zeroHpEntityIds };
    } catch {
      return { entityIds: [] as string[], zeroHpEntityIds: new Set<string>() };
    }
  }, [campaignId]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSummary("");
      setGmPrivateNotes("");
      setCoreEntities([]);
      setStatusByEntityId({});
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || step !== 2 || !campaignId) return;
    setLoadingEntities(true);
    const { entityIds, zeroHpEntityIds } = loadTrackerEntityIds();
    getCoreEntitiesForDebrief(campaignId, entityIds)
      .then((res) => {
        setLoadingEntities(false);
        if (res.success && res.data) {
          setCoreEntities(res.data);
          const initial: Record<string, "alive" | "dead" | "missing"> = {};
          for (const e of res.data) {
            const status = e.global_status === "missing" ? "missing" : e.global_status === "dead" ? "dead" : "alive";
            initial[e.id] = zeroHpEntityIds.has(e.id) ? "dead" : status;
          }
          setStatusByEntityId(initial);
        } else {
          setCoreEntities([]);
        }
      })
      .catch(() => {
        setLoadingEntities(false);
        setCoreEntities([]);
      });
  }, [open, step, campaignId, loadTrackerEntityIds]);

  async function handleSubmit() {
    if (saving) return;
    setSaving(true);
    const entityStatusUpdates = { ...statusByEntityId };
    const result = await saveSessionDebrief(sessionId, {
      summary: summary.trim(),
      gm_private_notes: gmPrivateNotes.trim() || null,
      entityStatusUpdates,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Sessione conclusa. Riassunto e stato del mondo salvati.");
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  }

  function handleNext() {
    if (step === 1) setStep(2);
    else handleSubmit();
  }

  const isStep2Submit = step === 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col border-amber-600/30 bg-zinc-900 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Flag className="h-5 w-5" />
            Concludi Sessione
            {sessionLabel && (
              <span className="text-sm font-normal text-zinc-400">
                — {sessionLabel}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === 1
              ? "Step 1: Scrivi un riassunto narrativo della sessione. Sarà salvato sulla sessione."
              : "Step 2: Verifica lo stato degli elementi Core (presenti nel Tracker). Solo per campagne Long le modifiche aggiornano il mondo condiviso."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="debrief-summary" className="text-zinc-300">
                  Riassunto pubblico
                </Label>
                <Textarea
                  id="debrief-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Cosa è successo in questa sessione? Visibile ai partecipanti del gruppo."
                  rows={8}
                  className="min-h-[160px] resize-y bg-zinc-800 border-amber-600/30 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debrief-gm-notes" className="text-red-300/90">
                  Note segrete GM
                </Label>
                <Textarea
                  id="debrief-gm-notes"
                  value={gmPrivateNotes}
                  onChange={(e) => setGmPrivateNotes(e.target.value)}
                  placeholder="Appunti privati, piani futuri, segreti... Solo tu le vedrai."
                  rows={4}
                  className="min-h-[100px] resize-y border border-dashed border-red-500/50 bg-red-950/20 text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {loadingEntities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                </div>
              ) : coreEntities.length === 0 ? (
                <p className="rounded border border-amber-600/20 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-400">
                  Nessun elemento Core nel Tracker per questa sessione. Se nella campagna Long avevi
                  NPC/Mostri Core nel Tracker, verranno comunque salvati riassunto e chiusura.
                </p>
              ) : (
                <div className="space-y-2">
                  <Label className="text-zinc-300">
                    Stato mondo (solo elementi Core dal Tracker)
                    {!isLongCampaign && (
                      <span className="ml-2 text-xs text-zinc-500">
                        (Campagna non Long: le modifiche non aggiornano il mondo condiviso)
                      </span>
                    )}
                  </Label>
                  <ul className="space-y-2">
                    {coreEntities.map((entity) => (
                      <li
                        key={entity.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-600/20 bg-zinc-800/50 px-3 py-2"
                      >
                        <span className="font-medium text-zinc-100">
                          {entity.name}
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            {entity.type}
                          </span>
                        </span>
                        <Select
                          value={statusByEntityId[entity.id] ?? entity.global_status}
                          onValueChange={(v) =>
                            setStatusByEntityId((prev) => ({ ...prev, [entity.id]: v as "alive" | "dead" | "missing" }))
                          }
                        >
                          <SelectTrigger className="w-[140px] border-amber-600/30 bg-zinc-900 text-zinc-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-amber-600/20 bg-zinc-900">
                            <SelectItem value="alive" className="text-zinc-300 focus:bg-amber-600/20">
                              Vivo
                            </SelectItem>
                            <SelectItem value="dead" className="text-zinc-300 focus:bg-amber-600/20">
                              Morto
                            </SelectItem>
                            <SelectItem value="missing" className="text-zinc-300 focus:bg-amber-600/20">
                              Scomparso
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-amber-600/20 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-amber-600/40 text-zinc-300"
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={saving || (step === 2 && loadingEntities)}
            className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {step === 1 ? "Avanti" : "Concludi e salva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

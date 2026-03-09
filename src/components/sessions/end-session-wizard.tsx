"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { User, UserX, Lock, Loader2, BookOpen, Map as MapIcon, Search } from "lucide-react";
import {
  getApprovedSignupsForSession,
  getUnlockableContent,
  closeSessionAction,
  type CloseSessionActionPayload,
  type UnlockableItem,
} from "@/app/campaigns/actions";
import { getCoreEntitiesForDebrief, type CoreEntityForDebrief } from "@/app/campaigns/gm-actions";
import { cn } from "@/lib/utils";

const STORAGE_KEY_PREFIX = "gm-screen-initiative-";
const GROUP_ORDER = ["Mappe", "NPC", "Luoghi", "Mostri", "Oggetti", "Lore", "Wiki"];

function itemKey(item: UnlockableItem): string {
  return `${item.type}-${item.id}`;
}

export type ApprovedSignupForWizard = {
  id: string;
  player_id: string;
  player_name: string;
};

type EndSessionWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  sessionLabel?: string;
  /** Se passato, non viene fatto fetch degli iscritti (es. da pagina Sessioni). */
  initialApprovedSignups?: ApprovedSignupForWizard[];
  onSuccess?: () => void;
};

const STEPS = [
  { id: 1, label: "Logistica" },
  { id: 2, label: "Diario" },
  { id: 3, label: "Mondo" },
  { id: 4, label: "Conferma" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function EndSessionWizard({
  open,
  onOpenChange,
  sessionId,
  campaignId,
  campaignType,
  sessionLabel,
  initialApprovedSignups,
  onSuccess,
}: EndSessionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(1);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [signups, setSignups] = useState<ApprovedSignupForWizard[]>([]);

  const [attendance, setAttendance] = useState<Record<string, "attended" | "absent">>({});
  const [xpGained, setXpGained] = useState(0);
  const [unlockContent, setUnlockContent] = useState(false);
  const [secretItems, setSecretItems] = useState<UnlockableItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedContentKeys, setSelectedContentKeys] = useState<Set<string>>(new Set());
  const [contentSearch, setContentSearch] = useState("");

  const [summary, setSummary] = useState("");
  const [gmPrivateNotes, setGmPrivateNotes] = useState("");

  const [coreEntities, setCoreEntities] = useState<CoreEntityForDebrief[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [statusByEntityId, setStatusByEntityId] = useState<Record<string, "alive" | "dead" | "missing">>({});

  const [submitting, setSubmitting] = useState(false);

  const isLongCampaign = campaignType === "long";
  const isOneshot = campaignType === "oneshot";

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
    if (!open) return;
    setStep(1);
    setSummary("");
    setGmPrivateNotes("");
    setSelectedContentKeys(new Set());
    setContentSearch("");
    setStatusByEntityId({});
    if (initialApprovedSignups?.length) {
      setSignups(initialApprovedSignups);
      setAttendance(
        initialApprovedSignups.reduce((acc, s) => ({ ...acc, [s.player_id]: "attended" as const }), {})
      );
    } else {
      setLoadingSignups(true);
      getApprovedSignupsForSession(sessionId).then((res) => {
        setLoadingSignups(false);
        if (res.success && res.data) {
          setSignups(res.data);
          setAttendance(res.data.reduce((acc, s) => ({ ...acc, [s.player_id]: "attended" as const }), {}));
        } else {
          setSignups([]);
        }
      });
    }
  }, [open, sessionId, initialApprovedSignups]);

  useEffect(() => {
    if (!open || step !== 1 || !unlockContent || !campaignId) return;
    setItemsLoading(true);
    getUnlockableContent(campaignId).then((res) => {
      setItemsLoading(false);
      if (res.success) setSecretItems(res.items ?? []);
      else setSecretItems([]);
    });
  }, [open, step, unlockContent, campaignId]);

  useEffect(() => {
    if (!open || step !== 3 || !campaignId || !isLongCampaign) return;
    setLoadingEntities(true);
    const { entityIds, zeroHpEntityIds } = loadTrackerEntityIds();
    getCoreEntitiesForDebrief(campaignId, entityIds).then((res) => {
      setLoadingEntities(false);
      if (res.success && res.data) {
        setCoreEntities(res.data);
        const initial: Record<string, "alive" | "dead" | "missing"> = {};
        for (const e of res.data) {
          initial[e.id] = zeroHpEntityIds.has(e.id) ? "dead" : (e.global_status ?? "alive");
        }
        setStatusByEntityId(initial);
      } else {
        setCoreEntities([]);
      }
    });
  }, [open, step, campaignId, isLongCampaign, loadTrackerEntityIds]);

  const filteredAndGrouped = useMemo(() => {
    const q = contentSearch.trim().toLowerCase();
    const list = q ? secretItems.filter((i) => i.name.toLowerCase().includes(q)) : secretItems;
    const byGroup = new Map<string, UnlockableItem[]>();
    for (const item of list) {
      const g = item.groupLabel;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(item);
    }
    const ordered: { groupLabel: string; items: UnlockableItem[] }[] = [];
    for (const g of GROUP_ORDER) {
      const items = byGroup.get(g);
      if (items?.length) ordered.push({ groupLabel: g, items });
    }
    byGroup.forEach((items, g) => {
      if (!GROUP_ORDER.includes(g)) ordered.push({ groupLabel: g, items });
    });
    return ordered;
  }, [secretItems, contentSearch]);

  const canProceedStep1 = useMemo(() => {
    if (signups.length === 0) return false;
    return signups.every((s) => attendance[s.player_id] === "attended" || attendance[s.player_id] === "absent");
  }, [signups, attendance]);

  const canProceedStep2 = summary.trim().length > 0;

  const canProceedStep3 = isOneshot || isLongCampaign;

  const handleNext = () => {
    if (step < 4) setStep((s) => (s + 1) as StepId);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as StepId);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const presentUserIds = signups.filter((s) => attendance[s.player_id] === "attended").map((s) => s.player_id);
    const payload: CloseSessionActionPayload = {
      attendance,
      xpGained: Math.max(0, Math.floor(xpGained)),
      unlockContent: unlockContent && selectedContentKeys.size > 0,
      unlockContentIds: unlockContent
        ? [...selectedContentKeys].map((key) => {
            const [type, ...idParts] = key.split("-");
            return { id: idParts.join("-"), type: type as "wiki" | "map" };
          })
        : [],
      summary: summary.trim(),
      gm_private_notes: gmPrivateNotes.trim() || null,
      entityStatusUpdates: isLongCampaign ? statusByEntityId : {},
    };
    const res = await closeSessionAction(sessionId, payload);
    setSubmitting(false);
    if (res.success) {
      toast.success(res.message);
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  const toggleContent = (key: string) => {
    setSelectedContentKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setPresence = (playerId: string, value: "attended" | "absent") => {
    setAttendance((prev) => ({ ...prev, [playerId]: value }));
  };

  const presentCount = signups.filter((s) => attendance[s.player_id] === "attended").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-barber-gold">
            Chiudi sessione
            {sessionLabel && <span className="text-sm font-normal text-barber-paper/70">— {sessionLabel}</span>}
          </DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Step {step} di 4: {STEPS.find((s) => s.id === step)?.label}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex gap-1 rounded-lg border border-barber-gold/20 bg-barber-dark/80 p-1">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex-1 rounded py-1 text-center text-xs font-medium",
                step === s.id ? "bg-barber-gold/30 text-barber-gold" : "text-barber-paper/50"
              )}
            >
              {s.id}. {s.label}
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
          {/* Step 1: Logistica & Presenze */}
          {step === 1 && (
            <>
              {loadingSignups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-barber-gold" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-barber-paper/90">Presenze</Label>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {signups.length === 0 ? (
                        <p className="text-sm text-barber-paper/60">Nessun giocatore approvato per questa sessione.</p>
                      ) : (
                        signups.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-barber-gold/30 px-3 py-2"
                          >
                            <span className="text-sm font-medium text-barber-paper">{s.player_name}</span>
                            <div className="flex items-center gap-3">
                              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-barber-paper/80">
                                <input
                                  type="radio"
                                  name={`att-${s.player_id}`}
                                  checked={attendance[s.player_id] === "attended"}
                                  onChange={() => setPresence(s.player_id, "attended")}
                                  className="border-barber-gold/40 text-barber-gold"
                                />
                                <User className="h-4 w-4 text-barber-gold" />
                                Presente
                              </label>
                              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-barber-paper/80">
                                <input
                                  type="radio"
                                  name={`att-${s.player_id}`}
                                  checked={attendance[s.player_id] === "absent"}
                                  onChange={() => setPresence(s.player_id, "absent")}
                                  className="border-barber-gold/40 text-red-500"
                                />
                                <UserX className="h-4 w-4 text-red-400/80" />
                                Assente
                              </label>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wizard-xp" className="text-barber-paper/90">
                      XP guadagnati (assegnati a tutti i presenti)
                    </Label>
                    <Input
                      id="wizard-xp"
                      type="number"
                      min={0}
                      value={xpGained || ""}
                      onChange={(e) => setXpGained(parseInt(e.target.value, 10) || 0)}
                      className="border-barber-gold/30 bg-barber-dark text-barber-paper"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper/90">
                      <input
                        type="checkbox"
                        checked={unlockContent}
                        onChange={(e) => setUnlockContent(e.target.checked)}
                        className="h-4 w-4 rounded border-barber-gold/40 text-barber-gold focus:ring-barber-gold"
                      />
                      Sblocca contenuti associati
                    </label>
                    {unlockContent && (
                      <div className="space-y-2 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-barber-paper/50" />
                          <Input
                            placeholder="Cerca contenuti..."
                            value={contentSearch}
                            onChange={(e) => setContentSearch(e.target.value)}
                            className="border-barber-gold/20 bg-barber-dark pl-8 text-barber-paper text-sm"
                          />
                        </div>
                        <div className="max-h-40 space-y-1 overflow-y-auto">
                          {itemsLoading ? (
                            <p className="text-xs text-barber-paper/60">Caricamento…</p>
                          ) : (
                            filteredAndGrouped.map(({ groupLabel, items }) => (
                              <div key={groupLabel} className="space-y-1">
                                <p className="text-xs font-semibold text-barber-paper/60">{groupLabel}</p>
                                {items.map((item) => {
                                  const key = itemKey(item);
                                  return (
                                    <label
                                      key={key}
                                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-barber-gold/10"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedContentKeys.has(key)}
                                        onChange={() => toggleContent(key)}
                                        className="rounded border-barber-gold/40 text-barber-gold"
                                      />
                                      {groupLabel === "Mappe" ? (
                                        <MapIcon className="h-3.5 w-3.5 text-barber-paper/60" />
                                      ) : (
                                        <BookOpen className="h-3.5 w-3.5 text-barber-paper/60" />
                                      )}
                                      {item.name}
                                    </label>
                                  );
                                })}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2: Diario */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-summary" className="text-barber-paper/90">
                  Riassunto pubblico
                </Label>
                <Textarea
                  id="wizard-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Cosa è successo in questa sessione? Visibile ai partecipanti."
                  rows={6}
                  className="min-h-[120px] resize-y border-barber-gold/30 bg-barber-dark text-barber-paper"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-gm-notes" className="flex items-center gap-1.5 text-red-300/90">
                  <Lock className="h-4 w-4" />
                  Note segrete GM
                </Label>
                <Textarea
                  id="wizard-gm-notes"
                  value={gmPrivateNotes}
                  onChange={(e) => setGmPrivateNotes(e.target.value)}
                  placeholder="Appunti privati, piani futuri... Solo tu le vedrai."
                  rows={4}
                  className="min-h-[80px] resize-y border border-dashed border-red-500/50 bg-red-950/20 text-barber-paper placeholder:text-barber-paper/50"
                />
              </div>
            </div>
          )}

          {/* Step 3: Mondo */}
          {step === 3 && (
            <>
              {isOneshot ? (
                <p className="rounded-lg border border-barber-gold/20 bg-barber-dark/60 px-4 py-6 text-center text-sm text-barber-paper/70">
                  Nessuna conseguenza persistente per questa campagna one-shot.
                </p>
              ) : isLongCampaign ? (
                <>
                  {loadingEntities ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-barber-gold" />
                    </div>
                  ) : coreEntities.length === 0 ? (
                    <p className="rounded-lg border border-barber-gold/20 bg-barber-dark/60 px-4 py-6 text-center text-sm text-barber-paper/70">
                      Nessun NPC/Mostro Core nel Tracker per questa sessione. Puoi aggiornare lo stato del mondo dalla Wiki in seguito.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-barber-paper/90">Stato mondo (elementi Core dal Tracker)</Label>
                      <ul className="space-y-2">
                        {coreEntities.map((entity) => (
                          <li
                            key={entity.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-barber-gold/20 bg-barber-dark/60 px-3 py-2"
                          >
                            <span className="font-medium text-barber-paper">
                              {entity.name}
                              <span className="ml-2 text-xs font-normal text-barber-paper/50">{entity.type}</span>
                            </span>
                            <Select
                              value={statusByEntityId[entity.id] ?? entity.global_status ?? "alive"}
                              onValueChange={(v) =>
                                setStatusByEntityId((prev) => ({ ...prev, [entity.id]: v as "alive" | "dead" | "missing" }))
                              }
                            >
                              <SelectTrigger className="w-[140px] border-barber-gold/30 bg-barber-dark text-barber-paper">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-barber-gold/20 bg-barber-dark">
                                <SelectItem value="alive" className="text-barber-paper focus:bg-barber-gold/20">
                                  Vivo
                                </SelectItem>
                                <SelectItem value="dead" className="text-barber-paper focus:bg-barber-gold/20">
                                  Morto
                                </SelectItem>
                                <SelectItem value="missing" className="text-barber-paper focus:bg-barber-gold/20">
                                  Scomparso
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-barber-paper/70">Nessuna modifica allo stato del mondo per questo tipo di campagna.</p>
              )}
            </>
          )}

          {/* Step 4: Conferma */}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <p className="text-barber-paper/80">
                <strong>Presenze:</strong> {presentCount} presenti su {signups.length} iscritti.
                {xpGained > 0 && ` • XP assegnati: ${xpGained} a ciascun presente.`}
              </p>
              {unlockContent && selectedContentKeys.size > 0 && (
                <p className="text-barber-paper/80">
                  <strong>Sblocco contenuti:</strong> {selectedContentKeys.size} contenuti per i presenti.
                </p>
              )}
              <p className="text-barber-paper/80">
                <strong>Riassunto:</strong> {summary.trim().slice(0, 120)}
                {summary.trim().length > 120 ? "…" : ""}
              </p>
              {isLongCampaign && coreEntities.length > 0 && (
                <p className="text-barber-paper/80">
                  <strong>Stato mondo:</strong> {coreEntities.length} elementi core aggiornati.
                </p>
              )}
              <p className="pt-2 text-barber-paper/60">Clicca &quot;Concludi Sessione&quot; per salvare tutto.</p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-barber-gold/20 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 1 ? onOpenChange(false) : handleBack())}
            className="border-barber-gold/40 text-barber-paper"
            disabled={submitting}
          >
            {step === 1 ? "Annulla" : "Indietro"}
          </Button>
          {step < 4 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            >
              Avanti
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Concludi Sessione
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getLongCampaignEconomySnapshot,
  type EconomyCharacterSnapshot,
  type EconomyMissionSnapshot,
  type SessionEconomyPayload,
} from "@/lib/actions/campaign-economy-actions";
import { useRouter } from "nextjs-toploader/app";
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
import { User, UserX, Lock, Loader2, BookOpen, Map as MapIcon, Search, Award, Trophy, Medal, Star, Plus, X } from "lucide-react";
import {
  getApprovedSignupsForSession,
  getUnlockableContent,
  getAchievementsForWizard,
  closeSessionAction,
  preCloseSessionAction,
  getSessionWizardMeta,
  type CloseSessionActionPayload,
  type UnlockableItem,
  type AchievementForWizard,
} from "@/app/campaigns/actions";
import { getCoreEntitiesForDebrief, type CoreEntityForDebrief } from "@/app/campaigns/gm-actions";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Trophy,
  Medal,
  Star,
};
function AchievementIcon({ iconName }: { iconName: string }) {
  const Icon = ICON_MAP[iconName] ?? Award;
  return <Icon className="h-4 w-4 shrink-0 text-barber-gold/90" />;
}

const STORAGE_KEY_PREFIX = "gm-screen-initiative-";
const GROUP_ORDER = ["Mappe", "NPC", "Luoghi", "Mostri", "Oggetti", "Lore", "Wiki"];

/** Ordine categorie achievement nello step Trofei: Titoli di Fine Sessione sempre in cima. */
const ACHIEVEMENT_CATEGORY_ORDER = [
  "Titoli di Fine Sessione",
  "Combattimento",
  "Esplorazione",
  "Storia",
  "Generale",
];
function orderAchievementCategories(categories: string[]): string[] {
  const set = new Set(categories);
  const ordered: string[] = [];
  for (const c of ACHIEVEMENT_CATEGORY_ORDER) {
    if (set.has(c)) ordered.push(c);
  }
  const rest = categories.filter((c) => !ACHIEVEMENT_CATEGORY_ORDER.includes(c)).sort();
  return [...ordered, ...rest];
}

function itemKey(item: UnlockableItem): string {
  return `${item.type}-${item.id}`;
}

export type ApprovedSignupForWizard = {
  id: string;
  player_id: string;
  player_name: string;
  status?: string;
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

type StepId = 1 | 2 | 3 | 4 | 5 | 6;

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
  /** Ore di gioco (Epoch) sommate ai PG dei presenti (assigned_to). */
  const [elapsedHours, setElapsedHours] = useState(0);
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

  const [achievements, setAchievements] = useState<AchievementForWizard[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [awardedAchievements, setAwardedAchievements] = useState<
    { playerId: string; achievementId: string; addedProgress: number }[]
  >([]);

  const [achievementSearchByPlayer, setAchievementSearchByPlayer] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [preClosing, setPreClosing] = useState(false);
  const [isPreClosed, setIsPreClosed] = useState(false);

  const isLongCampaign = campaignType === "long";
  const isOneshot = campaignType === "oneshot";

  const confirmStep = isLongCampaign ? 6 : 5;
  const worldStep = isLongCampaign ? 4 : 3;
  const trophiesStep = isLongCampaign ? 5 : 4;

  const wizardSteps = useMemo(
    () =>
      isLongCampaign
        ? ([
            { id: 1 as const, label: "Logistica" },
            { id: 2 as const, label: "Diario" },
            { id: 3 as const, label: "Economia" },
            { id: 4 as const, label: "Mondo" },
            { id: 5 as const, label: "Trofei (Opzionale)" },
            { id: 6 as const, label: "Conferma" },
          ] as const)
        : ([
            { id: 1 as const, label: "Logistica" },
            { id: 2 as const, label: "Diario" },
            { id: 3 as const, label: "Mondo" },
            { id: 4 as const, label: "Trofei (Opzionale)" },
            { id: 5 as const, label: "Conferma" },
          ] as const),
    [isLongCampaign]
  );

  const [economyLoading, setEconomyLoading] = useState(false);
  const [economyMissions, setEconomyMissions] = useState<EconomyMissionSnapshot[]>([]);
  const [economyCharacters, setEconomyCharacters] = useState<EconomyCharacterSnapshot[]>([]);
  const [payoutMissionId, setPayoutMissionId] = useState<string>("");
  const [payoutAlloc, setPayoutAlloc] = useState<Record<string, { gp: string; sp: string; cp: string }>>({});
  const [coinDeltaAlloc, setCoinDeltaAlloc] = useState<Record<string, { gp: string; sp: string; cp: string }>>({});

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
    setIsPreClosed(false);
    setSummary("");
    setGmPrivateNotes("");
    setSelectedContentKeys(new Set());
    setContentSearch("");
    setStatusByEntityId({});
    setAwardedAchievements([]);
    setAchievementSearchByPlayer({});
    setElapsedHours(0);
    setPayoutMissionId("");
    setPayoutAlloc({});
    setCoinDeltaAlloc({});
    setEconomyMissions([]);
    setEconomyCharacters([]);
    (async () => {
      // Metadati sessione: se è in pre-chiusura, salta direttamente allo step 2
      const meta = await getSessionWizardMeta(sessionId);
      if (meta.success && meta.data?.is_pre_closed) {
        setIsPreClosed(true);
        setStep(2 as StepId);
      }

      if (initialApprovedSignups?.length) {
        setSignups(initialApprovedSignups);
        // Se abbiamo status, usiamolo per precompilare le presenze; altrimenti tutti presenti.
        setAttendance(
          initialApprovedSignups.reduce((acc, s) => {
            const st = (s.status ?? "").toLowerCase();
            const value: "attended" | "absent" = st === "absent" ? "absent" : "attended";
            return { ...acc, [s.player_id]: value };
          }, {} as Record<string, "attended" | "absent">)
        );
      } else {
        setLoadingSignups(true);
        const res = await getApprovedSignupsForSession(sessionId);
        setLoadingSignups(false);
        if (res.success && res.data) {
          setSignups(res.data);
          setAttendance(
            res.data.reduce((acc, s) => {
              const st = (s.status ?? "").toLowerCase();
              const value: "attended" | "absent" = st === "absent" ? "absent" : "attended";
              return { ...acc, [s.player_id]: value };
            }, {} as Record<string, "attended" | "absent">)
          );
        } else {
          setSignups([]);
        }
      }
    })();
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
    setEconomyLoading(true);
    getLongCampaignEconomySnapshot(campaignId).then((res) => {
      setEconomyLoading(false);
      if (res.success && res.data) {
        setEconomyMissions(res.data.missions);
        setEconomyCharacters(res.data.characters);
        const initP: Record<string, { gp: string; sp: string; cp: string }> = {};
        const initD: Record<string, { gp: string; sp: string; cp: string }> = {};
        for (const c of res.data.characters) {
          initP[c.id] = { gp: "", sp: "", cp: "" };
          initD[c.id] = { gp: "", sp: "", cp: "" };
        }
        setPayoutAlloc(initP);
        setCoinDeltaAlloc(initD);
      }
    });
  }, [open, step, campaignId, isLongCampaign]);

  useEffect(() => {
    if (!open || step !== worldStep || !campaignId || !isLongCampaign) return;
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
  }, [open, step, campaignId, isLongCampaign, loadTrackerEntityIds, worldStep]);

  useEffect(() => {
    if (!open || step !== trophiesStep) return;
    setLoadingAchievements(true);
    getAchievementsForWizard().then((res) => {
      setLoadingAchievements(false);
      if (res.success && res.data) setAchievements(res.data);
      else setAchievements([]);
    });
  }, [open, step, trophiesStep]);

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
    // Consentiamo la chiusura anche senza iscritti:
    // in quel caso non ci sono presenze da validare nello step logistica.
    if (signups.length === 0) return true;
    return signups.every((s) => attendance[s.player_id] === "attended" || attendance[s.player_id] === "absent");
  }, [signups, attendance]);

  const canProceedStep2 = summary.trim().length > 0;

  // Fase 3 (Mondo) opzionale: si può sempre andare avanti anche senza modifiche
  const canProceedStep3 = true;

  // Fase 4 (Trofei) opzionale: nessun blocco
  const canProceedStep4 = true;

  const presentPlayers = useMemo(
    () => signups.filter((s) => attendance[s.player_id] === "attended"),
    [signups, attendance]
  );

  const missionsWithTreasure = useMemo(
    () =>
      economyMissions.filter(
        (m) => m.status === "completed" && (m.treasure_gp > 0 || m.treasure_sp > 0 || m.treasure_cp > 0)
      ),
    [economyMissions]
  );

  const selectedPayoutMission = useMemo(
    () => economyMissions.find((m) => m.id === payoutMissionId),
    [economyMissions, payoutMissionId]
  );

  function parseNonNeg(s: string): number {
    return Math.max(0, Math.trunc(Number.parseInt(s, 10) || 0));
  }

  const handleNext = () => {
    if (step < confirmStep) setStep((s) => (s + 1) as StepId);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as StepId);
  };

  const handleSubmit = async () => {
    if (isLongCampaign && payoutMissionId && selectedPayoutMission) {
      const allocations = economyCharacters.map((c) => {
        const a = payoutAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
        return {
          characterId: c.id,
          coins_gp: parseNonNeg(a.gp),
          coins_sp: parseNonNeg(a.sp),
          coins_cp: parseNonNeg(a.cp),
        };
      });
      const sum = allocations.reduce(
        (acc, a) => ({
          gp: acc.gp + a.coins_gp,
          sp: acc.sp + a.coins_sp,
          cp: acc.cp + a.coins_cp,
        }),
        { gp: 0, sp: 0, cp: 0 }
      );
      if (sum.gp > 0 || sum.sp > 0 || sum.cp > 0) {
        if (
          sum.gp > selectedPayoutMission.treasure_gp ||
          sum.sp > selectedPayoutMission.treasure_sp ||
          sum.cp > selectedPayoutMission.treasure_cp
        ) {
          toast.error("La distribuzione dal tesoretto supera i saldi disponibili.");
          return;
        }
      }
    }

    setSubmitting(true);

    let economy: SessionEconomyPayload | undefined = undefined;
    if (isLongCampaign) {
      let missionTreasurePayout: SessionEconomyPayload["missionTreasurePayout"] = undefined;
      if (payoutMissionId && selectedPayoutMission) {
        const allocations = economyCharacters.map((c) => {
          const a = payoutAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
          return {
            characterId: c.id,
            coins_gp: parseNonNeg(a.gp),
            coins_sp: parseNonNeg(a.sp),
            coins_cp: parseNonNeg(a.cp),
          };
        });
        const sum = allocations.reduce(
          (acc, a) => ({
            gp: acc.gp + a.coins_gp,
            sp: acc.sp + a.coins_sp,
            cp: acc.cp + a.coins_cp,
          }),
          { gp: 0, sp: 0, cp: 0 }
        );
        if (sum.gp > 0 || sum.sp > 0 || sum.cp > 0) {
          missionTreasurePayout = { missionId: payoutMissionId, allocations };
        }
      }
      const characterCoinDeltas = economyCharacters
        .map((c) => {
          const d = coinDeltaAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
          return {
            characterId: c.id,
            coins_gp: Math.trunc(Number.parseInt(d.gp, 10) || 0),
            coins_sp: Math.trunc(Number.parseInt(d.sp, 10) || 0),
            coins_cp: Math.trunc(Number.parseInt(d.cp, 10) || 0),
          };
        })
        .filter((d) => d.coins_gp !== 0 || d.coins_sp !== 0 || d.coins_cp !== 0);
      if (missionTreasurePayout || characterCoinDeltas.length > 0) {
        economy = {
          missionTreasurePayout: missionTreasurePayout,
          characterCoinDeltas: characterCoinDeltas.length > 0 ? characterCoinDeltas : undefined,
        };
      }
    }

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
      awardedAchievements: awardedAchievements.length > 0 ? awardedAchievements : undefined,
      elapsedHours: Math.max(0, Math.floor(elapsedHours)),
      economy,
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

  const handlePreClose = async () => {
    if (!canProceedStep1 || signups.length === 0) {
      toast.error("Compila le presenze prima di salvare in bozza.");
      return;
    }
    setPreClosing(true);
    const payload: Pick<CloseSessionActionPayload, "attendance" | "xpGained"> = {
      attendance,
      xpGained: Math.max(0, Math.floor(xpGained)),
    };
    const res = await preCloseSessionAction(sessionId, payload);
    setPreClosing(false);
    if (res.success) {
      toast.success("Sessione salvata in bozza. Puoi completare il debrief più tardi.");
      onOpenChange(false);
      onSuccess?.();
      // Esci dal GM Screen verso la dashboard campagna
      router.push(`/campaigns/${campaignId}`);
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

  const addAward = (playerId: string, achievementId: string, addedProgress: number) => {
    setAwardedAchievements((prev) => {
      const exists = prev.some((a) => a.playerId === playerId && a.achievementId === achievementId);
      if (exists) return prev;
      return [...prev, { playerId, achievementId, addedProgress }];
    });
  };

  const removeAward = (playerId: string, achievementId: string) => {
    setAwardedAchievements((prev) =>
      prev.filter((a) => !(a.playerId === playerId && a.achievementId === achievementId))
    );
  };

  const updateAwardProgress = (playerId: string, achievementId: string, addedProgress: number) => {
    setAwardedAchievements((prev) =>
      prev.map((a) =>
        a.playerId === playerId && a.achievementId === achievementId ? { ...a, addedProgress } : a
      )
    );
  };

  const getAwardsForPlayer = (playerId: string) =>
    awardedAchievements.filter((a) => a.playerId === playerId);

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
            Step {step} di {confirmStep}: {wizardSteps.find((s) => s.id === step)?.label}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex gap-1 rounded-lg border border-barber-gold/20 bg-barber-dark/80 p-1">
          {wizardSteps.map((s) => (
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
          {/* Step 1: Logistica & Presenze (saltato se la sessione è già in pre-chiusura) */}
          {step === 1 && !isPreClosed && (
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
                    <Label htmlFor="wizard-epoch-hours" className="text-barber-paper/90">
                      Ore di gioco trascorse (es. viaggio + esplorazione)
                    </Label>
                    <Input
                      id="wizard-epoch-hours"
                      type="number"
                      min={0}
                      value={elapsedHours || ""}
                      onChange={(e) => setElapsedHours(parseInt(e.target.value, 10) || 0)}
                      className="border-barber-gold/30 bg-barber-dark text-barber-paper"
                      placeholder="0"
                    />
                    <p className="text-xs text-barber-paper/55">
                      Sommate al tempo dei personaggi assegnati ai giocatori segnati come presenti (Epoch / West
                      Marches).
                    </p>
                  </div>
                  {isLongCampaign && (
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
                  )}
                </>
              )}
            </>
          )}

          {/* Step 2: Diario */}
          {step === 2 && (
            <div className="space-y-4">
              {isPreClosed && (
                <div className="space-y-2 rounded-lg border border-barber-gold/25 bg-barber-dark/60 p-3">
                  <Label htmlFor="wizard-epoch-hours-pre" className="text-barber-paper/90">
                    Ore di gioco trascorse (es. viaggio + esplorazione)
                  </Label>
                  <Input
                    id="wizard-epoch-hours-pre"
                    type="number"
                    min={0}
                    value={elapsedHours || ""}
                    onChange={(e) => setElapsedHours(parseInt(e.target.value, 10) || 0)}
                    className="border-barber-gold/30 bg-barber-dark text-barber-paper"
                    placeholder="0"
                  />
                  <p className="text-xs text-barber-paper/55">
                    Sessione già in bozza: indica le ore da aggiungere ai PG dei presenti al momento della chiusura
                    definitiva.
                  </p>
                </div>
              )}
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

          {/* Step Economia (solo campagne long) */}
          {step === 3 && isLongCampaign && (
            <div className="space-y-4">
              <p className="text-sm text-barber-paper/80">
                Opzionale: distribuisci monete dal tesoretto di una missione completata e applica aggiustamenti liberi ai
                personaggi. Le operazioni si applicano alla chiusura definitiva della sessione (dopo conferma).
              </p>
              {economyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-barber-gold" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-barber-paper/90">Tesoretto missione</Label>
                    <Select value={payoutMissionId || "none"} onValueChange={(v) => setPayoutMissionId(v === "none" ? "" : v)}>
                      <SelectTrigger className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                        <SelectValue placeholder="Nessuna distribuzione dal tesoretto" />
                      </SelectTrigger>
                      <SelectContent className="border-barber-gold/20 bg-barber-dark">
                        <SelectItem value="none" className="text-barber-paper focus:bg-barber-gold/20">
                          Nessuna
                        </SelectItem>
                        {missionsWithTreasure.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-barber-paper focus:bg-barber-gold/20">
                            {m.title.slice(0, 48)}
                            {m.title.length > 48 ? "…" : ""} — {m.treasure_gp}/{m.treasure_sp}/{m.treasure_cp} (o/a/r)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPayoutMission && (
                      <p className="text-xs text-barber-paper/55">
                        Saldo:{" "}
                        <span className="tabular-nums text-barber-paper/80">{selectedPayoutMission.treasure_gp}</span> oro,{" "}
                        <span className="tabular-nums text-barber-paper/80">{selectedPayoutMission.treasure_sp}</span> arg,{" "}
                        <span className="tabular-nums text-barber-paper/80">{selectedPayoutMission.treasure_cp}</span> rame.
                      </p>
                    )}
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-barber-gold/20 bg-barber-dark/50 p-2">
                      {economyCharacters.map((c) => {
                        const a = payoutAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
                        return (
                          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_repeat(3,3.5rem)] gap-1.5 text-xs">
                            <div className="min-w-0 truncate pt-2 text-barber-paper">{c.name}</div>
                            <Input
                              placeholder="O"
                              value={a.gp}
                              onChange={(e) =>
                                setPayoutAlloc((prev) => ({
                                  ...prev,
                                  [c.id]: { ...a, gp: e.target.value },
                                }))
                              }
                              className="h-8 border-barber-gold/25 bg-barber-dark px-1.5 text-barber-paper"
                            />
                            <Input
                              placeholder="A"
                              value={a.sp}
                              onChange={(e) =>
                                setPayoutAlloc((prev) => ({
                                  ...prev,
                                  [c.id]: { ...a, sp: e.target.value },
                                }))
                              }
                              className="h-8 border-barber-gold/25 bg-barber-dark px-1.5 text-barber-paper"
                            />
                            <Input
                              placeholder="R"
                              value={a.cp}
                              onChange={(e) =>
                                setPayoutAlloc((prev) => ({
                                  ...prev,
                                  [c.id]: { ...a, cp: e.target.value },
                                }))
                              }
                              className="h-8 border-barber-gold/25 bg-barber-dark px-1.5 text-barber-paper"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-barber-paper/90">Variazioni libere (delta rispetto al saldo attuale)</Label>
                    <p className="text-[11px] text-barber-paper/55">
                      Numeri positivi aggiungono, negativi tolgono (es. +10 / -5). Applicato alla chiusura insieme al
                      tesoretto.
                    </p>
                    <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-barber-gold/20 bg-barber-dark/50 p-2">
                      {economyCharacters.map((c) => {
                        const d = coinDeltaAlloc[c.id] ?? { gp: "", sp: "", cp: "" };
                        return (
                          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_repeat(3,3.5rem)] gap-1.5 text-xs">
                            <div className="min-w-0 truncate pt-2 text-barber-paper">{c.name}</div>
                            <Input
                              placeholder="ΔO"
                              value={d.gp}
                              onChange={(e) =>
                                setCoinDeltaAlloc((prev) => ({
                                  ...prev,
                                  [c.id]: { ...d, gp: e.target.value },
                                }))
                              }
                              className="h-8 border-barber-gold/25 bg-barber-dark px-1.5 text-barber-paper"
                            />
                            <Input
                              placeholder="ΔA"
                              value={d.sp}
                              onChange={(e) =>
                                setCoinDeltaAlloc((prev) => ({
                                  ...prev,
                                  [c.id]: { ...d, sp: e.target.value },
                                }))
                              }
                              className="h-8 border-barber-gold/25 bg-barber-dark px-1.5 text-barber-paper"
                            />
                            <Input
                              placeholder="ΔR"
                              value={d.cp}
                              onChange={(e) =>
                                setCoinDeltaAlloc((prev) => ({
                                  ...prev,
                                  [c.id]: { ...d, cp: e.target.value },
                                }))
                              }
                              className="h-8 border-barber-gold/25 bg-barber-dark px-1.5 text-barber-paper"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mondo (step 3 per campagne non-long, step 4 per long) */}
          {step === worldStep && (
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

          {/* Trofei (Opzionale) */}
          {step === trophiesStep && (
            <div className="space-y-4">
              <p className="rounded-lg border border-barber-gold/20 bg-barber-dark/60 px-3 py-3 text-sm text-barber-paper/90">
                Vuoi premiare i giocatori per una giocata epica? Assegna medaglie o titoli. Questo passaggio è opzionale, puoi concludere la sessione direttamente.
              </p>
              {loadingAchievements ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-barber-gold" />
                </div>
              ) : presentPlayers.length === 0 ? (
                <p className="text-sm text-barber-paper/60">Nessun giocatore presente in questa sessione. Assegna le presenze nello step Logistica.</p>
              ) : (
                <div className="space-y-4">
                  {presentPlayers.map((s) => {
                    const playerAwards = getAwardsForPlayer(s.player_id);
                    const achMap = new Map(achievements.map((a) => [a.id, a]));
                    return (
                      <div
                        key={s.player_id}
                        className="rounded-lg border border-barber-gold/20 bg-barber-dark/80 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-barber-paper">{s.player_name}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10"
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Aggiungi trofeo
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[280px] border-barber-gold/20 bg-barber-dark p-0"
                              align="end"
                            >
                              <div className="border-b border-barber-gold/20 p-2">
                                <Input
                                  placeholder="Cerca achievement..."
                                  className="border-barber-gold/20 bg-barber-dark text-barber-paper text-sm"
                                  onChange={(e) => {
                                    const q = e.target.value.trim().toLowerCase();
                                    setAchievementSearchByPlayer((prev) => ({ ...prev, [s.player_id]: q }));
                                  }}
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto p-1">
                                {(() => {
                                  const q = achievementSearchByPlayer[s.player_id]?.toLowerCase() ?? "";
                                  const available = achievements.filter(
                                    (a) => (!q || a.title.toLowerCase().includes(q)) && !playerAwards.some((w) => w.achievementId === a.id)
                                  );
                                  const byCategory = new Map<string, typeof available>();
                                  for (const a of available) {
                                    const cat = a.category?.trim() || "Generale";
                                    if (!byCategory.has(cat)) byCategory.set(cat, []);
                                    byCategory.get(cat)!.push(a);
                                  }
                                  const categoryOrder = orderAchievementCategories([...byCategory.keys()]);
                                  return (
                                    <>
                                      {categoryOrder.map((cat) => (
                                        <div key={cat} className="mb-2">
                                          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-barber-gold/80">
                                            {cat}
                                          </p>
                                          {byCategory.get(cat)!.map((a) => (
                                            <button
                                              key={a.id}
                                              type="button"
                                              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-barber-paper hover:bg-barber-gold/15"
                                              onClick={() => {
                                                addAward(s.player_id, a.id, a.is_incremental ? 1 : 1);
                                              }}
                                            >
                                              <AchievementIcon iconName={a.icon_name} />
                                              {a.title}
                                            </button>
                                          ))}
                                        </div>
                                      ))}
                                      {available.length === 0 && (
                                        <p className="px-2 py-3 text-xs text-barber-paper/50">Nessun altro achievement da aggiungere.</p>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {playerAwards.length > 0 && (
                          <ul className="space-y-2">
                            {playerAwards.map((a) => {
                              const ach = achMap.get(a.achievementId);
                              return (
                                <li
                                  key={`${a.playerId}-${a.achievementId}`}
                                  className="flex flex-wrap items-center gap-2 rounded border border-barber-gold/15 bg-barber-dark/60 px-2 py-1.5"
                                >
                                  {ach && <AchievementIcon iconName={ach.icon_name} />}
                                  <span className="text-sm text-barber-paper">{ach?.title ?? a.achievementId}</span>
                                  {ach?.is_incremental && (
                                    <>
                                      <span className="text-xs text-barber-paper/50">Quantità:</span>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={ach?.max_progress ?? 999}
                                        value={a.addedProgress}
                                        onChange={(e) =>
                                          updateAwardProgress(
                                            s.player_id,
                                            a.achievementId,
                                            Math.max(1, parseInt(e.target.value, 10) || 1)
                                          )
                                        }
                                        className="h-7 w-14 border-barber-gold/30 bg-barber-dark text-barber-paper text-xs"
                                      />
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeAward(s.player_id, a.achievementId)}
                                    className="ml-auto rounded p-0.5 text-barber-paper/50 hover:bg-barber-red/20 hover:text-barber-red"
                                    aria-label="Rimuovi"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Conferma */}
          {step === confirmStep && (
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
              {awardedAchievements.length > 0 && (
                <p className="text-barber-paper/80">
                  <strong>Trofei assegnati:</strong> {awardedAchievements.length} premiazioni.
                </p>
              )}
              {isLongCampaign && (payoutMissionId || economyCharacters.some((c) => {
                const d = coinDeltaAlloc[c.id];
                if (!d) return false;
                return (
                  (Number.parseInt(d.gp, 10) || 0) !== 0 ||
                  (Number.parseInt(d.sp, 10) || 0) !== 0 ||
                  (Number.parseInt(d.cp, 10) || 0) !== 0
                );
              })) && (
                <p className="text-barber-paper/80">
                  <strong>Economia:</strong>{" "}
                  {payoutMissionId
                    ? `distribuzione da tesoretto (${selectedPayoutMission?.title?.slice(0, 40) ?? "missione"}) e/o `
                    : ""}
                  aggiustamenti ai salvadanai dei PG (se indicati nello step Economia).
                </p>
              )}
              <p className="pt-2 text-barber-paper/60">Clicca &quot;Concludi Sessione Definitivamente&quot; per salvare tutto.</p>
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
          {step < confirmStep ? (
            <>
              {step === 1 && !isPreClosed && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreClose}
                  disabled={preClosing || !canProceedStep1 || loadingSignups || signups.length === 0}
                  className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10"
                >
                  {preClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Pre-chiudi e vai a dormire 🌙
                </Button>
              )}
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === worldStep && !canProceedStep3)
                }
                className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
              >
                Avanti
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Concludi Sessione Definitivamente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

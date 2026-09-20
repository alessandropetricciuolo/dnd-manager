"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ExternalLink, LayoutGrid, List, Pencil, Plus, RefreshCw, Swords, Trash2 } from "lucide-react";
import { NameGeneratorField } from "@/components/name-generator/name-generator-field";
import { cn } from "@/lib/utils";

import {
  applyGuildRankFromPointsAction,
  completeMissionAction,
  createGuildAction,
  createMissionAction,
  deleteGuildAction,
  deleteMissionAction,
  reopenMissionAction,
  setMissionAvailabilityStatusAction,
  setMissionProgressStatusAction,
  updateGuildAction,
  updateMissionAction,
} from "@/lib/actions/mission-actions";
import { updateMissionTreasureAction } from "@/lib/actions/campaign-economy-actions";
import { GUILD_RANK_LETTERS, guildRankOrder } from "@/lib/missions/guild-ranks";
import { BulkImportMissionsDialog } from "@/components/missions/bulk-import-missions-dialog";
import { MissionEncounterEditor } from "@/components/missions/mission-encounter-editor";

type MissionBoardMission = {
  id: string;
  grade: string;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
  status: string;
  points_reward: number;
  completed_at?: string | null;
  completed_by_guild_id?: string | null;
  completed_by_guild_name?: string | null;
  treasure_gp?: number;
  treasure_sp?: number;
  treasure_cp?: number;
};

type MissionBoardGuild = {
  id: string;
  name: string;
  rank?: string;
  score: number;
  auto_rank?: boolean;
};

type MissionBoardProps = {
  campaignId: string;
  missions: MissionBoardMission[];
  guilds: MissionBoardGuild[];
  isGmOrAdmin: boolean;
  isAdmin: boolean;
  hideHeaderActions?: boolean;
};

const EMPTY_MISSION_DRAFT = {
  grade: "",
  title: "",
  committente: "",
  ubicazione: "",
  paga: "",
  urgenza: "",
  description: "",
  points_reward: "0",
};

const EMPTY_GUILD_DRAFT = {
  name: "",
  rank: "D" as (typeof GUILD_RANK_LETTERS)[number],
  score: "0",
  autoRank: true,
};

type MissionProgressStatus = "open" | "in_progress" | "completed";

function normalizeMissionStatus(status: string | null | undefined): MissionProgressStatus {
  if (status === "completed" || status === "in_progress") return status;
  return "open";
}

function missionStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeMissionStatus(status);
  if (normalized === "open") return "Accettabile";
  if (normalized === "in_progress") return "In corso";
  return "Non accettabile";
}

function gradeBadgeClass(grade: string | null | undefined): string {
  const g = (grade ?? "D").trim().toUpperCase();
  if (g === "S") return "border-yellow-400/60 bg-yellow-950/80 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.25)]";
  if (g === "A") return "border-red-500/60 bg-red-950/80 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]";
  if (g === "B") return "border-blue-500/60 bg-blue-950/80 text-blue-300";
  if (g === "C") return "border-amber-600/60 bg-amber-950/80 text-amber-300";
  return "border-zinc-500/60 bg-zinc-900/80 text-zinc-300";
}

function missionRowTone(status: string | null | undefined): string {
  const normalized = normalizeMissionStatus(status);
  if (normalized === "open") {
    return "bg-guild-stone/50 hover:bg-brass-base/10";
  }
  if (normalized === "in_progress") {
    return "bg-amber-950/20 hover:bg-amber-900/30";
  }
  return "bg-zinc-950/40 opacity-75 hover:opacity-100";
}

function missionStatusBadgeClass(status: string | null | undefined): string {
  const normalized = normalizeMissionStatus(status);
  if (normalized === "open") return "border border-emerald-500/40 bg-emerald-950/60 text-emerald-300";
  if (normalized === "in_progress") return "border border-amber-500/40 bg-amber-950/60 text-amber-300";
  return "border border-zinc-600/40 bg-zinc-900/60 text-zinc-400";
}

function ParchmentQuestCard({
  mission,
  onOpen,
}: {
  mission: MissionBoardMission;
  onOpen: () => void;
}) {
  const status = normalizeMissionStatus(mission.status);
  const grade = (mission.grade ?? "D").trim().toUpperCase();

  // Rotazione organica impercettibile basata sull'ID per simulare fogli appesi naturalmente
  const rotation = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < mission.id.length; i++) {
      hash = (hash << 5) - hash + mission.id.charCodeAt(i);
    }
    const angles = [-1.2, 0.9, -0.6, 1.2, -1.0, 0.6, -0.8, 1.0];
    return angles[Math.abs(hash) % angles.length];
  }, [mission.id]);

  // Calcolo teschi di difficoltà in base al grado
  const skullsCount =
    grade === "S" ? 5 : grade === "A" ? 4 : grade === "B" ? 3 : grade === "C" ? 2 : 1;
  const skulls = "💀".repeat(skullsCount);

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      style={{ transform: `rotate(${rotation}deg)` }}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className="parchment-notice group flex flex-col justify-between p-4 pt-6 sm:p-5 sm:pt-7 text-left cursor-pointer min-h-[350px] focus:outline-none focus:ring-2 focus:ring-amber-800/60 select-none hover:!rotate-0"
    >
      {/* Chiodo in ferro battuto in alto al centro */}
      <span className="parchment-nail" />

      {/* Testata della Pergamena */}
      <div>
        {/* Rango & Punti Gloria */}
        <div className="flex items-center justify-between gap-1 text-[10px] font-cinzel font-bold text-[#734f2d] uppercase tracking-wider mb-2 border-b border-[#a88457]/30 pb-1.5">
          <span className="inline-flex items-center gap-1 font-extrabold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8c2d19]" />
            Rango {grade}
          </span>
          {(mission.points_reward ?? 0) > 0 ? (
            <span className="text-[#8c2d19] font-mono font-bold">+{mission.points_reward} Gloria</span>
          ) : (
            <span className="text-[#734f2d]/80">Taglia Gilda</span>
          )}
        </div>

        {/* Titolo Monumentale della Taglia */}
        <h3 className="font-cinzel text-base sm:text-lg font-extrabold text-[#2c180b] text-center leading-snug tracking-tight group-hover:text-[#8c2d19] transition-colors">
          {mission.title}
        </h3>

        {/* Bando / Committente */}
        {mission.committente?.trim() ? (
          <p className="mt-1.5 text-center text-[11px] font-serif text-[#6b4728] italic line-clamp-1">
            Bando di: <strong className="font-semibold text-[#382010] not-italic">{mission.committente}</strong>
          </p>
        ) : null}

        {/* Divisore Araldico */}
        <div className="my-2.5 flex items-center justify-center gap-2 text-[#8b6540]/40">
          <span className="h-px w-10 bg-[#8b6540]/30" />
          <span className="text-[8px] text-[#8b6540]">♦</span>
          <span className="h-px w-10 bg-[#8b6540]/30" />
        </div>

        {/* Descrizione del Bando in Inchiostro */}
        <p className="text-center font-serif text-xs leading-relaxed text-[#3f2814] line-clamp-3 px-1">
          {mission.description?.trim() ||
            "Bando di taglia registrato negli archivi di gilda. Presentati al committente per ricevere le specifiche dell'incarico."}
        </p>

        {mission.ubicazione?.trim() ? (
          <p className="mt-2 text-center text-[11px] font-serif text-[#6b4728] line-clamp-1">
            📍 {mission.ubicazione}
          </p>
        ) : null}
      </div>

      {/* Parte Inferiore: Ricompensa Monete, Difficoltà e Sigillo Fisico */}
      <div className="mt-4 pt-3 border-t border-[#a88457]/40 flex items-end justify-between gap-2">
        {/* Moneta d'oro e Difficoltà */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="parchment-gold-coin" title="Ricompensa ufficiale">
              🪙
            </span>
            <div className="min-w-0">
              <span className="block text-[10px] font-serif uppercase tracking-wider text-[#734f2d]/90 font-semibold leading-none">
                Difficoltà:
              </span>
              <span className="text-xs tracking-tighter" title={`Grado ${grade}`}>
                {skulls}
              </span>
            </div>
          </div>

          {mission.paga?.trim() ? (
            <div className="font-cinzel text-xs font-extrabold text-[#6d3e0c] truncate">
              Paga: <span className="tabular-nums font-bold">{mission.paga}</span>
            </div>
          ) : (
            <div className="text-[11px] font-serif italic text-[#6d3e0c]">Ricompensa d&apos;onore</div>
          )}
        </div>

        {/* Sigillo Fisico (Ceralacca o Timbro ad Inchiostro) */}
        <div className="shrink-0 flex items-center justify-end">
          {status === "completed" ? (
            <div className="ink-stamp-completed">
              COMPLETATA
            </div>
          ) : status === "in_progress" ? (
            <div className="ink-stamp-progress">
              IN CORSO
            </div>
          ) : (
            <div className="wax-seal-badge" title="Bando aperto e accettabile">
              <span>ATTIVA</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GuildMobileCard({
  guild,
  isGmOrAdmin,
  isPending,
  onEdit,
  onDelete,
  onSyncRank,
}: {
  guild: MissionBoardGuild;
  isGmOrAdmin: boolean;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSyncRank: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-600/20 bg-zinc-950/40 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600/15 font-serif text-lg font-bold text-amber-200">
          {guild.rank ?? "—"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-semibold text-zinc-100">{guild.name}</p>
          <p className="text-xs text-zinc-400">
            {guild.score} punti · rango {guild.auto_rank !== false ? "automatico" : "manuale"}
          </p>
        </div>
      </div>
      {isGmOrAdmin ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-amber-600/15 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={onSyncRank}
            className="h-8 border-sky-500/40 text-xs text-sky-100"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Rango da punti
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-8 border-amber-600/40 text-xs text-amber-100"
          >
            <Pencil className="mr-1 h-3 w-3" />
            Modifica
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={onDelete} className="h-8 text-xs">
            <Trash2 className="mr-1 h-3 w-3" />
            Elimina
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MissionBoard({
  campaignId,
  missions,
  guilds,
  isGmOrAdmin,
  isAdmin,
  hideHeaderActions = false,
}: MissionBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [displayMode, setDisplayMode] = useState<"board" | "table">("board");

  const sortedGuilds = useMemo(() => {
    return [...guilds].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return guildRankOrder(b.rank ?? "D") - guildRankOrder(a.rank ?? "D");
    });
  }, [guilds]);

  const sortedMissions = useMemo(() => {
    return [...missions].sort((a, b) => {
      const priority = (status: string): number => {
        const s = normalizeMissionStatus(status);
        if (s === "open") return 0;
        if (s === "in_progress") return 1;
        return 2;
      };
      const ao = priority(a.status);
      const bo = priority(b.status);
      if (ao !== bo) return ao - bo;
      const gradeDelta = guildRankOrder(b.grade ?? "D") - guildRankOrder(a.grade ?? "D");
      if (gradeDelta !== 0) return gradeDelta;
      if ((b.points_reward ?? 0) !== (a.points_reward ?? 0)) {
        return (b.points_reward ?? 0) - (a.points_reward ?? 0);
      }
      return a.title.localeCompare(b.title, "it", { sensitivity: "base" });
    });
  }, [missions]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMission, setDetailsMission] = useState<MissionBoardMission | null>(null);
  const [completeGuildId, setCompleteGuildId] = useState<string>("");
  const [completeTreasureGp, setCompleteTreasureGp] = useState("0");
  const [completeTreasureSp, setCompleteTreasureSp] = useState("0");
  const [completeTreasureCp, setCompleteTreasureCp] = useState("0");
  const [treasureEditGp, setTreasureEditGp] = useState("0");
  const [treasureEditSp, setTreasureEditSp] = useState("0");
  const [treasureEditCp, setTreasureEditCp] = useState("0");
  const [savingTreasure, setSavingTreasure] = useState(false);
  const [encounterEditorOpen, setEncounterEditorOpen] = useState(false);
  const [encounterMission, setEncounterMission] = useState<MissionBoardMission | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<"add" | "edit">("add");
  const [editMissionId, setEditMissionId] = useState<string | null>(null);
  const [missionDraft, setMissionDraft] = useState(EMPTY_MISSION_DRAFT);

  const openAddMission = () => {
    setEditMode("add");
    setEditMissionId(null);
    setMissionDraft(EMPTY_MISSION_DRAFT);
    setEditOpen(true);
  };

  useEffect(() => {
    if (searchParams.get("openCreateMission") !== "1") return;
    openAddMission();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("openCreateMission");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const openEditMission = (m: MissionBoardMission) => {
    setEditMode("edit");
    setEditMissionId(m.id);
    setMissionDraft({
      grade: m.grade,
      title: m.title,
      committente: m.committente,
      ubicazione: m.ubicazione,
      paga: m.paga,
      urgenza: m.urgenza,
      description: m.description,
      points_reward: String(m.points_reward ?? 0),
    });
    setEditOpen(true);
  };

  const openDetailsMission = (m: MissionBoardMission) => {
    setDetailsMission(m);
    setCompleteGuildId(guilds[0]?.id ?? "");
    setCompleteTreasureGp("0");
    setCompleteTreasureSp("0");
    setCompleteTreasureCp("0");
    setDetailsOpen(true);
  };

  const openEncounterEditor = (m: MissionBoardMission) => {
    setEncounterMission(m);
    setEncounterEditorOpen(true);
  };

  const openProjectionTab = () => {
    const projectionUrl = `/campaigns/${campaignId}/gm-only/missioni/proiezione`;
    window.open(projectionUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!detailsMission || detailsMission.status !== "completed") return;
    setTreasureEditGp(String(detailsMission.treasure_gp ?? 0));
    setTreasureEditSp(String(detailsMission.treasure_sp ?? 0));
    setTreasureEditCp(String(detailsMission.treasure_cp ?? 0));
  }, [detailsMission]);

  const [guildDialogOpen, setGuildDialogOpen] = useState(false);
  const [guildDialogMode, setGuildDialogMode] = useState<"add" | "edit">("add");
  const [editGuildId, setEditGuildId] = useState<string | null>(null);
  const [guildDraft, setGuildDraft] = useState(EMPTY_GUILD_DRAFT);

  const openAddGuild = () => {
    setGuildDialogMode("add");
    setEditGuildId(null);
    setGuildDraft(EMPTY_GUILD_DRAFT);
    setGuildDialogOpen(true);
  };

  const openEditGuild = (g: MissionBoardGuild) => {
    setGuildDialogMode("edit");
    setEditGuildId(g.id);
    setGuildDraft({
      name: g.name,
      rank: (GUILD_RANK_LETTERS.includes((g.rank ?? "D").toUpperCase() as (typeof GUILD_RANK_LETTERS)[number])
        ? (g.rank ?? "D").toUpperCase()
        : "D") as (typeof GUILD_RANK_LETTERS)[number],
      score: String(g.score),
      autoRank: g.auto_rank !== false,
    });
    setGuildDialogOpen(true);
  };

  async function submitMission() {
    const {
      grade,
      title,
      committente,
      ubicazione,
      paga,
      urgenza,
      description,
      points_reward,
    } = missionDraft;
    const pts = Number.parseInt(points_reward, 10);

    startTransition(async () => {
      const res =
        editMode === "add" || !editMissionId
          ? await createMissionAction(
              campaignId,
              grade,
              title,
              committente,
              ubicazione,
              paga,
              urgenza,
              description,
              Number.isNaN(pts) ? 0 : pts
            )
          : await updateMissionAction(
              campaignId,
              editMissionId,
              grade,
              title,
              committente,
              ubicazione,
              paga,
              urgenza,
              description,
              Number.isNaN(pts) ? 0 : pts
            );

      if (!res.success) {
        toast.error(res.message ?? "Errore missione");
        return;
      }

      toast.success(editMode === "add" ? "Missione aggiunta" : "Missione aggiornata");
      setEditOpen(false);
      router.refresh();
    });
  }

  async function submitGuild() {
    const name = guildDraft.name.trim();
    const scoreNum = Number.parseInt(guildDraft.score, 10);

    if (!name || Number.isNaN(scoreNum) || scoreNum < 0) {
      toast.error("Compila correttamente nome e punteggio.");
      return;
    }

    startTransition(async () => {
      const res =
        guildDialogMode === "add" || !editGuildId
          ? await createGuildAction(campaignId, name, guildDraft.rank, scoreNum, guildDraft.autoRank)
          : await updateGuildAction(
              campaignId,
              editGuildId,
              name,
              guildDraft.rank,
              scoreNum,
              guildDraft.autoRank
            );

      if (!res.success) {
        toast.error(res.message ?? "Errore gilda");
        return;
      }

      toast.success(guildDialogMode === "add" ? "Gilda aggiunta" : "Gilda aggiornata");
      setGuildDialogOpen(false);
      router.refresh();
    });
  }

  async function onDeleteMission(missionId: string) {
    if (!window.confirm("Eliminare questa missione?")) return;

    startTransition(async () => {
      const res = await deleteMissionAction(campaignId, missionId);
      if (!res.success) {
        toast.error(res.message ?? "Errore eliminazione");
        return;
      }
      toast.success("Missione eliminata");
      setDetailsOpen(false);
      router.refresh();
    });
  }

  async function onDeleteGuild(guildId: string) {
    if (!window.confirm("Eliminare questa gilda?")) return;

    startTransition(async () => {
      const res = await deleteGuildAction(campaignId, guildId);
      if (!res.success) {
        toast.error(res.message ?? "Errore eliminazione");
        return;
      }
      toast.success("Gilda eliminata");
      setGuildDialogOpen(false);
      router.refresh();
    });
  }

  function submitCompleteMission() {
    if (!detailsMission) return;
    const status = normalizeMissionStatus(detailsMission.status);
    if (status !== "open" && status !== "in_progress") return;
    if (!completeGuildId) {
      toast.error("Seleziona la gilda che completa la missione.");
      return;
    }
    const tgp = Math.max(0, Math.trunc(Number.parseInt(completeTreasureGp, 10) || 0));
    const tsp = Math.max(0, Math.trunc(Number.parseInt(completeTreasureSp, 10) || 0));
    const tcp = Math.max(0, Math.trunc(Number.parseInt(completeTreasureCp, 10) || 0));
    startTransition(async () => {
      const res = await completeMissionAction(campaignId, detailsMission.id, completeGuildId, {
        gp: tgp,
        sp: tsp,
        cp: tcp,
      });
      if (!res.success) {
        toast.error(res.message ?? "Errore");
        return;
      }
      toast.success("Missione completata. Punti gilda e tesoretto registrati.");
      setDetailsOpen(false);
      router.refresh();
    });
  }

  function submitSetMissionProgress(status: "open" | "in_progress") {
    if (!detailsMission) return;
    startTransition(async () => {
      const res = await setMissionProgressStatusAction(campaignId, detailsMission.id, status);
      if (!res.success) {
        toast.error(res.message ?? "Errore aggiornamento stato missione.");
        return;
      }
      toast.success(status === "in_progress" ? "Missione segnata come in corso." : "Missione segnata come accettabile.");
      router.refresh();
    });
  }

  function submitSetMissionAvailability(status: "open" | "completed") {
    if (!detailsMission) return;
    startTransition(async () => {
      const res = await setMissionAvailabilityStatusAction(campaignId, detailsMission.id, status);
      if (!res.success) {
        toast.error(res.message ?? "Errore aggiornamento stato missione.");
        return;
      }
      toast.success(
        status === "completed"
          ? "Missione segnata come non accettabile."
          : "Missione segnata come accettabile."
      );
      router.refresh();
    });
  }

  async function saveMissionTreasure() {
    if (!detailsMission || detailsMission.status !== "completed") return;
    const tgp = Math.max(0, Math.trunc(Number.parseInt(treasureEditGp, 10) || 0));
    const tsp = Math.max(0, Math.trunc(Number.parseInt(treasureEditSp, 10) || 0));
    const tcp = Math.max(0, Math.trunc(Number.parseInt(treasureEditCp, 10) || 0));
    setSavingTreasure(true);
    try {
      const res = await updateMissionTreasureAction(campaignId, detailsMission.id, tgp, tsp, tcp);
      if (!res.success) {
        toast.error(res.message ?? "Errore");
        return;
      }
      toast.success("Tesoretto missione aggiornato.");
      setDetailsMission((prev) =>
        prev
          ? { ...prev, treasure_gp: tgp, treasure_sp: tsp, treasure_cp: tcp }
          : null
      );
      router.refresh();
    } finally {
      setSavingTreasure(false);
    }
  }

  function submitReopenMission() {
    if (!detailsMission || detailsMission.status !== "completed") return;
    if (!window.confirm("Riaprire la missione? I punti premio verranno detratti dalla gilda che l’aveva completata.")) {
      return;
    }
    startTransition(async () => {
      const res = await reopenMissionAction(campaignId, detailsMission.id);
      if (!res.success) {
        toast.error(res.message ?? "Errore");
        return;
      }
      toast.success("Missione riaperta.");
      setDetailsOpen(false);
      router.refresh();
    });
  }

  function syncRankFromPoints(guildId: string) {
    startTransition(async () => {
      const res = await applyGuildRankFromPointsAction(campaignId, guildId);
      if (!res.success) {
        toast.error(res.message ?? "Errore");
        return;
      }
      toast.success("Rango aggiornato in base ai punti.");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "card-guild-stone relative overflow-hidden rounded-2xl border-2 border-brass-base/40 p-4 font-serif sm:p-6 shadow-2xl backdrop-blur-md",
        "font-[var(--font-missions)]"
      )}
    >
      <div className="corner-ornament-tl" />
      <div className="corner-ornament-tr" />
      <div className="corner-ornament-bl" />
      <div className="corner-ornament-br" />

      <div className="relative z-10">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-brass-base/20 pb-4">
          <div className="min-w-0">
            <h2 className="font-serif text-2xl font-extrabold tracking-tight text-gold-relief sm:text-3xl">
              Bacheca delle Taglie & Contratti di Gilda
            </h2>
            <details className="group mt-2 md:hidden">
              <summary className="cursor-pointer text-xs text-brass-light/80 marker:content-none font-serif">
                <span className="underline decoration-brass-base/40 underline-offset-2">Guida ai Ranghi di Gilda</span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-parchment-300">
                Ranghi: D → C → B → A → S. I punti premio aumentano la reputazione del party.
              </p>
            </details>
            <p className="mt-1 hidden max-w-xl text-xs leading-relaxed text-parchment-300 md:block">
              Consulta le missioni disponibili nel regno, graduate dal rango D (ferro) al rango leggendario S (oro). I punti gloria ottenuti accrescono il prestigio della tua gilda.
            </p>
          </div>
          {isGmOrAdmin && !hideHeaderActions && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={openProjectionTab}
                className="border border-brass-base/40 bg-guild-stone text-parchment-200 hover:bg-brass-base/20 hover:text-brass-light font-serif text-xs"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-brass-base" />
                Proiezione Tavolo
              </Button>
              {isAdmin ? <BulkImportMissionsDialog campaignId={campaignId} /> : null}
              <Button onClick={openAddMission} disabled={isPending} className="btn-wax-seal text-xs font-serif font-bold uppercase tracking-wider shadow-md">
                <Plus className="mr-1.5 h-4 w-4" />
                Nuova Missione
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="missions">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-brass-base/30 bg-guild-stone/80 p-1 md:inline-flex md:w-auto">
              <TabsTrigger value="missions" className="text-xs font-serif uppercase tracking-wider data-[state=active]:bg-brass-base/20 data-[state=active]:text-brass-light sm:text-sm">
                Bandi & Missioni ({sortedMissions.length})
              </TabsTrigger>
              <TabsTrigger value="ranking" className="text-xs font-serif uppercase tracking-wider data-[state=active]:bg-brass-base/20 data-[state=active]:text-brass-light sm:text-sm">
                Classifica Gilde ({sortedGuilds.length})
              </TabsTrigger>
            </TabsList>

            {/* Selettore Vista per la Bacheca (Bacheca Pergamene vs Tabella) */}
            <div className="flex items-center gap-1 rounded-lg border border-brass-base/30 bg-guild-stone/80 p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDisplayMode("board")}
                className={cn(
                  "h-7 px-2.5 text-xs font-serif font-bold tracking-wider",
                  displayMode === "board"
                    ? "bg-brass-base/20 text-brass-light border border-brass-base/40 shadow-sm"
                    : "text-parchment-400 hover:text-parchment-200"
                )}
                title="Visualizzazione autentica in legno con pergamene e sigilli"
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                Bacheca Taverna
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDisplayMode("table")}
                className={cn(
                  "h-7 px-2.5 text-xs font-serif font-bold tracking-wider",
                  displayMode === "table"
                    ? "bg-brass-base/20 text-brass-light border border-brass-base/40 shadow-sm"
                    : "text-parchment-400 hover:text-parchment-200"
                )}
                title="Visualizzazione a registro tabellare"
              >
                <List className="mr-1.5 h-3.5 w-3.5" />
                Registro
              </Button>
            </div>
          </div>

          <TabsContent value="missions">
            {displayMode === "board" ? (
              /* LA VERA BACHECA IN LEGNO CON PERGAMENE E SIGILLI DEL MOCKUP */
              <div className="quest-board-frame p-4 sm:p-6 md:p-8 min-h-[480px]">
                {sortedMissions.length === 0 ? (
                  <div className="parchment-notice mx-auto max-w-md p-8 text-center my-12">
                    <span className="parchment-nail" />
                    <h4 className="font-cinzel text-lg font-bold text-[#2c180b]">Nessun Bando Affisso</h4>
                    <p className="mt-2 font-serif text-xs leading-relaxed text-[#523318]">
                      La bacheca della taverna è momentaneamente sgombra. Nessun committente o mostro richiede l&apos;intervento degli avventurieri.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-7 items-start">
                    {sortedMissions.map((m) => (
                      <ParchmentQuestCard key={m.id} mission={m} onOpen={() => openDetailsMission(m)} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* VISTA REGISTRO A TABELLA */
              <>
                <div className="flex flex-col gap-3 md:hidden">
                  {sortedMissions.length === 0 ? (
                    <p className="rounded-xl border border-brass-base/20 bg-guild-stone/40 px-4 py-8 text-center text-sm text-parchment-400">
                      Nessuna missione disponibile sulla bacheca.
                    </p>
                  ) : (
                    sortedMissions.map((m) => (
                      <ParchmentQuestCard key={m.id} mission={m} onOpen={() => openDetailsMission(m)} />
                    ))
                  )}
                </div>

                <div className="hidden overflow-hidden rounded-xl border border-brass-base/30 bg-guild-stone/50 shadow-inner md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-brass-base/20 bg-guild-oak/80 hover:bg-guild-oak/80">
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Stato</TableHead>
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Grado</TableHead>
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Titolo</TableHead>
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Committente</TableHead>
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Ubicazione</TableHead>
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Paga</TableHead>
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Urgenza</TableHead>
                        <TableHead className="text-[11px] font-serif uppercase tracking-wider text-brass-light">Gloria</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-parchment-400 font-serif">
                            Nessuna missione disponibile sulla bacheca.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedMissions.map((m) => (
                          <TableRow
                            key={m.id}
                            className={cn(
                              "cursor-pointer border-b border-brass-base/10 transition-colors",
                              missionRowTone(m.status)
                            )}
                            onClick={() => openDetailsMission(m)}
                          >
                            <TableCell className="whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-block rounded-full px-2 py-0.5 text-[10px] font-serif uppercase tracking-wider",
                                  missionStatusBadgeClass(m.status)
                                )}
                              >
                                {missionStatusLabel(m.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-md font-serif text-sm font-extrabold border shadow-inner",
                                  gradeBadgeClass(m.grade)
                                )}
                              >
                                {m.grade}
                              </span>
                            </TableCell>
                            <TableCell className="font-serif font-bold text-parchment-100">{m.title}</TableCell>
                            <TableCell className="text-xs text-parchment-300">{m.committente}</TableCell>
                            <TableCell className="text-xs text-parchment-300">{m.ubicazione}</TableCell>
                            <TableCell className="text-xs font-serif font-medium text-brass-light">{m.paga}</TableCell>
                            <TableCell className="text-xs text-parchment-300">{m.urgenza}</TableCell>
                            <TableCell className="font-mono text-xs font-bold text-brass-base">+{m.points_reward ?? 0}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="ranking">
            <div className="md:hidden">
              {isGmOrAdmin ? (
                <div className="mb-3 flex justify-end">
                  <Button
                    onClick={openAddGuild}
                    disabled={isPending}
                    size="sm"
                    className="h-8 bg-amber-600 text-xs text-zinc-950 hover:bg-amber-500"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Nuova Gilda
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                {sortedGuilds.length === 0 ? (
                  <p className="rounded-lg border border-amber-600/20 bg-zinc-950/30 px-4 py-6 text-center text-sm text-zinc-400">
                    Nessuna gilda in classifica.
                  </p>
                ) : (
                  sortedGuilds.map((g) => (
                    <GuildMobileCard
                      key={g.id}
                      guild={g}
                      isGmOrAdmin={isGmOrAdmin}
                      isPending={isPending}
                      onEdit={() => openEditGuild(g)}
                      onDelete={() => void onDeleteGuild(g.id)}
                      onSyncRank={() => syncRankFromPoints(g.id)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="hidden rounded-lg border border-amber-600/20 bg-zinc-950/30 p-3 md:block">
              {isGmOrAdmin && (
                <div className="mb-3 flex justify-end">
                  <Button
                    onClick={openAddGuild}
                    disabled={isPending}
                    className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuova Gilda
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow className="border-amber-600/20 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Nome della gilda</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Rango</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Punteggio</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Auto rango</TableHead>
                    {isGmOrAdmin && <TableHead className="text-amber-200">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGuilds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isGmOrAdmin ? 5 : 4} className="text-zinc-400">
                        Nessuna gilda in classifica.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedGuilds.map((g) => (
                      <TableRow key={g.id} className="hover:bg-amber-600/10">
                        <TableCell className="text-zinc-100">{g.name}</TableCell>
                        <TableCell className="text-zinc-200">{g.rank ?? "—"}</TableCell>
                        <TableCell className="text-zinc-200">{g.score}</TableCell>
                        <TableCell className="text-zinc-300 text-sm">{g.auto_rank !== false ? "Sì" : "No"}</TableCell>
                        {isGmOrAdmin && (
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title="Imposta il rango solo in base ai punti attuali"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  syncRankFromPoints(g.id);
                                }}
                                className="border-sky-500/40 text-sky-100 hover:bg-sky-500/15"
                              >
                                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                Rango da punti
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditGuild(g);
                                }}
                                className="border-amber-600/40 text-amber-100 hover:bg-amber-600/15"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifica
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteGuild(g.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Elimina
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="border-brass-base/40 bg-[#140f0c] text-parchment-100 shadow-2xl backdrop-blur-md sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl font-extrabold text-gold-relief">Dettagli Bando di Taglia</DialogTitle>
          </DialogHeader>

          {detailsMission ? (
            <div className="space-y-4">
              {(() => {
                const status = normalizeMissionStatus(detailsMission.status);
                return (
              <div className="flex flex-wrap gap-2 text-sm">
                <span
                  className={cn(
                    "rounded-md px-2.5 py-0.5 text-xs font-cinzel font-bold tracking-wider uppercase border",
                    status === "open"
                      ? "bg-emerald-950/60 text-emerald-200 border-emerald-600/40"
                      : status === "in_progress"
                        ? "bg-amber-950/60 text-amber-200 border-amber-600/40"
                        : "bg-red-950/60 text-red-200 border-red-600/40"
                  )}
                >
                  {missionStatusLabel(status)}
                </span>
                <span className="text-parchment-400 font-serif text-xs self-center">
                  Punti premio gilda: <strong className="text-brass-light font-mono font-bold">+{detailsMission.points_reward ?? 0}</strong>
                </span>
              </div>
                );
              })()}

              {normalizeMissionStatus(detailsMission.status) === "completed" && (
                <div className="rounded-lg border border-emerald-600/20 bg-emerald-950/20 p-3 text-sm text-zinc-200 space-y-3">
                  <p>
                    Completata da:{" "}
                    <strong>{detailsMission.completed_by_guild_name ?? detailsMission.completed_by_guild_id ?? "—"}</strong>
                  </p>
                  {detailsMission.completed_at && (
                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(detailsMission.completed_at).toLocaleString("it-IT")}
                    </p>
                  )}
                  <div className="rounded-md border border-emerald-600/25 bg-zinc-950/40 p-2">
                    <p className="text-xs font-medium text-emerald-200/90 mb-2">Tesoretto di gruppo (non ancora distribuito)</p>
                    {isGmOrAdmin ? (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-[10px] text-zinc-400">Oro</Label>
                          <Input
                            type="number"
                            min={0}
                            value={treasureEditGp}
                            onChange={(e) => setTreasureEditGp(e.target.value)}
                            className="h-8 border-emerald-600/30 bg-zinc-950 text-zinc-100 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-zinc-400">Argento</Label>
                          <Input
                            type="number"
                            min={0}
                            value={treasureEditSp}
                            onChange={(e) => setTreasureEditSp(e.target.value)}
                            className="h-8 border-emerald-600/30 bg-zinc-950 text-zinc-100 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-zinc-400">Rame</Label>
                          <Input
                            type="number"
                            min={0}
                            value={treasureEditCp}
                            onChange={(e) => setTreasureEditCp(e.target.value)}
                            className="h-8 border-emerald-600/30 bg-zinc-950 text-zinc-100 text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs tabular-nums text-zinc-300">
                        {detailsMission.treasure_gp ?? 0} oro · {detailsMission.treasure_sp ?? 0} arg ·{" "}
                        {detailsMission.treasure_cp ?? 0} rame
                      </p>
                    )}
                    {isGmOrAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2 w-full bg-emerald-800 text-white hover:bg-emerald-700"
                        disabled={savingTreasure}
                        onClick={() => void saveMissionTreasure()}
                      >
                        {savingTreasure ? "Salvataggio…" : "Salva tesoretto"}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-brass-base/20 bg-[#0c0906]/60 p-3.5">
                <div>
                  <p className="text-[11px] font-cinzel font-semibold text-brass-light/80 uppercase">Grado</p>
                  <p className="font-serif font-bold text-parchment-100">{detailsMission.grade}</p>
                </div>
                <div>
                  <p className="text-[11px] font-cinzel font-semibold text-brass-light/80 uppercase">Titolo</p>
                  <p className="font-serif font-bold text-parchment-100">{detailsMission.title}</p>
                </div>
                <div>
                  <p className="text-[11px] font-cinzel font-semibold text-brass-light/80 uppercase">Committente</p>
                  <p className="font-serif text-parchment-200">{detailsMission.committente || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-cinzel font-semibold text-brass-light/80 uppercase">Ubicazione</p>
                  <p className="font-serif text-parchment-200">{detailsMission.ubicazione || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-cinzel font-semibold text-brass-light/80 uppercase">Paga</p>
                  <p className="font-serif font-semibold text-brass-light">{detailsMission.paga || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-cinzel font-semibold text-brass-light/80 uppercase">Urgenza</p>
                  <p className="font-serif text-parchment-200">{detailsMission.urgenza || "—"}</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-800/30 bg-[#120d09]/80 p-4">
                <p className="mb-2 text-[11px] font-cinzel font-semibold text-brass-light/80 uppercase">Bando e Specifiche</p>
                <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-parchment-100">{detailsMission.description}</p>
              </div>

              {isGmOrAdmin && (
                <div className="rounded-lg border border-sky-600/20 bg-sky-950/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-sky-100">Preparazione incontri</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Crea incontri solo GM da usare poi nel GM screen per caricare automaticamente PG iscritti e mostri preparati.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-sky-500/40 text-sky-100 hover:bg-sky-500/15"
                      onClick={() => openEncounterEditor(detailsMission)}
                    >
                      <Swords className="mr-2 h-4 w-4" />
                      Incontri GM
                    </Button>
                  </div>
                </div>
              )}

              {isGmOrAdmin &&
                (normalizeMissionStatus(detailsMission.status) === "open" ||
                  normalizeMissionStatus(detailsMission.status) === "in_progress") &&
                guilds.length > 0 && (
                <div className="rounded-lg border border-amber-600/30 bg-zinc-900/40 p-3 space-y-2">
                  <Label className="text-amber-100">Segna completata dalla gilda</Label>
                  <Select value={completeGuildId} onValueChange={setCompleteGuildId}>
                    <SelectTrigger className="border-amber-600/40 bg-zinc-950 text-zinc-100">
                      <SelectValue placeholder="Scegli gilda" />
                    </SelectTrigger>
                    <SelectContent className="border-amber-600/30 bg-zinc-950 text-zinc-100">
                      {guilds.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name} ({g.rank ?? "?"}) — {g.score} pt
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <Label className="text-[10px] text-amber-200/70">Tesoretto oro</Label>
                      <Input
                        type="number"
                        min={0}
                        value={completeTreasureGp}
                        onChange={(e) => setCompleteTreasureGp(e.target.value)}
                        className="h-8 border-amber-600/40 bg-zinc-950 text-zinc-100 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-amber-200/70">Argento</Label>
                      <Input
                        type="number"
                        min={0}
                        value={completeTreasureSp}
                        onChange={(e) => setCompleteTreasureSp(e.target.value)}
                        className="h-8 border-amber-600/40 bg-zinc-950 text-zinc-100 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-amber-200/70">Rame</Label>
                      <Input
                        type="number"
                        min={0}
                        value={completeTreasureCp}
                        onChange={(e) => setCompleteTreasureCp(e.target.value)}
                        className="h-8 border-amber-600/40 bg-zinc-950 text-zinc-100 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Crea il tesoretto di gruppo: in chiusura sessione o dal GM Screen potrai distribuirlo ai PG.
                  </p>
                  <Button
                    type="button"
                    className="w-full bg-emerald-700 text-white hover:bg-emerald-600"
                    disabled={isPending || !completeGuildId}
                    onClick={() => submitCompleteMission()}
                  >
                    Completa missione e assegna punti
                  </Button>
                </div>
              )}

              {isGmOrAdmin &&
                (normalizeMissionStatus(detailsMission.status) === "open" ||
                  normalizeMissionStatus(detailsMission.status) === "in_progress") &&
                guilds.length === 0 && (
                <p className="text-sm text-amber-200/80">
                  Aggiungi almeno una gilda nella tab Classifica per poter chiudere una missione.
                </p>
              )}

              {isGmOrAdmin && normalizeMissionStatus(detailsMission.status) === "completed" && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-amber-600/40 text-amber-100"
                  disabled={isPending}
                  onClick={() => submitReopenMission()}
                >
                  Riapri missione (ritira i punti dalla gilda)
                </Button>
              )}

              {isGmOrAdmin && normalizeMissionStatus(detailsMission.status) === "open" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-amber-500/40 text-amber-100 hover:bg-amber-500/15"
                    disabled={isPending}
                    onClick={() => submitSetMissionProgress("in_progress")}
                  >
                    Segna missione in corso
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500/40 text-red-100 hover:bg-red-500/15"
                    disabled={isPending}
                    onClick={() => submitSetMissionAvailability("completed")}
                  >
                    Segna missione non accettabile
                  </Button>
                </div>
              )}

              {isGmOrAdmin && normalizeMissionStatus(detailsMission.status) === "in_progress" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/15"
                    disabled={isPending}
                    onClick={() => submitSetMissionProgress("open")}
                  >
                    Segna missione accettabile
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500/40 text-red-100 hover:bg-red-500/15"
                    disabled={isPending}
                    onClick={() => submitSetMissionAvailability("completed")}
                  >
                    Segna missione non accettabile
                  </Button>
                </div>
              )}

              {isGmOrAdmin && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-amber-600/20 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDetailsOpen(false);
                      openEditMission(detailsMission);
                    }}
                    className="border-amber-600/40 text-amber-100 hover:bg-amber-600/15"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifica
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => onDeleteMission(detailsMission.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <DialogDescription>Nessuna missione selezionata.</DialogDescription>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-brass-base/40 bg-[#140f0c] text-parchment-100 shadow-2xl backdrop-blur-md sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl font-extrabold text-gold-relief">
              {editMode === "add" ? "Nuovo Bando di Taglia" : "Modifica Bando di Taglia"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="m-grade" className="text-zinc-200">
                  Grado (testo libero, es. difficoltà)
                </Label>
                <Input
                  id="m-grade"
                  value={missionDraft.grade}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, grade: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-pts" className="text-zinc-200">
                  Punti premio (gilda)
                </Label>
                <Input
                  id="m-pts"
                  type="number"
                  min={0}
                  value={missionDraft.points_reward}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, points_reward: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-urgency" className="text-zinc-200">
                  Urgenza
                </Label>
                <Input
                  id="m-urgency"
                  value={missionDraft.urgenza}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, urgenza: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <NameGeneratorField
                  id="m-title"
                  value={missionDraft.title}
                  onChange={(title) => setMissionDraft((d) => ({ ...d, title }))}
                  kind="mission"
                  campaignId={campaignId}
                  label="Titolo"
                  inputClassName="border-amber-600/30 bg-zinc-950"
                  hint={missionDraft.description.slice(0, 300) || undefined}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-committente" className="text-zinc-200">
                  Committente
                </Label>
                <Input
                  id="m-committente"
                  value={missionDraft.committente}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, committente: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-ubicazione" className="text-zinc-200">
                  Ubicazione
                </Label>
                <Input
                  id="m-ubicazione"
                  value={missionDraft.ubicazione}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, ubicazione: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="m-paga" className="text-zinc-200">
                  Paga
                </Label>
                <Input
                  id="m-paga"
                  value={missionDraft.paga}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, paga: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="m-desc" className="text-zinc-200">
                Descrizione
              </Label>
              <Textarea
                id="m-desc"
                value={missionDraft.description}
                onChange={(e) => setMissionDraft((d) => ({ ...d, description: e.target.value }))}
                className="min-h-[140px] border-amber-600/30 bg-zinc-950"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="text-zinc-300">
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => void submitMission()}
              disabled={isPending}
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
            >
              {editMode === "add" ? "Aggiungi" : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={guildDialogOpen} onOpenChange={setGuildDialogOpen}>
        <DialogContent className="border-brass-base/40 bg-[#140f0c] text-parchment-100 shadow-2xl backdrop-blur-md sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel text-xl font-extrabold text-gold-relief">
              {guildDialogMode === "add" ? "Registra Nuova Gilda" : "Modifica Gilda"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <NameGeneratorField
              id="g-name"
              value={guildDraft.name}
              onChange={(name) => setGuildDraft((d) => ({ ...d, name }))}
              kind="guild"
              campaignId={campaignId}
              label="Nome della gilda"
              inputClassName="border-amber-600/30 bg-zinc-950"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-zinc-200">Rango (D–S)</Label>
                <Select
                  value={guildDraft.rank}
                  onValueChange={(v) =>
                    setGuildDraft((d) => ({
                      ...d,
                      rank: v as (typeof GUILD_RANK_LETTERS)[number],
                    }))
                  }
                >
                  <SelectTrigger className="border-amber-600/40 bg-zinc-950 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-amber-600/30 bg-zinc-950 text-zinc-100">
                    {GUILD_RANK_LETTERS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-score" className="text-zinc-200">
                  Punteggio
                </Label>
                <Input
                  id="g-score"
                  type="number"
                  min={0}
                  value={guildDraft.score}
                  onChange={(e) => setGuildDraft((d) => ({ ...d, score: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-600/25 bg-zinc-900/50 p-3">
              <input
                type="checkbox"
                id="g-auto-rank"
                checked={guildDraft.autoRank}
                onChange={(e) => setGuildDraft((d) => ({ ...d, autoRank: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-amber-600/50 bg-zinc-950 text-amber-600"
              />
              <div>
                <Label htmlFor="g-auto-rank" className="cursor-pointer text-zinc-200">
                  Rango automatico dai punti
                </Label>
                <p className="text-xs text-zinc-400 mt-1">
                  Se attivo, al completamento di una missione il rango viene ricalcolato dalle soglie. Se disattivo,
                  solo i punti cambiano: puoi tenere un rango narrativo diverso finché non usi «Rango da punti» nella
                  tabella.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setGuildDialogOpen(false)} className="text-zinc-300">
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => void submitGuild()}
              disabled={isPending}
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
            >
              {guildDialogMode === "add" ? "Aggiungi" : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {encounterMission ? (
        <MissionEncounterEditor
          campaignId={campaignId}
          mission={{ id: encounterMission.id, title: encounterMission.title }}
          open={encounterEditorOpen}
          onOpenChange={(open) => {
            setEncounterEditorOpen(open);
            if (!open) {
              setEncounterMission(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

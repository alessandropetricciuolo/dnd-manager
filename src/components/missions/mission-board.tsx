"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  applyGuildRankFromPointsAction,
  completeMissionAction,
  createGuildAction,
  createMissionAction,
  deleteGuildAction,
  deleteMissionAction,
  reopenMissionAction,
  updateGuildAction,
  updateMissionAction,
} from "@/lib/actions/mission-actions";
import { updateMissionTreasureAction } from "@/lib/actions/campaign-economy-actions";
import { GUILD_RANK_LETTERS, guildRankOrder } from "@/lib/missions/guild-ranks";
import { BulkImportMissionsDialog } from "@/components/missions/bulk-import-missions-dialog";

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

export function MissionBoard({
  campaignId,
  missions,
  guilds,
  isGmOrAdmin,
  isAdmin,
}: MissionBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sortedGuilds = useMemo(() => {
    return [...guilds].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return guildRankOrder(b.rank ?? "D") - guildRankOrder(a.rank ?? "D");
    });
  }, [guilds]);

  const sortedMissions = useMemo(() => {
    return [...missions].sort((a, b) => {
      const ao = a.status === "open" ? 0 : 1;
      const bo = b.status === "open" ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return 0;
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
    if (!detailsMission || detailsMission.status !== "open") return;
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
        "relative overflow-hidden rounded-xl border p-4 font-serif md:p-6",
        "font-[var(--font-missions)]",
        "border-amber-600/25 bg-[linear-gradient(180deg,rgba(28,25,23,0.2),rgba(0,0,0,0.35))]",
        "shadow-[0_0_0_1px_rgba(217,119,6,0.16),0_0_40px_rgba(56,189,248,0.06)]"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 9px), linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.55))",
        }}
      />

      <div className="pointer-events-none absolute inset-0 opacity-100">
        <div className="absolute -left-24 -top-12 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.35),transparent_60%)] blur-sm" />
        <div className="absolute left-1/2 top-[-30px] h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.35),transparent_60%)] blur-sm" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(56,189,248,0.10),transparent_45%),linear-gradient(250deg,rgba(168,85,247,0.12),transparent_40%)] mix-blend-screen" />
      </div>

      <div className="relative">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-widest text-amber-200 drop-shadow-[0_0_18px_rgba(56,189,248,0.25)] md:text-xl">
              Missioni
            </h2>
            <p className="mt-1 max-w-xl text-xs text-zinc-400">
              Ranghi gilda: D → C → B → A → S. I punti premio delle missioni completate aumentano il punteggio; se
              «Rango automatico» è attivo, il rango si aggiorna alle soglie (modificabili nel codice). Puoi sempre
              impostare rango e punti a mano nella gilda.
            </p>
          </div>
          {isGmOrAdmin && (
            <div className="flex flex-wrap gap-2">
              {isAdmin ? <BulkImportMissionsDialog campaignId={campaignId} /> : null}
              <Button onClick={openAddMission} disabled={isPending} className="bg-amber-600 text-zinc-950 hover:bg-amber-500">
                <Plus className="mr-2 h-4 w-4" />
                Nuova Missione
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="missions">
          <TabsList className="mb-3 bg-zinc-950/30 border border-amber-600/25 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/40">
            <TabsTrigger value="missions">Missioni</TabsTrigger>
            <TabsTrigger value="ranking">Classifica</TabsTrigger>
          </TabsList>

          <TabsContent value="missions">
            <div className="rounded-lg border border-amber-600/20 bg-zinc-950/30 p-3 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-600/20 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Stato</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Grado</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Titolo</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Committente</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Ubicazione</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Paga</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Urgenza</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">Pt.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-zinc-400">
                        Nessuna missione disponibile.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedMissions.map((m) => (
                      <TableRow
                        key={m.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          "hover:bg-amber-600/10",
                          m.status === "completed" && "opacity-70"
                        )}
                        onClick={() => openDetailsMission(m)}
                      >
                        <TableCell className="whitespace-nowrap text-xs text-amber-100/90">
                          {m.status === "completed" ? "Completata" : "Disponibile"}
                        </TableCell>
                        <TableCell className="font-medium text-amber-100">{m.grade}</TableCell>
                        <TableCell className="text-zinc-100">{m.title}</TableCell>
                        <TableCell className="text-zinc-200">{m.committente}</TableCell>
                        <TableCell className="text-zinc-200">{m.ubicazione}</TableCell>
                        <TableCell className="text-zinc-200">{m.paga}</TableCell>
                        <TableCell className="text-zinc-200">{m.urgenza}</TableCell>
                        <TableCell className="text-zinc-200">{m.points_reward ?? 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="ranking">
            <div className="rounded-lg border border-amber-600/20 bg-zinc-950/30 p-3">
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
        <DialogContent className="border-amber-600/30 bg-zinc-950 text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Missione</DialogTitle>
          </DialogHeader>

          {detailsMission ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    detailsMission.status === "completed"
                      ? "bg-emerald-900/50 text-emerald-200"
                      : "bg-amber-900/40 text-amber-200"
                  )}
                >
                  {detailsMission.status === "completed" ? "Completata" : "Disponibile"}
                </span>
                <span className="text-zinc-400">
                  Punti premio: <strong className="text-zinc-200">{detailsMission.points_reward ?? 0}</strong>
                </span>
              </div>

              {detailsMission.status === "completed" && (
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-amber-200/70">Grado</p>
                  <p className="font-semibold">{detailsMission.grade}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-200/70">Titolo</p>
                  <p className="font-semibold">{detailsMission.title}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-200/70">Committente</p>
                  <p>{detailsMission.committente}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-200/70">Ubicazione</p>
                  <p>{detailsMission.ubicazione}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-200/70">Paga</p>
                  <p>{detailsMission.paga}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-200/70">Urgenza</p>
                  <p>{detailsMission.urgenza}</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-600/20 bg-zinc-950/30 p-3">
                <p className="mb-2 text-xs text-amber-200/70">Descrizione</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{detailsMission.description}</p>
              </div>

              {isGmOrAdmin && detailsMission.status === "open" && guilds.length > 0 && (
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

              {isGmOrAdmin && detailsMission.status === "open" && guilds.length === 0 && (
                <p className="text-sm text-amber-200/80">
                  Aggiungi almeno una gilda nella tab Classifica per poter chiudere una missione.
                </p>
              )}

              {isGmOrAdmin && detailsMission.status === "completed" && (
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
        <DialogContent className="border-amber-600/30 bg-zinc-950 text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode === "add" ? "Nuova Missione" : "Modifica Missione"}</DialogTitle>
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
                <Label htmlFor="m-title" className="text-zinc-200">
                  Titolo
                </Label>
                <Input
                  id="m-title"
                  value={missionDraft.title}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, title: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
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
        <DialogContent className="border-amber-600/30 bg-zinc-950 text-zinc-100 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{guildDialogMode === "add" ? "Nuova Gilda" : "Modifica Gilda"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1">
              <Label htmlFor="g-name" className="text-zinc-200">
                Nome della gilda
              </Label>
              <Input
                id="g-name"
                value={guildDraft.name}
                onChange={(e) => setGuildDraft((d) => ({ ...d, name: e.target.value }))}
                className="border-amber-600/30 bg-zinc-950"
              />
            </div>

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
    </div>
  );
}

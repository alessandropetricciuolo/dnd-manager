"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  createGuildAction,
  createMissionAction,
  deleteGuildAction,
  deleteMissionAction,
  updateGuildAction,
  updateMissionAction,
} from "@/lib/actions/mission-actions";

type MissionBoardMission = {
  id: string;
  grade: string;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
};

type MissionBoardGuild = {
  id: string;
  name: string;
  grade: number;
  score: number;
};

type MissionBoardProps = {
  campaignId: string;
  missions: MissionBoardMission[];
  guilds: MissionBoardGuild[];
  isGmOrAdmin: boolean;
};

const EMPTY_MISSION_DRAFT = {
  grade: "",
  title: "",
  committente: "",
  ubicazione: "",
  paga: "",
  urgenza: "",
  description: "",
};

const EMPTY_GUILD_DRAFT = {
  name: "",
  grade: "",
  score: "",
};

export function MissionBoard({
  campaignId,
  missions,
  guilds,
  isGmOrAdmin,
}: MissionBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const sortedGuilds = useMemo(() => {
    return [...guilds].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.grade - a.grade;
    });
  }, [guilds]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMission, setDetailsMission] = useState<MissionBoardMission | null>(null);

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
    });
    setEditOpen(true);
  };

  const openDetailsMission = (m: MissionBoardMission) => {
    setDetailsMission(m);
    setDetailsOpen(true);
  };

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
      grade: String(g.grade),
      score: String(g.score),
    });
    setGuildDialogOpen(true);
  };

  async function submitMission() {
    const { grade, title, committente, ubicazione, paga, urgenza, description } = missionDraft;

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
              description
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
              description
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
    const gradeNum = Number.parseInt(guildDraft.grade, 10);
    const scoreNum = Number.parseInt(guildDraft.score, 10);

    if (!name || Number.isNaN(gradeNum) || Number.isNaN(scoreNum)) {
      toast.error("Compila correttamente nome, grado e punteggio.");
      return;
    }

    startTransition(async () => {
      const res =
        guildDialogMode === "add" || !editGuildId
          ? await createGuildAction(campaignId, name, gradeNum, scoreNum)
          : await updateGuildAction(campaignId, editGuildId, name, gradeNum, scoreNum);

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

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 font-serif md:p-6",
        "font-[var(--font-missions)]",
        "border-amber-600/25 bg-[linear-gradient(180deg,rgba(28,25,23,0.2),rgba(0,0,0,0.35))]",
        "shadow-[0_0_0_1px_rgba(217,119,6,0.16),0_0_40px_rgba(56,189,248,0.06)]"
      )}
    >
      {/* "Muro di pietra" (finto) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 10px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 9px), linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.55))",
        }}
      />

      {/* Cristallo: proiezione luce */}
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
          </div>
          {isGmOrAdmin && (
            <div className="flex gap-2">
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
            <div className="rounded-lg border border-amber-600/20 bg-zinc-950/30 p-3">
              <Table>
                <TableHeader>
                  <TableRow className="border-amber-600/20 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Grado
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Titolo
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Committente
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Ubicazione
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Paga
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Urgenza
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-zinc-400">
                        Nessuna missione disponibile.
                      </TableCell>
                    </TableRow>
                  ) : (
                    missions.map((m) => (
                      <TableRow
                        key={m.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          "hover:bg-amber-600/10"
                        )}
                        onClick={() => openDetailsMission(m)}
                      >
                        <TableCell className="font-medium text-amber-100">{m.grade}</TableCell>
                        <TableCell className="text-zinc-100">{m.title}</TableCell>
                        <TableCell className="text-zinc-200">{m.committente}</TableCell>
                        <TableCell className="text-zinc-200">{m.ubicazione}</TableCell>
                        <TableCell className="text-zinc-200">{m.paga}</TableCell>
                        <TableCell className="text-zinc-200">{m.urgenza}</TableCell>
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
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Nome della gilda
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Grado
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-amber-200/90">
                      Punteggio
                    </TableHead>
                    {isGmOrAdmin && <TableHead className="text-amber-200">Azioni</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGuilds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isGmOrAdmin ? 4 : 3} className="text-zinc-400">
                        Nessuna gilda in classifica.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedGuilds.map((g) => (
                      <TableRow key={g.id} className="hover:bg-amber-600/10">
                        <TableCell className="text-zinc-100">{g.name}</TableCell>
                        <TableCell className="text-zinc-200">{g.grade}</TableCell>
                        <TableCell className="text-zinc-200">{g.score}</TableCell>
                        {isGmOrAdmin && (
                          <TableCell>
                            <div className="flex justify-end gap-2">
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

      {/* Mission details */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-950 text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dettagli Missione</DialogTitle>
          </DialogHeader>

          {detailsMission ? (
            <div className="space-y-4">
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
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
                  {detailsMission.description}
                </p>
              </div>

              {isGmOrAdmin && (
                <div className="flex flex-wrap justify-end gap-2">
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
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDeleteMission(detailsMission.id)}
                  >
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

      {/* Mission add/edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-950 text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editMode === "add" ? "Nuova Missione" : "Modifica Missione"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="m-grade" className="text-zinc-200">
                  Grado
                </Label>
                <Input
                  id="m-grade"
                  value={missionDraft.grade}
                  onChange={(e) => setMissionDraft((d) => ({ ...d, grade: e.target.value }))}
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditOpen(false)}
              className="text-zinc-300"
            >
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

      {/* Guild add/edit */}
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
                <Label htmlFor="g-grade" className="text-zinc-200">
                  Grado
                </Label>
                <Input
                  id="g-grade"
                  type="number"
                  value={guildDraft.grade}
                  onChange={(e) => setGuildDraft((d) => ({ ...d, grade: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-score" className="text-zinc-200">
                  Punteggio
                </Label>
                <Input
                  id="g-score"
                  type="number"
                  value={guildDraft.score}
                  onChange={(e) => setGuildDraft((d) => ({ ...d, score: e.target.value }))}
                  className="border-amber-600/30 bg-zinc-950"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setGuildDialogOpen(false)}
              className="text-zinc-300"
            >
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


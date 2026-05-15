"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Plus, Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addCampaignMemberForGm,
  assignCampaignMemberParty,
  createCampaignParty,
  deleteCampaignParty,
  listAssignablePlayersForCampaign,
  listCampaignMembersForGm,
  listCampaignParties,
  removeCampaignMemberForGm,
  type AssignablePlayerForCampaignRow,
  type CampaignMemberForGmRow,
} from "@/app/campaigns/actions";
import { cn } from "@/lib/utils";

const UNASSIGNED_COLUMN_ID = "__unassigned__";
const FALLBACK_PARTY_COLORS = ["#d97706", "#dc2626", "#2563eb", "#059669", "#7c3aed"];

type PartyColumn = {
  id: string;
  name: string;
  color: string;
};

type CampaignPartyMembersPanelProps = {
  campaignId: string;
};

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function partyAccent(color: string | null | undefined, index: number): string {
  const trimmed = color?.trim();
  if (trimmed) return trimmed;
  return FALLBACK_PARTY_COLORS[index % FALLBACK_PARTY_COLORS.length];
}

function MemberChip({
  member,
  parties,
  accentColor,
  saving,
  removing,
  onAssign,
  onRemove,
}: {
  member: CampaignMemberForGmRow;
  parties: PartyColumn[];
  accentColor: string;
  saving: boolean;
  removing: boolean;
  onAssign: (playerId: string, partyId: string) => void;
  onRemove: (playerId: string) => void;
}) {
  const busy = saving || removing;

  return (
    <div
      className="group flex items-center gap-2 rounded-lg bg-barber-dark/90 px-2 py-1.5 ring-1 ring-inset ring-barber-gold/10"
      style={{ boxShadow: `inset 3px 0 0 0 ${accentColor}40` }}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-barber-paper"
        style={{ backgroundColor: `${accentColor}30` }}
      >
        {playerInitials(member.player_name)}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm text-barber-paper">{member.player_name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-barber-paper/50 opacity-100 hover:bg-barber-gold/10 hover:text-barber-gold sm:opacity-0 sm:group-hover:opacity-100"
            disabled={busy}
            aria-label={`Azioni per ${member.player_name}`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MoreHorizontal className="h-3.5 w-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-barber-gold/25 bg-barber-dark text-barber-paper"
        >
          <DropdownMenuLabel className="text-barber-gold/80">Sposta in gruppo</DropdownMenuLabel>
          <DropdownMenuItem
            className="focus:bg-barber-gold/10 focus:text-barber-gold"
            onClick={() => onAssign(member.player_id, "")}
          >
            Senza gruppo
          </DropdownMenuItem>
          {parties.map((party) => (
            <DropdownMenuItem
              key={party.id}
              className="focus:bg-barber-gold/10 focus:text-barber-gold"
              disabled={member.party_id === party.id}
              onClick={() => onAssign(member.player_id, party.id)}
            >
              <span
                className="mr-2 inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: party.color }}
              />
              {party.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-barber-gold/15" />
          <DropdownMenuItem
            className="text-red-300 focus:bg-red-500/15 focus:text-red-200"
            onClick={() => onRemove(member.player_id)}
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Rimuovi dalla campagna
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CampaignPartyMembersPanel({ campaignId }: CampaignPartyMembersPanelProps) {
  const [loading, setLoading] = useState(true);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [creatingParty, setCreatingParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [parties, setParties] = useState<PartyColumn[]>([]);
  const [members, setMembers] = useState<CampaignMemberForGmRow[]>([]);
  const [assignablePlayers, setAssignablePlayers] = useState<AssignablePlayerForCampaignRow[]>([]);
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState("");
  const [selectedPartyForAdd, setSelectedPartyForAdd] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [partyPendingDelete, setPartyPendingDelete] = useState<PartyColumn | null>(null);
  const [deletePartyLoading, setDeletePartyLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [partiesRes, membersRes, assignableRes] = await Promise.all([
      listCampaignParties(campaignId),
      listCampaignMembersForGm(campaignId),
      listAssignablePlayersForCampaign(campaignId),
    ]);
    setLoading(false);

    if (partiesRes.success && partiesRes.data) {
      setParties(
        partiesRes.data.map((p, i) => ({
          id: p.id,
          name: p.name,
          color: partyAccent(p.color, i),
        }))
      );
    } else {
      setParties([]);
      if (partiesRes.message) toast.error(partiesRes.message);
    }

    if (membersRes.success && membersRes.data) {
      setMembers(membersRes.data);
    } else {
      setMembers([]);
      if (membersRes.message) toast.error(membersRes.message);
    }

    if (assignableRes.success && assignableRes.data) {
      setAssignablePlayers(assignableRes.data);
    } else {
      setAssignablePlayers([]);
      if (assignableRes.message) toast.error(assignableRes.message);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const membersByColumn = useMemo(() => {
    const map = new Map<string, CampaignMemberForGmRow[]>();
    map.set(UNASSIGNED_COLUMN_ID, []);
    for (const party of parties) {
      map.set(party.id, []);
    }
    for (const member of members) {
      const key = member.party_id && map.has(member.party_id) ? member.party_id : UNASSIGNED_COLUMN_ID;
      map.get(key)!.push(member);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.player_name.localeCompare(b.player_name, "it"));
    }
    return map;
  }, [members, parties]);

  const columns: PartyColumn[] = useMemo(
    () => [
      { id: UNASSIGNED_COLUMN_ID, name: "Senza gruppo", color: "#78716c" },
      ...parties,
    ],
    [parties]
  );

  async function handleCreateParty() {
    if (!newPartyName.trim() || creatingParty) return;
    setCreatingParty(true);
    const res = await createCampaignParty(campaignId, { name: newPartyName.trim() });
    setCreatingParty(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Errore nella creazione del gruppo.");
      return;
    }
    toast.success("Gruppo creato.");
    setNewPartyName("");
    await loadData();
  }

  async function handleAssignParty(playerId: string, nextPartyId: string) {
    setSavingPlayerId(playerId);
    const res = await assignCampaignMemberParty(campaignId, playerId, nextPartyId || null);
    setSavingPlayerId(null);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setMembers((prev) =>
      prev.map((m) =>
        m.player_id === playerId
          ? {
              ...m,
              party_id: nextPartyId || null,
              party_name: nextPartyId ? parties.find((p) => p.id === nextPartyId)?.name ?? null : null,
            }
          : m
      )
    );
    toast.success("Gruppo aggiornato.");
  }

  async function handleAddMember() {
    if (!selectedPlayerToAdd || addingMember) return;
    setAddingMember(true);
    const res = await addCampaignMemberForGm(campaignId, selectedPlayerToAdd, selectedPartyForAdd || null);
    setAddingMember(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Giocatore aggiunto alla campagna.");
    setSelectedPlayerToAdd("");
    setSelectedPartyForAdd("");
    setAddSheetOpen(false);
    await loadData();
  }

  async function handleRemoveMember(playerId: string) {
    setRemovingPlayerId(playerId);
    const res = await removeCampaignMemberForGm(campaignId, playerId);
    setRemovingPlayerId(null);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Membro rimosso.");
    await loadData();
  }

  const memberCountInPendingDeleteParty = partyPendingDelete
    ? (membersByColumn.get(partyPendingDelete.id) ?? []).length
    : 0;

  async function handleConfirmDeleteParty() {
    if (!partyPendingDelete || deletePartyLoading) return;
    setDeletePartyLoading(true);
    const res = await deleteCampaignParty(campaignId, partyPendingDelete.id);
    setDeletePartyLoading(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    setPartyPendingDelete(null);
    await loadData();
  }

  return (
    <>
      <AlertDialog
        open={partyPendingDelete !== null}
        onOpenChange={(o) => !o && !deletePartyLoading && setPartyPendingDelete(null)}
      >
        <AlertDialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il gruppo &quot;{partyPendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-barber-paper/70">
              {memberCountInPendingDeleteParty > 0 ? (
                memberCountInPendingDeleteParty === 1 ? (
                  <>
                    Il giocatore in questo gruppo verrà spostato in <strong>Senza gruppo</strong>.
                  </>
                ) : (
                  <>
                    I {memberCountInPendingDeleteParty} giocatori in questo gruppo verranno spostati in{" "}
                    <strong>Senza gruppo</strong>.
                  </>
                )
              ) : (
                <>Nessun giocatore è assegnato a questo gruppo.</>
              )}{" "}
              Le sessioni collegate a questo gruppo perderanno l&apos;associazione al gruppo. L&apos;operazione non si
              può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
              disabled={deletePartyLoading}
            >
              Annulla
            </AlertDialogCancel>
            <Button
              type="button"
              className="bg-red-700 text-white hover:bg-red-600"
              disabled={deletePartyLoading}
              onClick={() => void handleConfirmDeleteParty()}
            >
              {deletePartyLoading ? "Eliminazione..." : "Elimina gruppo"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="mb-8 rounded-xl border border-barber-gold/25 bg-barber-dark/40 p-4 sm:p-5">
      <SectionHeader
        eyebrow="Campagna long"
        title="Gruppi e avventurieri"
        description="Organizza i party per sessioni, wiki e visibilità. Usa l’icona cestino sul gruppo per eliminarlo; ⋯ sul giocatore per spostarlo."
        level={3}
        icon={<Users className="h-5 w-5" />}
        className="mb-4"
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
              onClick={() => setAddSheetOpen(true)}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Aggiungi giocatore
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={newPartyName}
          onChange={(e) => setNewPartyName(e.target.value)}
          placeholder="Nome nuovo gruppo"
          className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
          disabled={creatingParty}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void handleCreateParty())}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
          onClick={() => void handleCreateParty()}
          disabled={!newPartyName.trim() || creatingParty}
        >
          {creatingParty ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" />
              Crea gruppo
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-barber-paper/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento roster...
        </div>
      ) : members.length === 0 && parties.length === 0 ? (
        <p className="rounded-lg border border-dashed border-barber-gold/30 px-4 py-8 text-center text-sm text-barber-paper/60">
          Nessun avventuriero in campagna. Crea un gruppo e aggiungi i giocatori.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {columns.map((column) => {
            const columnMembers = membersByColumn.get(column.id) ?? [];
            const isUnassigned = column.id === UNASSIGNED_COLUMN_ID;
            return (
              <div
                key={column.id}
                className={cn(
                  "flex min-h-[120px] w-[min(100%,240px)] shrink-0 flex-col rounded-xl border bg-barber-dark/60",
                  isUnassigned ? "border-barber-gold/20" : "border-barber-gold/30"
                )}
                style={
                  !isUnassigned
                    ? { borderTopColor: column.color, borderTopWidth: 3 }
                    : undefined
                }
              >
                <div className="border-b border-barber-gold/10 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-barber-paper">
                      {column.name}
                    </p>
                    <span className="rounded-full bg-barber-gold/10 px-2 py-0.5 text-[10px] font-medium text-barber-gold">
                      {columnMembers.length}
                    </span>
                    {!isUnassigned ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-barber-paper/45 hover:bg-red-500/15 hover:text-red-300"
                        aria-label={`Elimina gruppo ${column.name}`}
                        onClick={() => setPartyPendingDelete(column)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2">
                  {columnMembers.length === 0 ? (
                    <p className="px-1 py-4 text-center text-[11px] text-barber-paper/40">
                      {isUnassigned ? "Nessun giocatore libero" : "Nessun giocatore in questo gruppo"}
                    </p>
                  ) : (
                    columnMembers.map((member) => (
                      <MemberChip
                        key={member.player_id}
                        member={member}
                        parties={parties}
                        accentColor={column.color}
                        saving={savingPlayerId === member.player_id}
                        removing={removingPlayerId === member.player_id}
                        onAssign={(playerId, partyId) => void handleAssignParty(playerId, partyId)}
                        onRemove={(playerId) => void handleRemoveMember(playerId)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </section>

      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <SheetContent
          side="right"
          className="border-barber-gold/25 bg-barber-dark text-barber-paper sm:max-w-md"
        >
          <SheetHeader className="border-b border-barber-gold/15 pb-4 text-left">
            <SheetTitle className="font-serif text-barber-paper">Aggiungi giocatore</SheetTitle>
            <SheetDescription className="text-barber-paper/65">
              Inserisce il giocatore nella campagna Long, opzionalmente in un gruppo.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-barber-paper/70">Giocatore</label>
              <select
                className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                value={selectedPlayerToAdd}
                onChange={(e) => setSelectedPlayerToAdd(e.target.value)}
                disabled={addingMember}
              >
                <option value="">Seleziona giocatore</option>
                {assignablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-barber-paper/70">Gruppo (opzionale)</label>
              <select
                className="flex h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                value={selectedPartyForAdd}
                onChange={(e) => setSelectedPartyForAdd(e.target.value)}
                disabled={addingMember}
              >
                <option value="">Senza gruppo</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>
            {assignablePlayers.length === 0 ? (
              <p className="text-xs text-barber-paper/50">Nessun giocatore disponibile da aggiungere.</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddSheetOpen(false)}
                disabled={addingMember}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-barber-red hover:bg-barber-red/90"
                disabled={!selectedPlayerToAdd || addingMember}
                onClick={() => void handleAddMember()}
              >
                {addingMember ? "Aggiungo..." : "Aggiungi"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addPlayerPlayedCampaignAction,
  removePlayerPlayedCampaignAction,
} from "./actions";

type PlayerRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

type CampaignRow = {
  id: string;
  name: string;
  type: "oneshot" | "quest" | "long" | null;
};

type MembershipRow = {
  player_id: string;
  campaign_id: string;
  joined_at: string;
};

type PlayerCampaignsTableProps = {
  players: PlayerRow[];
  campaigns: CampaignRow[];
  memberships: MembershipRow[];
};

function playerLabel(player: PlayerRow): string {
  return (
    player.display_name ||
    player.nickname ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    "Giocatore"
  );
}

export function PlayerCampaignsTable({
  players,
  campaigns,
  memberships,
}: PlayerCampaignsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCampaignByPlayer, setSelectedCampaignByPlayer] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const campaignsById = useMemo(() => {
    const map = new Map<string, CampaignRow>();
    for (const c of campaigns) map.set(c.id, c);
    return map;
  }, [campaigns]);

  const membershipsByPlayer = useMemo(() => {
    const map = new Map<string, MembershipRow[]>();
    for (const m of memberships) {
      const list = map.get(m.player_id) ?? [];
      list.push(m);
      map.set(m.player_id, list);
    }
    return map;
  }, [memberships]);

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => playerLabel(p).toLowerCase().includes(q));
  }, [players, query]);

  function addCampaign(playerId: string) {
    const campaignId = selectedCampaignByPlayer[playerId];
    if (!campaignId) {
      toast.error("Seleziona una campagna.");
      return;
    }
    startTransition(async () => {
      const result = await addPlayerPlayedCampaignAction(playerId, campaignId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function removeCampaign(playerId: string, campaignId: string) {
    startTransition(async () => {
      const result = await removePlayerPlayedCampaignAction(playerId, campaignId);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Cerca giocatore..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
      />

      <div className="rounded-md border border-barber-gold/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-barber-gold/20 hover:bg-transparent">
              <TableHead className="text-barber-paper/80">Giocatore</TableHead>
              <TableHead className="text-barber-paper/80">Campagne giocate</TableHead>
              <TableHead className="text-barber-paper/80">Aggiungi manualmente</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-barber-paper/60">
                  Nessun giocatore trovato.
                </TableCell>
              </TableRow>
            ) : (
              filteredPlayers.map((player) => {
                const played = membershipsByPlayer.get(player.id) ?? [];
                const playedCampaignIds = new Set(played.map((m) => m.campaign_id));
                const addableCampaigns = campaigns.filter((c) => !playedCampaignIds.has(c.id));
                return (
                  <TableRow key={player.id} className="border-barber-gold/10">
                    <TableCell className="align-top">
                      <div className="font-medium text-barber-paper">{playerLabel(player)}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      {played.length === 0 ? (
                        <span className="text-sm text-barber-paper/60">Nessuna campagna registrata.</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {played
                            .sort((a, b) => Date.parse(b.joined_at) - Date.parse(a.joined_at))
                            .map((m) => {
                              const campaign = campaignsById.get(m.campaign_id);
                              if (!campaign) return null;
                              return (
                                <span key={`${m.player_id}-${m.campaign_id}`} className="inline-flex items-center gap-1">
                                  <Badge variant="outline" className="border-barber-gold/40 text-barber-paper/90">
                                    {campaign.name}
                                  </Badge>
                                  <button
                                    type="button"
                                    className="rounded p-1 text-barber-paper/60 hover:bg-red-500/20 hover:text-red-300"
                                    onClick={() => removeCampaign(player.id, campaign.id)}
                                    disabled={isPending}
                                    title="Rimuovi campagna"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              );
                            })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 min-w-[220px] rounded-md border border-barber-gold/30 bg-barber-dark px-3 text-sm text-barber-paper"
                          value={selectedCampaignByPlayer[player.id] ?? ""}
                          onChange={(e) =>
                            setSelectedCampaignByPlayer((prev) => ({ ...prev, [player.id]: e.target.value }))
                          }
                          disabled={isPending}
                        >
                          <option value="">Seleziona campagna...</option>
                          {addableCampaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addCampaign(player.id)}
                          disabled={isPending || addableCampaigns.length === 0}
                          className="bg-violet-600 text-white hover:bg-violet-500"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Aggiungi
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

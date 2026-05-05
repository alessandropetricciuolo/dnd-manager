import Link from "next/link";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WikiListClient } from "./wiki-list-client";
import { getWikiContentBody } from "@/lib/wiki/content";
import { WIKI_ENTITY_LABELS_IT } from "@/lib/wiki/entity-types";
type WikiListProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
};

export async function WikiList({
  campaignId,
  campaignType = null,
  eligiblePlayers = [],
  eligibleParties = [],
}: WikiListProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="text-sm text-barber-paper/70">Accedi per vedere il wiki.</p>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  type EntityRow = {
    id: string;
    name: string;
    type: string;
    is_secret: boolean;
    visibility?: string;
    sort_order?: number | null;
    tags?: string[] | null;
    content?: { body?: string } | null;
    linked_mission_id?: string | null;
  };
  let entities: EntityRow[] | null = null;
  let error: { message?: string } | null = null;
  const res = await supabase
    .from("wiki_entities")
    .select("id, name, type, is_secret, visibility, sort_order, tags, content, linked_mission_id")
    .eq("campaign_id", campaignId)
    .order("name");
  if (res.error?.message?.includes("linked_mission_id")) {
    const fallback = await supabase
      .from("wiki_entities")
      .select("id, name, type, is_secret, visibility, sort_order, tags, content")
      .eq("campaign_id", campaignId)
      .order("name");
    entities = (fallback.data ?? []).map((e) => ({ ...e, linked_mission_id: null }));
    error = fallback.error;
  } else if (res.error?.message?.includes("sort_order")) {
    const fallback = await supabase
      .from("wiki_entities")
      .select("id, name, type, is_secret, visibility, tags, content")
      .eq("campaign_id", campaignId)
      .order("name");
    entities = (fallback.data ?? []).map((e) => ({ ...e, sort_order: null }));
    error = fallback.error;
  } else if (res.error?.message?.includes("visibility")) {
    const fallback = await supabase
      .from("wiki_entities")
      .select("id, name, type, is_secret, sort_order, tags, content")
      .eq("campaign_id", campaignId)
      .order("name");
    entities = (fallback.data ?? []).map((e) => ({ ...e, visibility: (e as { is_secret?: boolean }).is_secret ? "secret" : "public" }));
    error = fallback.error;
  } else if (res.error?.message?.includes("tags")) {
    const fallback = await supabase
      .from("wiki_entities")
      .select("id, name, type, is_secret, visibility, sort_order, content")
      .eq("campaign_id", campaignId)
      .order("name");
    entities = (fallback.data ?? []).map((e) => ({ ...e, tags: [] }));
    error = fallback.error;
  } else {
    entities = res.data as EntityRow[] | null;
    error = res.error;
  }

  let permittedEntityIds = new Set<string>();
  let unlockedEntityIds = new Set<string>();
  if (!isGmOrAdmin && entities?.length) {
    const [permsRes, explorationsRes] = await Promise.all([
      supabase
        .from("entity_permissions")
        .select("entity_id")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "wiki")
        .eq("user_id", user.id),
      supabase
        .from("explorations")
        .select("entity_id")
        .eq("player_id", user.id)
        .in("entity_id", entities.map((e) => e.id)),
    ]);
    if (permsRes.data?.length) permittedEntityIds = new Set(permsRes.data.map((p) => p.entity_id));
    if (explorationsRes.data?.length) unlockedEntityIds = new Set((explorationsRes.data ?? []).map((e) => e.entity_id).filter(Boolean) as string[]);
  }

  const visibleEntities = isGmOrAdmin
    ? entities ?? []
    : (entities ?? []).filter((e) => {
        const vis = e.visibility ?? (e.is_secret ? "secret" : "public");
        if (vis === "public") return true;
        if (vis === "selective") return permittedEntityIds.has(e.id);
        if (vis === "secret") return unlockedEntityIds.has(e.id);
        return false;
      });
  let selectiveAudienceByEntityId: Record<string, string> = {};
  if (isGmOrAdmin) {
    const selectiveEntityIds = (entities ?? [])
      .filter((e) => (e.visibility ?? (e.is_secret ? "secret" : "public")) === "selective")
      .map((e) => e.id);
    if (selectiveEntityIds.length > 0) {
      const { data: perms } = await supabase
        .from("entity_permissions")
        .select("entity_id, user_id")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "wiki")
        .in("entity_id", selectiveEntityIds);
      const userIdsByEntityId: Record<string, string[]> = {};
      for (const row of perms ?? []) {
        const entityId = row.entity_id as string;
        if (!userIdsByEntityId[entityId]) userIdsByEntityId[entityId] = [];
        userIdsByEntityId[entityId].push(row.user_id as string);
      }
      const playerLabelById = new Map(eligiblePlayers.map((p) => [p.id, p.label]));
      for (const entityId of selectiveEntityIds) {
        const allowedUserIds = [...new Set(userIdsByEntityId[entityId] ?? [])];
        if (allowedUserIds.length === 0) continue;
        const fullParties = eligibleParties.filter(
          (party) => party.memberIds.length > 0 && party.memberIds.every((id) => allowedUserIds.includes(id))
        );
        const coveredByParties = new Set(fullParties.flatMap((party) => party.memberIds));
        const directUsers = allowedUserIds.filter((id) => !coveredByParties.has(id));
        const parts: string[] = [];
        if (fullParties.length > 0) parts.push(fullParties.map((party) => party.label).join(", "));
        if (directUsers.length > 0) {
          const labels = directUsers
            .map((id) => playerLabelById.get(id))
            .filter((x): x is string => typeof x === "string" && x.length > 0);
          if (labels.length > 0) {
            parts.push(labels.slice(0, 2).join(", ") + (labels.length > 2 ? ` +${labels.length - 2}` : ""));
          }
        }
        selectiveAudienceByEntityId[entityId] = parts.join(" · ");
      }
    }
  }

  if (error) {
    return (
      <p className="text-sm text-red-400">Errore nel caricamento del wiki.</p>
    );
  }

  let missionsForLong: { id: string; title: string }[] = [];
  if (campaignType === "long") {
    const { data: missionRows } = await supabase
      .from("campaign_missions")
      .select("id, title")
      .eq("campaign_id", campaignId)
      .order("title", { ascending: true });
    missionsForLong = ((missionRows ?? []) as { id: string; title: string }[]).map((m) => ({
      id: m.id,
      title: m.title?.trim() ? m.title : "Senza titolo",
    }));
  }
  const missionTitleById = new Map(missionsForLong.map((m) => [m.id, m.title]));

  const list = visibleEntities.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    isSecret: !!e.is_secret,
    visibility: e.visibility ?? (e.is_secret ? "secret" : "public"),
    sortOrder: e.sort_order ?? null,
    tags: e.tags ?? [],
    description: getWikiContentBody(e.content),
    selectiveAudienceLabel: selectiveAudienceByEntityId[e.id] ?? null,
    linkedMissionId: e.linked_mission_id ?? null,
    missionTitle: e.linked_mission_id ? missionTitleById.get(e.linked_mission_id) ?? null : null,
  }));

  const emptyMessage = !isGmOrAdmin
    ? "Nessuna conoscenza acquisita ancora. Gioca per scoprire il mondo."
    : undefined;

  return (
    <WikiListClient
      campaignId={campaignId}
      campaignType={campaignType}
      missions={missionsForLong}
      entities={list}
      isGmOrAdmin={isGmOrAdmin ?? false}
      typeLabels={WIKI_ENTITY_LABELS_IT}
      emptyMessage={emptyMessage}
    />
  );
}

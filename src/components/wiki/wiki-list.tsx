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
type WikiListProps = {
  campaignId: string;
};

const TYPE_LABELS: Record<string, string> = {
  npc: "NPC",
  location: "Luogo",
  monster: "Mostro",
  item: "Oggetto",
  lore: "Lore",
};

export async function WikiList({ campaignId }: WikiListProps) {
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

  let entities: { id: string; name: string; type: string; is_secret: boolean; visibility?: string; sort_order?: number | null }[] | null = null;
  let error: { message?: string } | null = null;
  const res = await supabase
    .from("wiki_entities")
    .select("id, name, type, is_secret, visibility, sort_order")
    .eq("campaign_id", campaignId)
    .order("name");
  if (res.error?.message?.includes("sort_order")) {
    const fallback = await supabase
      .from("wiki_entities")
      .select("id, name, type, is_secret, visibility")
      .eq("campaign_id", campaignId)
      .order("name");
    entities = (fallback.data ?? []).map((e) => ({ ...e, sort_order: null }));
    error = fallback.error;
  } else if (res.error?.message?.includes("visibility")) {
    const fallback = await supabase
      .from("wiki_entities")
      .select("id, name, type, is_secret, sort_order")
      .eq("campaign_id", campaignId)
      .order("name");
    entities = (fallback.data ?? []).map((e) => ({ ...e, visibility: (e as { is_secret?: boolean }).is_secret ? "secret" : "public" }));
    error = fallback.error;
  } else {
    entities = res.data;
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

  if (error) {
    return (
      <p className="text-sm text-red-400">Errore nel caricamento del wiki.</p>
    );
  }

  const list = visibleEntities.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    isSecret: !!e.is_secret,
    visibility: e.visibility ?? (e.is_secret ? "secret" : "public"),
    sortOrder: e.sort_order ?? null,
  }));

  const emptyMessage = !isGmOrAdmin
    ? "Nessuna conoscenza acquisita ancora. Gioca per scoprire il mondo."
    : undefined;

  return (
    <WikiListClient
      campaignId={campaignId}
      entities={list}
      isGmOrAdmin={isGmOrAdmin ?? false}
      typeLabels={TYPE_LABELS}
      emptyMessage={emptyMessage}
    />
  );
}

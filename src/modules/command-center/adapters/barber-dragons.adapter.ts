import type { CommandCenterSupabase, TenantAdapter } from "./types";

export const barberDragonsAdapter: TenantAdapter = {
  resolveWorkspaceId() {
    return null;
  },

  async assertCanAccessCommandCenter(supabase) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { ok: false, error: "Non autenticato." };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile as { role?: string } | null)?.role;
    if (role !== "gm" && role !== "admin") {
      return { ok: false, error: "Solo GM e Admin possono usare il Command Center." };
    }
    return {
      ok: true,
      ctx: {
        userId: user.id,
        role: role as "gm" | "admin",
        workspaceId: null,
      },
    };
  },

  async assertCanLinkEntity(supabase, entityType, entityId, campaignId) {
    const access = await barberDragonsAdapter.assertCanAccessCommandCenter(supabase);
    if (!access.ok) return access;

    if (entityType === "campaign") {
      const { data } = await supabase.from("campaigns").select("id").eq("id", entityId).maybeSingle();
      if (!data) return { ok: false, error: "Campagna non trovata." };
      return { ok: true };
    }

    if (entityType === "session") {
      const { data } = await supabase.from("sessions").select("id, campaign_id").eq("id", entityId).maybeSingle();
      const row = data as { id: string; campaign_id: string } | null;
      if (!row) return { ok: false, error: "Sessione non trovata." };
      if (campaignId && row.campaign_id !== campaignId) {
        return { ok: false, error: "La sessione non appartiene alla campagna selezionata." };
      }
      return { ok: true };
    }

    if (
      entityType === "wiki_page" ||
      entityType === "npc" ||
      entityType === "location" ||
      entityType === "lore" ||
      entityType === "item" ||
      entityType === "monster"
    ) {
      const { data } = await supabase
        .from("wiki_entities")
        .select("id, campaign_id")
        .eq("id", entityId)
        .maybeSingle();
      const row = data as { id: string; campaign_id: string } | null;
      if (!row) return { ok: false, error: "Entità wiki non trovata." };
      if (campaignId && row.campaign_id !== campaignId) {
        return { ok: false, error: "L'entità wiki non appartiene alla campagna selezionata." };
      }
      return { ok: true };
    }

    if (entityType === "mission" || entityType === "quest") {
      const { data } = await supabase
        .from("campaign_missions")
        .select("id, campaign_id")
        .eq("id", entityId)
        .maybeSingle();
      const row = data as { id: string; campaign_id: string } | null;
      if (!row) return { ok: false, error: "Missione non trovata." };
      if (campaignId && row.campaign_id !== campaignId) {
        return { ok: false, error: "La missione non appartiene alla campagna selezionata." };
      }
      return { ok: true };
    }

    if (entityType === "task") {
      const { data } = await supabase
        .from("workspace_tasks")
        .select("id")
        .eq("id", entityId)
        .maybeSingle();
      if (!data) return { ok: false, error: "Task non trovato." };
      return { ok: true };
    }

    return { ok: false, error: `Tipo entità non supportato: ${entityType}` };
  },

  async listCampaignsForPicker(supabase) {
    const access = await barberDragonsAdapter.assertCanAccessCommandCenter(supabase);
    if (!access.ok) return [];

    const { data } = await supabase
      .from("campaigns")
      .select("id, name")
      .order("name", { ascending: true });

    return ((data ?? []) as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name }));
  },
};

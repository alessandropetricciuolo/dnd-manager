import type { createSupabaseAdminClient } from "../src/utils/supabase/admin";

export const E2E_CAMPAIGN_NAME_PREFIX = "E2E-QA";

const CAMPAIGN_NAMES = {
  oneshotPlayed: "E2E-QA Oneshot Giocata",
  oneshotSessions: "E2E-QA Oneshot Sessioni",
  oneshotLocked: "E2E-QA Oneshot Bloccata",
  oneshotPrivate: "E2E-QA Oneshot Privata",
  long: "E2E-QA Long",
} as const;

const WIKI_ENTITY_TITLE = "E2E NPC Tavernier";
const PLAYER_CHARACTER_NAME = "E2E-Aldric";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function findCampaignByName(admin: AdminClient, name: string): Promise<string | null> {
  const { data } = await admin.from("campaigns").select("id").eq("name", name).maybeSingle();
  return data?.id ?? null;
}

async function ensureCampaign(
  admin: AdminClient,
  gmId: string,
  spec: {
    name: string;
    type: "oneshot" | "quest" | "long" | "torneo";
    isPublic: boolean;
    isLong?: boolean;
  }
): Promise<string> {
  const existing = await findCampaignByName(admin, spec.name);
  if (existing) {
    await admin
      .from("campaigns")
      .update({
        gm_id: gmId,
        type: spec.type,
        is_public: spec.isPublic,
        is_long_campaign: spec.isLong ?? spec.type === "long",
        long_registrations_open: true,
      } as never)
      .eq("id", existing);
    return existing;
  }

  const { data, error } = await admin
    .from("campaigns")
    .insert({
      gm_id: gmId,
      name: spec.name,
      type: spec.type,
      is_public: spec.isPublic,
      is_long_campaign: spec.isLong ?? spec.type === "long",
      long_registrations_open: true,
      description: "Campagna sandbox Playwright E2E",
    } as never)
    .select("id")
    .single();

  if (error || !data?.id) throw error ?? new Error(`Creazione campagna fallita: ${spec.name}`);
  console.log(`[e2e:provision] campagna: ${spec.name} (${data.id})`);
  return data.id;
}

async function ensureAttendedSignup(
  admin: AdminClient,
  campaignId: string,
  playerId: string,
  gmId: string
) {
  const { data: existingSession } = await admin
    .from("sessions")
    .select("id")
    .eq("campaign_id", campaignId)
    .limit(1)
    .maybeSingle();

  let sessionId = existingSession?.id;
  if (!sessionId) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() - 7);
    const { data: session, error } = await admin
      .from("sessions")
      .insert({
        campaign_id: campaignId,
        scheduled_at: scheduledAt.toISOString(),
        status: "completed",
        max_players: 6,
        dm_id: gmId,
        notes: "E2E sessione passata",
      } as never)
      .select("id")
      .single();
    if (error || !session?.id) throw error ?? new Error("Sessione E2E non creata");
    sessionId = session.id;
  }

  const { data: signup } = await admin
    .from("session_signups")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!signup) {
    const { error } = await admin.from("session_signups").insert({
      session_id: sessionId,
      player_id: playerId,
      status: "attended",
    } as never);
    if (error) throw error;
  } else if (signup.status !== "attended") {
    await admin.from("session_signups").update({ status: "attended" } as never).eq("id", signup.id);
  }
}

async function ensureCampaignMember(admin: AdminClient, campaignId: string, playerId: string) {
  const { data: member } = await admin
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!member) {
    const { error } = await admin.from("campaign_members").insert({
      campaign_id: campaignId,
      player_id: playerId,
    } as never);
    if (error) throw error;
  }
}

async function ensureWikiEntity(admin: AdminClient, campaignId: string, title: string) {
  const { data: existing } = await admin
    .from("wiki_entities")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("name", title)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("wiki_entities")
    .insert({
      campaign_id: campaignId,
      name: title,
      type: "npc",
      content: { body: "NPC creato per test E2E Playwright." },
      visibility: "public",
      is_secret: false,
      attributes: {},
      tags: ["e2e"],
    } as never)
    .select("id")
    .single();

  if (error || !data?.id) throw error ?? new Error("Wiki entity E2E non creata");
  return data.id;
}

async function ensurePlayerCharacter(
  admin: AdminClient,
  campaignId: string,
  playerId: string,
  name: string
) {
  const { data: existing } = await admin
    .from("campaign_characters")
    .select("id, assigned_to")
    .eq("campaign_id", campaignId)
    .eq("name", name)
    .maybeSingle();

  if (existing?.id) {
    if (existing.assigned_to !== playerId) {
      await admin
        .from("campaign_characters")
        .update({ assigned_to: playerId } as never)
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const { data, error } = await admin
    .from("campaign_characters")
    .insert({
      campaign_id: campaignId,
      name,
      image_url: "https://placehold.co/200x200/1c1917/fbbf24/png?text=E2E",
      character_class: "Guerriero",
      level: 1,
      assigned_to: playerId,
    } as never)
    .select("id")
    .single();

  if (error || !data?.id) throw error ?? new Error("PG E2E non creato");
  return data.id;
}

export type E2ECampaignFixtures = {
  oneshotPlayedId: string;
  oneshotSessionsId: string;
  oneshotLockedId: string;
  oneshotPrivateId: string;
  longId: string;
  torneoId: string;
  wikiEntityTitle: string;
  playerCharacterName: string;
};

export async function provisionE2ECampaigns(
  admin: AdminClient,
  gmId: string,
  playerId: string
): Promise<E2ECampaignFixtures> {
  const oneshotPlayedId = await ensureCampaign(admin, gmId, {
    name: CAMPAIGN_NAMES.oneshotPlayed,
    type: "oneshot",
    isPublic: true,
  });
  const oneshotSessionsId = await ensureCampaign(admin, gmId, {
    name: CAMPAIGN_NAMES.oneshotSessions,
    type: "oneshot",
    isPublic: true,
  });
  const oneshotLockedId = await ensureCampaign(admin, gmId, {
    name: CAMPAIGN_NAMES.oneshotLocked,
    type: "oneshot",
    isPublic: true,
  });
  const oneshotPrivateId = await ensureCampaign(admin, gmId, {
    name: CAMPAIGN_NAMES.oneshotPrivate,
    type: "oneshot",
    isPublic: false,
  });
  const longId = await ensureCampaign(admin, gmId, {
    name: CAMPAIGN_NAMES.long,
    type: "long",
    isPublic: true,
    isLong: true,
  });

  const torneoId =
    process.env.E2E_CAMPAIGN_TORNEO_ID?.trim() ||
    (await findCampaignByName(admin, "La Fossa dei draghi")) ||
    oneshotPlayedId;

  await ensureAttendedSignup(admin, oneshotPlayedId, playerId, gmId);
  await ensureCampaignMember(admin, longId, playerId);
  await ensureWikiEntity(admin, oneshotPlayedId, WIKI_ENTITY_TITLE);
  await ensurePlayerCharacter(admin, oneshotPlayedId, playerId, PLAYER_CHARACTER_NAME);

  // Pulisce sessioni e iscrizioni sulla campagna "Sessioni" (player non deve avere has_played)
  const { data: sessionRows } = await admin
    .from("sessions")
    .select("id")
    .eq("campaign_id", oneshotSessionsId);
  if (sessionRows?.length) {
    const ids = sessionRows.map((s) => s.id);
    await admin.from("session_signups").delete().in("session_id", ids);
    await admin.from("sessions").delete().in("id", ids);
  }

  return {
    oneshotPlayedId,
    oneshotSessionsId,
    oneshotLockedId,
    oneshotPrivateId,
    longId,
    torneoId,
    wikiEntityTitle: WIKI_ENTITY_TITLE,
    playerCharacterName: PLAYER_CHARACTER_NAME,
  };
}

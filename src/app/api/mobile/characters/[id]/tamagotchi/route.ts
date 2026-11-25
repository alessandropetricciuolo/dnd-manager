import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  applyTamagotchiDecay,
  normalizeTamagotchiState,
} from "../../../../../../../mobile/src/lib/character-tamagotchi";
import {
  parseTamagotchiPostBody,
  processTamagotchiPostMutation,
  type TamagotchiCasStore,
} from "../../../../../../../mobile/src/lib/tamagotchi-mutation-processor";

export const runtime = "nodejs";

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function authorizeTamagotchiAccess(request: NextRequest, characterId: string) {
  const token = extractBearerToken(request);
  if (!token) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  const admin: any = createSupabaseAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  const userId = userData.user.id;
  const { data: character, error: charErr } = await admin
    .from("campaign_characters")
    .select("id, name, campaign_id, assigned_to, tamagotchi_state, lowpoly_avatar_url")
    .eq("id", characterId)
    .maybeSingle();

  if (charErr) {
    const msg = (charErr.message || "").toLowerCase();
    if (msg.includes("tamagotchi_state") || msg.includes("lowpoly_avatar_url")) {
      return { error: NextResponse.json({ error: "tamagotchi_not_migrated" }, { status: 503 }) };
    }
    return { error: NextResponse.json({ error: "database_error" }, { status: 500 }) };
  }

  if (!character) {
    return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  }

  const { data: campaign, error: campaignErr } = await admin
    .from("campaigns")
    .select("type")
    .eq("id", character.campaign_id)
    .maybeSingle();

  if (campaignErr) {
    return { error: NextResponse.json({ error: "database_error" }, { status: 500 }) };
  }
  if (!campaign || campaign.type !== "long") {
    return { error: NextResponse.json({ error: "long_campaign_only" }, { status: 403 }) };
  }

  if (character.assigned_to !== userId) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return { admin, character, userId };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await authorizeTamagotchiAccess(request, id);
  if ("error" in auth) return auth.error;

  const nowIso = new Date().toISOString();
  const normalized = normalizeTamagotchiState(auth.character.tamagotchi_state, nowIso);
  const state = applyTamagotchiDecay(normalized, nowIso);

  return NextResponse.json({
    state,
    canonicalState: normalized,
    lowpolyAvatarUrl: auth.character.lowpoly_avatar_url ?? null,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await authorizeTamagotchiAccess(request, id);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = parseTamagotchiPostBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const store: TamagotchiCasStore = {
    async readRawState() {
      const { data, error } = await auth.admin
        .from("campaign_characters")
        .select("tamagotchi_state")
        .eq("id", id)
        .eq("assigned_to", auth.userId)
        .maybeSingle();
      if (error || !data) return { rawState: null, error: error?.message || "character_unavailable" };
      return { rawState: data.tamagotchi_state ?? null };
    },
    async compareAndSwap(expectedStateVersion, nextState) {
      let query = auth.admin
        .from("campaign_characters")
        .update({ tamagotchi_state: nextState })
        .eq("id", id)
        .eq("assigned_to", auth.userId);

      if (expectedStateVersion === null) {
        query = query.is("tamagotchi_state->>stateVersion", null);
      } else {
        query = query.eq("tamagotchi_state->>stateVersion", expectedStateVersion);
      }

      const { data, error } = await query.select("id").maybeSingle();
      if (error) {
        return { swapped: false, error: error.message || "database_error" };
      }
      return { swapped: Boolean(data?.id) };
    },
  };

  const result = await processTamagotchiPostMutation({
    initialRawState: auth.character.tamagotchi_state,
    characterName: auth.character.name || "Eroe",
    lowpolyAvatarUrl: auth.character.lowpoly_avatar_url ?? null,
    parsed,
    store,
  });

  return NextResponse.json(result.body, { status: result.status });
}

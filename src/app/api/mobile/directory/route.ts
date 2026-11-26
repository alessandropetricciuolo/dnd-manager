import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";

export const runtime = "nodejs";

function formatPersonLabel(p: {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  nickname?: string | null;
}): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (p.display_name?.trim()) return p.display_name.trim();
  if (p.nickname?.trim()) return p.nickname.trim();
  return "Avventuriero";
}

/**
 * Strictly-scoped directory lookup for mobile clients:
 * Resolves display-only labels (no PII: no email, phone, or birth date) for:
 * 1. GMs of campaigns visible to the authenticated user.
 * 2. DMs and confirmed participants of sessions belonging to those visible campaigns
 *    (matching src/components/session-list.tsx visibility rules).
 */
export async function GET(req: NextRequest) {
  const admin = createSupabaseAdminClient();
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;

  let userId: string | null = null;
  if (bearer) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user) userId = data.user.id;
  } else {
    const { user } = await getRequestAuthContext();
    if (user) userId = user.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  try {
    const { data: callerProfileRaw } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const callerProfile = callerProfileRaw as { role?: string | null } | null;
    const isGmOrAdmin = callerProfile?.role === "gm" || callerProfile?.role === "admin";

    let visibleCampaigns: Array<{ id: string; gm_id: string | null }> = [];
    if (isGmOrAdmin) {
      const { data } = await admin.from("campaigns").select("id, gm_id");
      visibleCampaigns = (data ?? []) as Array<{ id: string; gm_id: string | null }>;
    } else {
      const [memberRes, charRes, signupRes] = await Promise.all([
        admin.from("campaign_members").select("campaign_id").eq("player_id", userId),
        admin.from("campaign_characters").select("campaign_id").eq("assigned_to", userId),
        admin.from("session_signups").select("session_id").eq("player_id", userId),
      ]);

      const signupRowsCaller = (signupRes.data ?? []) as Array<{ session_id: string | null }>;
      const memberRowsCaller = (memberRes.data ?? []) as Array<{ campaign_id: string | null }>;
      const charRowsCaller = (charRes.data ?? []) as Array<{ campaign_id: string | null }>;

      const sessionIdsForCaller = signupRowsCaller
        .map((r) => r.session_id)
        .filter((x): x is string => Boolean(x));
      let signupCampaignIds: string[] = [];
      if (sessionIdsForCaller.length > 0) {
        const { data: sessRowsRaw } = await admin
          .from("sessions")
          .select("campaign_id")
          .in("id", sessionIdsForCaller);
        const sessRows = (sessRowsRaw ?? []) as Array<{ campaign_id: string | null }>;
        signupCampaignIds = sessRows
          .map((s) => s.campaign_id)
          .filter((x): x is string => Boolean(x));
      }

      const allowedIds = Array.from(
        new Set([
          ...memberRowsCaller.map((r) => r.campaign_id).filter((x): x is string => Boolean(x)),
          ...charRowsCaller.map((r) => r.campaign_id).filter((x): x is string => Boolean(x)),
          ...signupCampaignIds,
        ]),
      );

      const query = admin.from("campaigns").select("id, gm_id");
      const { data } =
        allowedIds.length > 0
          ? await query.or(`is_public.eq.true,id.in.(${allowedIds.join(",")})`)
          : await query.eq("is_public", true);
      visibleCampaigns = (data ?? []) as Array<{ id: string; gm_id: string | null }>;
    }

    const visibleCampaignIds = visibleCampaigns.map((c) => c.id);
    const gmUserIds = visibleCampaigns.map((c) => c.gm_id).filter((x): x is string => Boolean(x));

    let sessions: Array<{ id: string; campaign_id: string | null; dm_id: string | null }> = [];
    if (visibleCampaignIds.length > 0) {
      const { data: sessData } = await admin
        .from("sessions")
        .select("id, campaign_id, dm_id")
        .in("campaign_id", visibleCampaignIds);
      sessions = (sessData ?? []) as Array<{ id: string; campaign_id: string | null; dm_id: string | null }>;
    }

    const sessionIds = sessions.map((s) => s.id);
    let signups: Array<{ session_id: string; player_id: string; status: string }> = [];
    if (sessionIds.length > 0) {
      const { data: signupData } = await admin
        .from("session_signups")
        .select("session_id, player_id, status")
        .in("session_id", sessionIds);
      signups = (signupData ?? []) as Array<{ session_id: string; player_id: string; status: string }>;
    }

    // Filter signups to those visible to the caller (exact match with src/components/session-list.tsx)
    const visibleSignups = signups.filter((s) => {
      if (isGmOrAdmin) return s.status !== "cancelled" && s.status !== "rejected";
      return (
        s.status === "attended" ||
        s.status === "approved" ||
        s.status === "confirmed" ||
        (s.player_id === userId && (s.status === "pending" || s.status === "waitlist"))
      );
    });

    const dmUserIds = sessions.map((s) => s.dm_id).filter((x): x is string => Boolean(x));
    const participantUserIds = visibleSignups.map((s) => s.player_id).filter(Boolean);

    const allProfileIds = Array.from(new Set([...gmUserIds, ...dmUserIds, ...participantUserIds]));
    const nameByUserId = new Map<string, string>();
    if (allProfileIds.length > 0) {
      const { data: profRows } = await admin
        .from("profiles")
        .select("id, first_name, last_name, display_name, nickname")
        .in("id", allProfileIds);
      for (const p of (profRows ?? []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        display_name: string | null;
        nickname: string | null;
      }>) {
        nameByUserId.set(p.id, formatPersonLabel(p));
      }
    }

    const gmNames: Record<string, string> = {};
    for (const c of visibleCampaigns) {
      if (c.gm_id && nameByUserId.has(c.gm_id)) {
        gmNames[c.id] = nameByUserId.get(c.gm_id)!;
      }
    }

    const participantsBySession = new Map<string, string[]>();
    for (const s of visibleSignups) {
      const label = nameByUserId.get(s.player_id);
      if (!label) continue;
      const list = participantsBySession.get(s.session_id) ?? [];
      if (!list.includes(label)) list.push(label);
      participantsBySession.set(s.session_id, list);
    }

    const sessionMeta: Record<string, { dmName: string | null; participants: string[] }> = {};
    for (const s of sessions) {
      const dmName =
        (s.dm_id && nameByUserId.get(s.dm_id)) ||
        (s.campaign_id ? gmNames[s.campaign_id] ?? null : null);
      sessionMeta[s.id] = {
        dmName,
        participants: participantsBySession.get(s.id) ?? [],
      };
    }

    return NextResponse.json(
      { gmNames, sessionMeta },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch (err) {
    console.error("[api/mobile/directory]", err);
    return NextResponse.json({ error: "directory_failed" }, { status: 500 });
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type FeedbackResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export type FeedbackSessionForPlayer = {
  sessionId: string;
  title: string;
  scheduledAt: string;
  sessionRating: number | null;
  campaignRating: number | null;
  comment: string | null;
  submittedAt: string | null;
};

export async function listFeedbackSessionsForPlayer(
  campaignId: string
): Promise<FeedbackResult<FeedbackSessionForPlayer[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: attendedRows, error: attendedErr } = await supabase
      .from("session_signups")
      .select("session_id")
      .eq("player_id", user.id)
      .eq("status", "attended");
    if (attendedErr) return { success: false, error: attendedErr.message ?? "Errore nel caricamento sessioni." };

    const sessionIds = [...new Set((attendedRows ?? []).map((r) => r.session_id))];
    if (sessionIds.length === 0) return { success: true, data: [] };

    const { data: sessionsData, error: sessionsErr } = await supabase
      .from("sessions")
      .select("id, title, scheduled_at, campaign_id, status")
      .in("id", sessionIds)
      .eq("campaign_id", campaignId)
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false });
    if (sessionsErr) return { success: false, error: sessionsErr.message ?? "Errore nel caricamento sessioni." };

    const sessions = (sessionsData ?? []) as Array<{
      id: string;
      title: string | null;
      scheduled_at: string;
    }>;
    if (sessions.length === 0) return { success: true, data: [] };

    const feedbackSessionIds = sessions.map((s) => s.id);
    const { data: feedbackRows, error: feedbackErr } = await supabase
      .from("session_feedback")
      .select("session_id, session_rating, campaign_rating, comment, updated_at")
      .eq("player_id", user.id)
      .eq("campaign_id", campaignId)
      .in("session_id", feedbackSessionIds);
    if (feedbackErr) return { success: false, error: feedbackErr.message ?? "Errore nel caricamento feedback." };

    const feedbackMap = new Map(
      ((feedbackRows ?? []) as Array<{
        session_id: string;
        session_rating: number;
        campaign_rating: number;
        comment: string | null;
        updated_at: string;
      }>).map((f) => [f.session_id, f])
    );

    const list: FeedbackSessionForPlayer[] = sessions.map((s) => {
      const current = feedbackMap.get(s.id);
      return {
        sessionId: s.id,
        title: (s.title ?? "").trim() || "Sessione",
        scheduledAt: s.scheduled_at,
        sessionRating: current?.session_rating ?? null,
        campaignRating: current?.campaign_rating ?? null,
        comment: current?.comment ?? null,
        submittedAt: current?.updated_at ?? null,
      };
    });

    return { success: true, data: list };
  } catch (err) {
    console.error("[listFeedbackSessionsForPlayer]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function submitSessionFeedback(
  campaignId: string,
  sessionId: string,
  payload: {
    sessionRating: number;
    campaignRating: number;
    comment?: string | null;
  }
): Promise<FeedbackResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const sessionRating = Math.floor(payload.sessionRating);
    const campaignRating = Math.floor(payload.campaignRating);
    if (sessionRating < 1 || sessionRating > 5 || campaignRating < 1 || campaignRating > 5) {
      return { success: false, error: "Le valutazioni devono essere da 1 a 5." };
    }

    const { data: sessionRow, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, campaign_id, status")
      .eq("id", sessionId)
      .single();
    if (sessionErr || !sessionRow) {
      return { success: false, error: "Sessione non trovata." };
    }
    if (sessionRow.campaign_id !== campaignId || sessionRow.status !== "completed") {
      return { success: false, error: "Feedback non disponibile per questa sessione." };
    }

    const { data: attended, error: attendedErr } = await supabase
      .from("session_signups")
      .select("id")
      .eq("session_id", sessionId)
      .eq("player_id", user.id)
      .eq("status", "attended")
      .maybeSingle();
    if (attendedErr || !attended) {
      return { success: false, error: "Puoi lasciare feedback solo sulle sessioni a cui hai partecipato." };
    }

    const comment = payload.comment?.trim() || null;
    const { error: upsertErr } = await supabase.from("session_feedback").upsert(
      {
        session_id: sessionId,
        campaign_id: campaignId,
        player_id: user.id,
        session_rating: sessionRating,
        campaign_rating: campaignRating,
        comment,
      },
      { onConflict: "session_id,player_id" }
    );
    if (upsertErr) {
      console.error("[submitSessionFeedback]", upsertErr);
      return { success: false, error: upsertErr.message ?? "Errore durante il salvataggio feedback." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/admin/feedback-statistics");
    return { success: true, message: "Feedback salvato. Grazie!" };
  } catch (err) {
    console.error("[submitSessionFeedback]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

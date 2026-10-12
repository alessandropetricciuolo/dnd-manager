import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  sessionXpDraftSchema,
  type SessionXpDraft,
  type SessionXpDraftRead,
} from "./session-xp-draft";

export async function readSessionXpDraft(
  actorId: string,
  sessionId: string,
): Promise<SessionXpDraftRead> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("sessions")
    .select(
      "campaign_id,status,is_pre_closed,pre_closed_xp_gained,pre_closed_xp_awards,xp_draft_state,xp_draft_revision" as never,
    )
    .eq("id", sessionId)
    .single();
  if (error || !data) throw new Error("Sessione non trovata.");
  const row = data as unknown as {
    campaign_id: string;
    status: string;
    is_pre_closed: boolean;
    pre_closed_xp_gained: number | null;
    pre_closed_xp_awards: { playerId: string; xp: number }[] | null;
    xp_draft_state: SessionXpDraft | null;
    xp_draft_revision: number;
  };
  const { data: allowed } = await admin.rpc(
    "session_actor_can_manage" as never,
    { p_actor_id: actorId, p_campaign_id: row.campaign_id } as never,
  );
  if (!allowed) throw new Error("Non puoi gestire questa sessione.");
  const draft =
    row.xp_draft_state ??
    (row.is_pre_closed
      ? {
          attendance: {},
          xpGained: row.pre_closed_xp_gained ?? 0,
          perPlayerXpAwards: row.pre_closed_xp_awards ?? [],
        }
      : null);
  return { draft, revision: row.xp_draft_revision, status: row.status };
}

export async function writeSessionXpDraft(
  actorId: string,
  sessionId: string,
  raw: unknown,
  expectedRevision?: number,
) {
  const draft = sessionXpDraftSchema.parse(raw);
  if (JSON.stringify(draft).length > 1_000_000)
    throw new Error("Bozza troppo grande.");
  if (
    expectedRevision != null &&
    (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
  )
    throw new Error("Revisione non valida.");
  const admin = createSupabaseAdminClient();
  if (!draft.snapshot) {
    const existing = await readSessionXpDraft(actorId, sessionId);
    if (existing.draft?.snapshot) {
      const snapshot = existing.draft.snapshot;
      const { data: session } = await admin
        .from("sessions")
        .select("campaign_id")
        .eq("id", sessionId)
        .single();
      if (!session) throw new Error("Sessione non trovata.");
      const { data: characters, error: characterError } = await admin
        .from("campaign_characters")
        .select("id,assigned_to")
        .eq(
          "campaign_id",
          (session as unknown as { campaign_id: string }).campaign_id,
        );
      if (characterError) throw new Error("Personaggi non leggibili.");
      const xp = snapshot.xp as {
        version: 2;
        extraXpManual: number;
        bankedMonsterXp: number;
        perCharacter: Record<string, unknown>;
      };
      const perCharacter = { ...xp?.perCharacter };
      for (const character of (characters ?? []) as unknown as {
        id: string;
        assigned_to: string | null;
      }[]) {
        if (
          !character.assigned_to ||
          !(character.assigned_to in draft.attendance)
        )
          continue;
        const award = draft.perPlayerXpAwards.find(
          (a) => a.playerId === character.assigned_to,
        );
        perCharacter[character.id] = {
          plus: 0,
          minus: 0,
          customXp: award?.xp ?? draft.xpGained,
        };
      }
      draft.snapshot = {
        ...snapshot,
        attendance: draft.attendance,
        xp: { ...xp, perCharacter },
      };
    }
  }
  const { data, error } = await admin.rpc(
    "save_session_xp_draft" as never,
    {
      p_session_id: sessionId,
      p_actor_id: actorId,
      p_draft: draft,
      p_expected_revision: expectedRevision ?? null,
    } as never,
  );
  if (error)
    throw new Error(
      error.message.includes("xp_draft_conflict")
        ? "La bozza è cambiata su un altro dispositivo. Ricaricala prima di salvare."
        : error.message,
    );
  return { revision: Number(data) };
}

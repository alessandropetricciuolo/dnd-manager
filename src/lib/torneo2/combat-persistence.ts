import { sanitizeTorneo2CombatState, type Torneo2CombatState } from "@/lib/torneo2/combat-state";

type SupabaseLike = {
  from: (table: "torneo2_matches") => unknown;
};

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  update: (patch: Record<string, unknown>) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
};

export type PersistTorneo2CombatResult =
  | { ok: true; seq: number; updatedAt: string }
  | { ok: false; code: "not_found" | "conflict" | "db_error"; error: string };

const MAX_COMBAT_SEQ_ATTEMPTS = 5;

function asQueryBuilder(query: unknown): QueryBuilder {
  return query as QueryBuilder;
}

/**
 * Persists a full combat snapshot with an optimistic compare-and-swap on combat_seq.
 * This prevents concurrent GM/remote saves from emitting the same sequence number,
 * which would make clients drop the later realtime update as stale.
 */
export async function persistTorneo2CombatStateWithNextSeq(
  supabase: SupabaseLike,
  {
    campaignId,
    matchId,
    state,
    originId,
    maxAttempts = MAX_COMBAT_SEQ_ATTEMPTS,
  }: {
    campaignId: string;
    matchId: string;
    state: Torneo2CombatState | unknown;
    originId: string | null;
    maxAttempts?: number;
  }
): Promise<PersistTorneo2CombatResult> {
  const clean = sanitizeTorneo2CombatState(state);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data: current, error: readError } = await asQueryBuilder(supabase.from("torneo2_matches"))
      .select("combat_seq")
      .eq("id", matchId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (readError) {
      return { ok: false, code: "db_error", error: readError.message ?? "Errore lettura stato combattimento." };
    }
    if (!current) {
      return { ok: false, code: "not_found", error: "Incontro non trovato." };
    }

    const currentSeq = Number(current.combat_seq ?? 0) || 0;
    const nextSeq = currentSeq + 1;
    const updatedAt = new Date().toISOString();

    const { data: updated, error: updateError } = await asQueryBuilder(supabase.from("torneo2_matches"))
      .update({
        combat_state: clean as unknown as Record<string, unknown>,
        combat_seq: nextSeq,
        combat_origin: originId,
        combat_updated_at: updatedAt,
      })
      .eq("id", matchId)
      .eq("campaign_id", campaignId)
      .eq("combat_seq", currentSeq)
      .select("combat_seq, combat_updated_at")
      .maybeSingle();

    if (updateError) {
      return { ok: false, code: "db_error", error: updateError.message ?? "Errore salvataggio stato combattimento." };
    }

    if (updated) {
      return {
        ok: true,
        seq: Number(updated.combat_seq ?? nextSeq) || nextSeq,
        updatedAt: typeof updated.combat_updated_at === "string" ? updated.combat_updated_at : updatedAt,
      };
    }
  }

  return {
    ok: false,
    code: "conflict",
    error: "Stato combattimento modificato contemporaneamente. Riprova.",
  };
}

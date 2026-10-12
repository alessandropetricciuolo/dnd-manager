"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  readSessionXpDraft,
  writeSessionXpDraft,
} from "@/lib/gm/session-xp-draft-server";
import type { SessionXpDraft } from "@/lib/gm/session-xp-draft";
async function actor() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Devi essere autenticato.");
  return user.id;
}
export async function getSessionXpDraftAction(sessionId: string) {
  try {
    return {
      success: true as const,
      data: await readSessionXpDraft(await actor(), sessionId),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Bozza non leggibile.",
    };
  }
}
export async function saveSessionXpDraftAction(
  sessionId: string,
  draft: SessionXpDraft,
  expectedRevision?: number,
) {
  try {
    return {
      success: true as const,
      data: await writeSessionXpDraft(
        await actor(),
        sessionId,
        draft,
        expectedRevision,
      ),
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Bozza non salvata.",
    };
  }
}

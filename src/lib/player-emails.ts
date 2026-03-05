import { createSupabaseAdminClient } from "@/utils/supabase/admin";

/**
 * Restituisce le email di tutti gli utenti con ruolo 'player'.
 * Usa Service Role; chiamare solo da Server Actions.
 */
export async function getPlayerEmails(): Promise<string[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "player");
    const playerIds = new Set((profiles ?? []).map((p) => p.id));
    if (playerIds.size === 0) return [];

    const emails: string[] = [];
    let page = 1;
    const perPage = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage });
      const users = data?.users ?? [];
      for (const u of users) {
        if (playerIds.has(u.id) && u.email) emails.push(u.email);
      }
      hasMore = users.length === perPage;
      page += 1;
    }
    return emails;
  } catch (err) {
    console.error("[getPlayerEmails]", err);
    return [];
  }
}

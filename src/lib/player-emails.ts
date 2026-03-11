import { createSupabaseAdminClient } from "@/utils/supabase/admin";

/**
 * Restituisce le email di tutti gli utenti con ruolo 'player' che NON hanno bloccato gli avvisi (notifications_disabled = false).
 * Usa Service Role; chiamare solo da Server Actions.
 */
export async function getPlayerEmails(): Promise<string[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "player")
      .eq("notifications_disabled", false);
    type ProfileRow = { id: string };
    const list = (profiles ?? []) as ProfileRow[];
    const playerIds = new Set(list.map((p) => p.id));
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

/**
 * Restituisce true se l'utente ha disabilitato gli avvisi email. Usa Service Role.
 */
export async function hasNotificationsDisabled(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("notifications_disabled")
      .eq("id", userId)
      .single();
    return (data as { notifications_disabled?: boolean } | null)?.notifications_disabled === true;
  } catch (err) {
    console.error("[hasNotificationsDisabled]", err);
    return false;
  }
}

import { createSupabaseAdminClient } from "@/utils/supabase/admin";

const NOTIFICATIONS_PAUSED_KEY = "notifications_paused";

/**
 * Restituisce true se gli avvisi automatici sono sospesi globalmente (es. inserimento massivo).
 * Usa Service Role; chiamare solo da Server Actions.
 */
export async function getNotificationsPaused(): Promise<boolean> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", NOTIFICATIONS_PAUSED_KEY)
      .single();
    const value = (data as { value?: unknown } | null)?.value;
    return value === true || value === "true";
  } catch (err) {
    console.error("[getNotificationsPaused]", err);
    return false;
  }
}

/**
 * Restituisce le email di tutti gli utenti con ruolo 'player' che NON hanno bloccato gli avvisi (notifications_disabled = false).
 * Restituisce [] se gli avvisi sono sospesi globalmente. Usa Service Role; chiamare solo da Server Actions.
 */
export async function getPlayerEmails(): Promise<string[]> {
  try {
    if (await getNotificationsPaused()) return [];
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

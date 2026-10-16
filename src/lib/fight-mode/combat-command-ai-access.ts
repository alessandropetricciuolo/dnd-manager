export type CombatCommandAiAuthContext = {
  user: { id: string } | null;
  profile: { role?: string | null } | null;
};

/** Campaign-scoped GM check; only a global admin bypasses campaign ownership. */
export async function authorizeCombatCommandAi(
  campaignId: string | undefined,
  getAuthContext: () => Promise<CombatCommandAiAuthContext>,
  getCampaignGmId: (campaignId: string) => Promise<string | null>
): Promise<{ authorized: true } | { authorized: false; error: string }> {
  try {
    const { user, profile } = await getAuthContext();
    if (!user) return { authorized: false, error: "Non autorizzato: autenticazione richiesta." };
    if (profile?.role === "admin") return { authorized: true };
    if (profile?.role !== "gm" || !campaignId) {
      return { authorized: false, error: "Non autorizzato: ruolo GM globale e campagna assegnata richiesti." };
    }
    if (await getCampaignGmId(campaignId) !== user.id) {
      return { authorized: false, error: "Non autorizzato: solo il Game Master della campagna può interpretare comandi tattici." };
    }
    return { authorized: true };
  } catch (error) {
    console.warn("[combat-command-ai-actions] Auth check failed:", error);
    return { authorized: false, error: "Non autorizzato: impossibile verificare l'accesso alla campagna." };
  }
}

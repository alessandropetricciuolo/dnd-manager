import { createSupabaseServerClient } from "@/utils/supabase/server";

export type AdminContentRole = "admin" | "gm" | "player";

type AuthUser = { id: string };
type ClientError = { message?: string } | null;

export type AdminContentAccessClient = {
  auth: {
    getUser(): Promise<{
      data: { user: AuthUser | null };
      error: ClientError;
    }>;
  };
  from(relation: "profiles"): {
    select(columns: "role"): {
      eq(column: "id", value: string): {
        maybeSingle(): Promise<{
          data: { role: string | null } | null;
          error: ClientError;
        }>;
      };
    };
  };
};

const adminScopeBrand: unique symbol = Symbol("verified-admin-content-scope");
const verifiedAdminScopes = new WeakSet<object>();
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminContentScope = {
  readonly actorId: string | null;
  readonly actorKind: "admin" | "non_admin" | "anonymous" | "privileged_non_admin";
  readonly [adminScopeBrand]: true;
};

export type AdminContentActor =
  | { kind: "authenticated"; userId: string; role: AdminContentRole }
  | { kind: "anonymous"; userId: null; role: null }
  | { kind: "privileged_non_admin"; userId: null; role: null };

export type AdminContentAccess = {
  actor: AdminContentActor;
  scope: AdminContentScope;
};

export type AdminContentAccessFailure = {
  ok: false;
  reason: "auth_error" | "profile_error" | "invalid_role";
};

export type AdminContentAccessResult =
  | { ok: true; access: AdminContentAccess }
  | AdminContentAccessFailure;

function createScope(
  actorId: string | null,
  actorKind: AdminContentScope["actorKind"],
  verifiedAdmin: boolean
): AdminContentScope {
  const scope = Object.freeze({
    actorId,
    actorKind,
    [adminScopeBrand]: true as const,
  });
  if (verifiedAdmin) verifiedAdminScopes.add(scope);
  return scope;
}

function isKnownRole(role: string | null): role is AdminContentRole {
  return role === "admin" || role === "gm" || role === "player";
}

/**
 * Resolves identity from Supabase Auth and the server-managed profiles.role.
 * User metadata and caller-provided role/include flags are intentionally absent.
 */
export async function resolveAdminContentAccess(
  client?: AdminContentAccessClient
): Promise<AdminContentAccessResult> {
  try {
    const trustedClient: AdminContentAccessClient =
      client ??
      ((await createSupabaseServerClient()) as unknown as AdminContentAccessClient);
    const auth = await trustedClient.auth.getUser();
    if (auth.error) return { ok: false, reason: "auth_error" };

    const user = auth.data.user;
    if (!user) {
      return {
        ok: true,
        access: {
          actor: { kind: "anonymous", userId: null, role: null },
          scope: createScope(null, "anonymous", false),
        },
      };
    }

    const profileResult = await trustedClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error || !profileResult.data) {
      return { ok: false, reason: "profile_error" };
    }

    const role = profileResult.data.role;
    if (!isKnownRole(role)) return { ok: false, reason: "invalid_role" };

    const isAdmin = role === "admin";
    return {
      ok: true,
      access: {
        actor: { kind: "authenticated", userId: user.id, role },
        scope: createScope(user.id, isAdmin ? "admin" : "non_admin", isAdmin),
      },
    };
  } catch {
    return { ok: false, reason: "auth_error" };
  }
}

/** Default scope for service-role/background reads without a verified Admin actor. */
export function createPrivilegedNonAdminContentAccess(): AdminContentAccess {
  return {
    actor: { kind: "privileged_non_admin", userId: null, role: null },
    scope: createScope(null, "privileged_non_admin", false),
  };
}

export function isGlobalAdmin(access: AdminContentAccess): boolean {
  return (
    access.actor.kind === "authenticated" &&
    access.actor.role === "admin" &&
    verifiedAdminScopes.has(access.scope)
  );
}

export function canReadAdminContent(access: AdminContentAccess): boolean {
  return isGlobalAdmin(access);
}

export class AdminContentAccessError extends Error {
  constructor(
    public readonly code:
      | "admin_required"
      | "invalid_campaign"
      | "campaign_lookup_failed"
      | "feature_disabled"
  ) {
    super(code);
    this.name = "AdminContentAccessError";
  }
}

export type CampaignFlagClient = {
  from(relation: "campaigns"): {
    select(columns: "admin_drafts_enabled"): {
      eq(column: "id", value: string): {
        maybeSingle(): Promise<{
          data: { admin_drafts_enabled: boolean } | null;
          error: ClientError;
        }>;
      };
    };
  };
};

/** Verifies both the trusted Admin actor and the server-read campaign flag. */
export async function assertCanManageAdminContent(
  access: AdminContentAccess,
  campaignId: string,
  client: CampaignFlagClient
): Promise<void> {
  if (!isGlobalAdmin(access)) throw new AdminContentAccessError("admin_required");

  const normalizedCampaignId = campaignId.trim();
  if (!UUID_PATTERN.test(normalizedCampaignId)) {
    throw new AdminContentAccessError("invalid_campaign");
  }

  try {
    const result = await client
      .from("campaigns")
      .select("admin_drafts_enabled")
      .eq("id", normalizedCampaignId)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new AdminContentAccessError("campaign_lookup_failed");
    }
    if (result.data.admin_drafts_enabled !== true) {
      throw new AdminContentAccessError("feature_disabled");
    }
  } catch (error) {
    if (error instanceof AdminContentAccessError) throw error;
    throw new AdminContentAccessError("campaign_lookup_failed");
  }
}

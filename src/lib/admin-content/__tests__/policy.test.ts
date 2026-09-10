import test from "node:test";
import assert from "node:assert/strict";

import {
  AdminContentAccessError,
  adminOnlyPredicate,
  applyAdminContentScope,
  assertCanManageAdminContent,
  canReadAdminContent,
  createPrivilegedNonAdminContentAccess,
  isGlobalAdmin,
  logAdminContentTransition,
  resolveAdminContentAccess,
  type AdminContentAccess,
  type AdminContentAccessClient,
  type CampaignFlagClient,
} from "..";

const ADMIN_ID = "10000000-0000-4000-8000-000000000001";
const GM_ID = "20000000-0000-4000-8000-000000000002";
const PLAYER_ID = "30000000-0000-4000-8000-000000000003";
const CAMPAIGN_ID = "40000000-0000-4000-8000-000000000004";
const WIKI_ID = "50000000-0000-4000-8000-000000000005";

type AccessFixture = {
  userId?: string | null;
  role?: string | null;
  authError?: boolean;
  profileError?: boolean;
  throwAuth?: boolean;
};

function accessClient(fixture: AccessFixture): AdminContentAccessClient {
  return {
    auth: {
      async getUser() {
        if (fixture.throwAuth) throw new Error("transport");
        return {
          data: { user: fixture.userId ? { id: fixture.userId } : null },
          error: fixture.authError ? { message: "auth" } : null,
        };
      },
    },
    from(relation) {
      assert.equal(relation, "profiles");
      return {
        select(columns) {
          assert.equal(columns, "role");
          return {
            eq(column, value) {
              assert.equal(column, "id");
              assert.equal(value, fixture.userId);
              return {
                async maybeSingle() {
                  return {
                    data: fixture.profileError ? null : { role: fixture.role ?? null },
                    error: fixture.profileError ? { message: "profile" } : null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

async function requireAccess(fixture: AccessFixture): Promise<AdminContentAccess> {
  const result = await resolveAdminContentAccess(accessClient(fixture));
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("access fixture unexpectedly denied");
  return result.access;
}

function campaignFlagClient(
  enabled: boolean | null,
  options: { error?: boolean; throws?: boolean } = {}
): CampaignFlagClient {
  return {
    from(relation) {
      assert.equal(relation, "campaigns");
      return {
        select(columns) {
          assert.equal(columns, "admin_drafts_enabled");
          return {
            eq(column, value) {
              assert.equal(column, "id");
              assert.equal(value, CAMPAIGN_ID);
              return {
                async maybeSingle() {
                  if (options.throws) throw new Error("schema missing");
                  return {
                    data: enabled === null ? null : { admin_drafts_enabled: enabled },
                    error: options.error ? { message: "lookup" } : null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

async function rejectsWithCode(
  operation: Promise<unknown>,
  code: AdminContentAccessError["code"]
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    return error instanceof AdminContentAccessError && error.code === code;
  });
}

test("verified Admin alone receives an Admin-capable scope", async () => {
  const admin = await requireAccess({ userId: ADMIN_ID, role: "admin" });
  assert.equal(isGlobalAdmin(admin), true);
  assert.equal(canReadAdminContent(admin), true);
  assert.equal(adminOnlyPredicate(admin), null);
});

for (const role of ["gm", "player"] as const) {
  test(`${role} receives a mandatory admin_only=false predicate`, async () => {
    const access = await requireAccess({ userId: role === "gm" ? GM_ID : PLAYER_ID, role });
    assert.equal(isGlobalAdmin(access), false);
    assert.deepEqual(adminOnlyPredicate(access), { column: "admin_only", value: false });
  });
}

test("anonymous reads receive a mandatory admin_only=false predicate", async () => {
  const access = await requireAccess({ userId: null });
  assert.equal(access.actor.kind, "anonymous");
  assert.deepEqual(adminOnlyPredicate(access), { column: "admin_only", value: false });
});

test("privileged clients default to non-Admin scope", () => {
  const access = createPrivilegedNonAdminContentAccess();
  assert.equal(isGlobalAdmin(access), false);
  assert.deepEqual(adminOnlyPredicate(access), { column: "admin_only", value: false });
});

test("a fabricated client boolean/object cannot create Admin scope", () => {
  const forged = {
    actor: { kind: "authenticated", userId: ADMIN_ID, role: "admin" },
    scope: { actorId: ADMIN_ID, actorKind: "admin", includeAdminOnly: true },
  } as unknown as AdminContentAccess;
  assert.equal(canReadAdminContent(forged), false);
  assert.deepEqual(adminOnlyPredicate(forged), { column: "admin_only", value: false });
});

test("query adapter filters non-Admin and leaves verified Admin query unchanged", async () => {
  const calls: Array<[string, boolean]> = [];
  const query = {
    eq(column: "admin_only", value: false) {
      calls.push([column, value]);
      return this;
    },
  };
  const gm = await requireAccess({ userId: GM_ID, role: "gm" });
  const admin = await requireAccess({ userId: ADMIN_ID, role: "admin" });
  applyAdminContentScope(query, gm);
  applyAdminContentScope(query, admin);
  assert.deepEqual(calls, [["admin_only", false]]);
});

test("auth, profile, unknown-role and thrown errors fail closed", async () => {
  for (const fixture of [
    { authError: true },
    { throwAuth: true },
    { userId: "u1", profileError: true },
    { userId: "u1", role: "owner" },
  ]) {
    const result = await resolveAdminContentAccess(accessClient(fixture));
    assert.equal(result.ok, false);
  }
});

test("management requires verified Admin and server-read enabled flag", async () => {
  const admin = await requireAccess({ userId: ADMIN_ID, role: "admin" });
  const gm = await requireAccess({ userId: GM_ID, role: "gm" });

  await assert.doesNotReject(
    assertCanManageAdminContent(admin, CAMPAIGN_ID, campaignFlagClient(true))
  );
  await rejectsWithCode(
    assertCanManageAdminContent(gm, CAMPAIGN_ID, campaignFlagClient(true)),
    "admin_required"
  );
  await rejectsWithCode(
    assertCanManageAdminContent(admin, CAMPAIGN_ID, campaignFlagClient(false)),
    "feature_disabled"
  );
});

test("missing campaign, schema error and invalid id fail closed", async () => {
  const admin = await requireAccess({ userId: ADMIN_ID, role: "admin" });
  await rejectsWithCode(
    assertCanManageAdminContent(admin, CAMPAIGN_ID, campaignFlagClient(null)),
    "campaign_lookup_failed"
  );
  await rejectsWithCode(
    assertCanManageAdminContent(
      admin,
      CAMPAIGN_ID,
      campaignFlagClient(null, { throws: true })
    ),
    "campaign_lookup_failed"
  );
  await rejectsWithCode(
    assertCanManageAdminContent(admin, " ", campaignFlagClient(true)),
    "invalid_campaign"
  );
});

test("transition audit logs only whitelisted identifiers and rejects non-Admin", async () => {
  const admin = await requireAccess({ userId: ADMIN_ID, role: "admin" });
  const gm = await requireAccess({ userId: GM_ID, role: "gm" });
  const events: Array<{ event: string; fields: Record<string, string> }> = [];
  const logger = { info: (event: string, fields: Record<string, string>) => events.push({ event, fields }) };

  logAdminContentTransition(
    {
      action: "protect",
      access: admin,
      campaignId: CAMPAIGN_ID,
      entityType: "wiki",
      entityId: WIKI_ID,
    },
    logger
  );

  assert.deepEqual(events, [
    {
      event: "admin_content_access_transition",
      fields: {
        action: "protect",
        actorId: ADMIN_ID,
        campaignId: CAMPAIGN_ID,
        entityType: "wiki",
        entityId: WIKI_ID,
      },
    },
  ]);
  assert.throws(() =>
    logAdminContentTransition(
      {
        action: "release",
        access: gm,
        campaignId: CAMPAIGN_ID,
        entityType: "map",
        entityId: WIKI_ID,
      },
      logger
    )
  );
  assert.throws(
    () =>
      logAdminContentTransition(
        {
          action: "protect",
          access: admin,
          campaignId: "secret prose must not enter logs",
          entityType: "wiki",
          entityId: WIKI_ID,
        },
        logger
      ),
    /admin_content_audit_invalid_identifier/
  );
});

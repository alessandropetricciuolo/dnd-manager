import assert from "node:assert/strict";
import test from "node:test";
import { handleAccountDeletionRequest } from "../account-deletion-request";

test("rejects missing or invalid bearer credentials before inserting a request", async () => {
  let inserts = 0;
  const dependencies = {
    authenticate: async () => ({ userId: null }),
    createRequest: async () => { inserts += 1; return {}; },
  };

  const missing = await handleAccountDeletionRequest({ headers: { get: () => null } }, dependencies);
  const invalid = await handleAccountDeletionRequest({ headers: { get: () => "Bearer invalid" } }, dependencies);
  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal(inserts, 0);
});

test("takes the deletion target from the verified bearer identity, never request data", async () => {
  const insertedUsers: string[] = [];
  const request = {
    headers: { get: () => "Bearer valid-token" },
    json: async () => ({ user_id: "spoofed-user" }),
  };
  const result = await handleAccountDeletionRequest(request, {
    authenticate: async (token) => {
      assert.equal(token, "valid-token");
      return { userId: "verified-user" };
    },
    createRequest: async (userId) => { insertedUsers.push(userId); return {}; },
  });

  assert.equal(result.status, 202);
  assert.deepEqual(insertedUsers, ["verified-user"]);
});

test("treats an existing pending request as an idempotent success", async () => {
  const result = await handleAccountDeletionRequest({ headers: { get: () => "Bearer valid-token" } }, {
    authenticate: async () => ({ userId: "verified-user" }),
    createRequest: async () => ({ error: { code: "23505" } }),
  });
  assert.equal(result.status, 202);
});

test("reports a service failure when request persistence fails", async () => {
  const result = await handleAccountDeletionRequest({ headers: { get: () => "Bearer valid-token" } }, {
    authenticate: async () => ({ userId: "verified-user" }),
    createRequest: async () => ({ error: { code: "XX000" } }),
  });
  assert.equal(result.status, 503);
});

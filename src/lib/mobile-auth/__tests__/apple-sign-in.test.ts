import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import {
  exchangeAppleAuthorizationCode, readAppleIdentityClaims, revokeAppleAuthorization, validateAndEncryptAppleWebToken,
} from "../../apple-sign-in";
import { POST } from "@/app/api/mobile/apple-sign-in/route";

test("Apple token exchange uses the native client and retains only an encrypted token for revocation", async (t) => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const config = {
    APPLE_SIGNIN_TEAM_ID: "TESTTEAM",
    APPLE_SIGNIN_KEY_ID: "TESTKEY",
    APPLE_SIGNIN_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    APPLE_SIGNIN_TOKEN_KEY: Buffer.alloc(32, 2).toString("base64url"),
  };
  for (const [key, value] of Object.entries(config)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  const payload = Buffer.from(JSON.stringify({
    iss: "https://appleid.apple.com", aud: "com.barberanddragons.mobile",
    sub: "apple-user", email: "relay@example.test", email_verified: "true",
  })).toString("base64url");
  const token = `header.${payload}.signature`;
  assert.equal(readAppleIdentityClaims("invalid"), null);
  const appleFetch = t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    const body = options.body;
    assert.ok(body instanceof URLSearchParams);
    assert.equal(body.get("client_id"), "com.barberanddragons.mobile");
    const [header, claims, signature] = body.get("client_secret")!.split(".");
    assert.equal(verify("sha256", Buffer.from(`${header}.${claims}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(signature, "base64url")), true);
    if (url === "https://appleid.apple.com/auth/token") {
      assert.equal(body.get("code"), "test-code");
      assert.equal(body.get("grant_type"), "authorization_code");
      return Response.json({ id_token: token, refresh_token: "test-apple-refresh" });
    }
    assert.equal(url, "https://appleid.apple.com/auth/revoke");
    assert.equal(body.get("token_type_hint"), "refresh_token");
    assert.equal(body.get("token"), "test-apple-refresh");
    return new Response(null, { status: 200 });
  });

  const result = await exchangeAppleAuthorizationCode("test-code");
  assert.ok(result);
  assert.equal(result.subject, "apple-user");
  assert.equal(result.verifiedEmail, "relay@example.test");
  assert.ok(!result.encryptedRefreshToken.includes("test-apple-refresh"));
  assert.equal(await revokeAppleAuthorization(result.encryptedRefreshToken), true);
  assert.equal(appleFetch.mock.callCount(), 2);
});

test("the mobile Apple route links only the authenticated account and saves the token server-side", async (t) => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const previousEnv = process.env;
  process.env = {
    ...previousEnv,
    NEXT_PUBLIC_SUPABASE_URL: "https://apple-test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    APPLE_SIGNIN_TEAM_ID: "TESTTEAM",
    APPLE_SIGNIN_KEY_ID: "TESTKEY",
    APPLE_SIGNIN_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    APPLE_SIGNIN_TOKEN_KEY: Buffer.alloc(32, 2).toString("base64url"),
  };
  t.after(() => { process.env = previousEnv; });

  const actorId = "11111111-1111-4111-8111-111111111111";
  const token = (subject: string) => `header.${Buffer.from(JSON.stringify({
    iss: "https://appleid.apple.com", aud: "com.barberanddragons.mobile", sub: subject,
  })).toString("base64url")}.signature`;
  const user = { id: actorId, identities: [] };
  const linkedUser = { ...user, identities: [{ provider: "apple", identity_data: { sub: "apple-user" } }] };
  const calls: string[] = [];

  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, options?: RequestInit) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    calls.push(url.pathname);
    const headers = new Headers(options?.headers);
    switch (url.pathname) {
      case "/auth/v1/user":
        assert.equal(headers.get("Authorization"), "Bearer actor-token");
        return Response.json(user);
      case "/auth/token":
        return Response.json({ id_token: token("apple-user"), refresh_token: "apple-refresh-token" });
      case "/auth/v1/token":
        assert.equal(headers.get("Authorization"), "Bearer actor-token");
        assert.deepEqual(JSON.parse(String(options?.body)), {
          provider: "apple", id_token: token("apple-user"), nonce: "native-nonce", link_identity: true,
          gotrue_meta_security: {},
        });
        return Response.json({ user: linkedUser, access_token: "new-token", refresh_token: "new-refresh", expires_in: 3600 });
      case "/rest/v1/apple_sign_in_tokens": {
        assert.equal(headers.get("Authorization"), "Bearer test-service-role");
        const tokenRow = JSON.parse(String(options?.body));
        assert.equal(tokenRow.user_id, actorId);
        assert.ok(!tokenRow.encrypted_refresh_token.includes("apple-refresh-token"));
        return new Response(null, { status: 201 });
      }
      default:
        assert.fail(`Unexpected request to ${url.pathname}`);
    }
  });

  const link = (subject: string) => POST(new Request("https://example.test/api/mobile/apple-sign-in", {
    method: "POST",
    headers: { Authorization: "Bearer actor-token" },
    body: JSON.stringify({ code: "native-code", identityToken: token(subject), nonce: "native-nonce" }),
  }));
  assert.equal((await link("different-user")).status, 400);
  assert.deepEqual(calls.splice(0), ["/auth/v1/user", "/auth/token"]);
  const response = await link("apple-user");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { session: { access_token: "new-token", refresh_token: "new-refresh" } });
  assert.deepEqual(calls, ["/auth/v1/user", "/auth/token", "/auth/v1/token", "/rest/v1/apple_sign_in_tokens"]);
});

test("web Apple refresh tokens must match the linked subject and are revoked with the Services ID", async (t) => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const originalEnv = process.env;
  const client = "com.barberanddragons.web.test";
  process.env = {
    ...originalEnv,
    APPLE_SIGNIN_TEAM_ID: "TESTTEAM",
    APPLE_SIGNIN_KEY_ID: "TESTKEY",
    APPLE_SIGNIN_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    APPLE_SIGNIN_TOKEN_KEY: Buffer.alloc(32, 2).toString("base64url"),
    APPLE_SIGNIN_WEB_CLIENT_ID: client,
  };
  t.after(() => { process.env = originalEnv; });

  const claims = Buffer.from(JSON.stringify({
    iss: "https://appleid.apple.com", aud: client, sub: "linked-subject",
  })).toString("base64url");
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.ok(options.body instanceof URLSearchParams);
    const body = options.body;
    assert.equal(body.get("client_id"), client);
    const encoded = body.get("client_secret")!.split(".")[1];
    assert.equal(JSON.parse(Buffer.from(encoded, "base64url").toString()).sub, client);
    if (url.endsWith("/token")) {
      assert.equal(body.get("grant_type"), "refresh_token");
      assert.equal(body.get("refresh_token"), "web-refresh");
      return Response.json({ id_token: `header.${claims}.signature` });
    }
    assert.equal(url, "https://appleid.apple.com/auth/revoke");
    assert.equal(body.get("token"), "web-refresh");
    return new Response(null, { status: 200 });
  });

  assert.equal(await validateAndEncryptAppleWebToken("web-refresh", ["wrong-subject"]), null);
  const encrypted = await validateAndEncryptAppleWebToken("web-refresh", ["linked-subject"]);
  assert.ok(encrypted && !encrypted.includes("web-refresh"));
  assert.equal(await revokeAppleAuthorization(encrypted, true), true);
});

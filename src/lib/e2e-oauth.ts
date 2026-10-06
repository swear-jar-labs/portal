import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// The fake OAuth2 identity provider behind the seeded e2e run (see
// tasks/backend-e2e-auth): real Better Auth handshakes (state cookie,
// callback, verification, account, session) against loopback endpoints, so no
// traffic ever leaves the test machine. Server-only (node:crypto) — imported
// only by the e2e route handlers under src/app/api/e2e/, never by client
// components.

// The run marker, read here directly: src/app routes must not import
// @/shared/* (routing reaches shared code through feature facades), so this
// module owns its own gate instead of reusing isSeededE2e() — same flag,
// same value, one line each.
const SEEDED_E2E_ENV_VAR = "SWEARJAR_E2E";
const SEEDED_E2E_VALUE = "1";

export function isE2eOAuthEnabled(): boolean {
  return process.env[SEEDED_E2E_ENV_VAR] === SEEDED_E2E_VALUE;
}

// The provider ids match the real ones, so the SSO buttons, their texts and
// the social specs exercise the same UI. Each fake provider always vouches
// for one seeded fixture account (handle from the process roster, email by
// the convention below): the first handshake links the provider to the
// seeded password account through the verified mailbox, later ones sign
// straight into it.
const E2E_FAKE_OAUTH_HANDLES = {
  google: "ada",
  github: "grace",
} as const;

export type E2eFakeOAuthProvider = keyof typeof E2E_FAKE_OAUTH_HANDLES;

export function isE2eFakeOAuthProvider(provider: string): provider is E2eFakeOAuthProvider {
  return provider in E2E_FAKE_OAUTH_HANDLES;
}

// Mailbox convention shared by the seed, the logon helper and the fake IdP:
// every e2e account owns <handle>@example.com, so password and OAuth sign-ins
// land on the same row.
const E2E_ACCOUNT_EMAIL_DOMAIN = "example.com";

export function e2eAccountEmail(handle: string): string {
  return `${handle}@${E2E_ACCOUNT_EMAIL_DOMAIN}`;
}

// A code is a self-contained HMAC-signed claim (no shared state between the
// authorize, token and userinfo routes, so parallel workers cannot collide):
// base64url(payload).base64url(signature) over { provider, nonce, expiry }.
const E2E_OAUTH_CODE_TTL_MS = 10 * 60 * 1000;

type E2eOAuthCodePayload = {
  provider: E2eFakeOAuthProvider;
  nonce: string;
  expiresAt: number;
};

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function mintE2eOAuthCode(
  provider: E2eFakeOAuthProvider,
  secret: string,
  now: number = Date.now(),
): string {
  const payload: E2eOAuthCodePayload = {
    provider,
    nonce: randomBytes(16).toString("hex"),
    expiresAt: now + E2E_OAUTH_CODE_TTL_MS,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${signPayload(encoded, secret)}`;
}

export function readE2eOAuthCode(
  code: string,
  secret: string,
  now: number = Date.now(),
): E2eFakeOAuthProvider | null {
  const [encoded, signature] = code.split(".");
  if (!encoded || !signature) return null;
  const expected = signPayload(encoded, secret);
  const received = Buffer.from(signature, "base64url");
  const computed = Buffer.from(expected, "base64url");
  if (received.length !== computed.length || !timingSafeEqual(received, computed)) return null;
  let payload: E2eOAuthCodePayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as E2eOAuthCodePayload;
  } catch {
    return null;
  }
  if (!isE2eFakeOAuthProvider(payload.provider) || payload.expiresAt <= now) return null;
  return payload.provider;
}

// The OIDC-shaped profile the userinfo endpoint serves: the generic-OAuth
// mapping reads snake_case claims (email_verified, picture), the account key
// resolves from the stable subject.
export function e2eOAuthProfile(provider: E2eFakeOAuthProvider): {
  id: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: null;
} {
  const handle = E2E_FAKE_OAUTH_HANDLES[provider];
  return {
    id: `e2e-${provider}`,
    sub: `e2e-${provider}`,
    email: e2eAccountEmail(handle),
    // Loopback-only issuer: the mailbox it vouches for is trustworthy by
    // construction, so Better Auth may link it to the seeded password
    // account without extra configuration.
    email_verified: true,
    name: handle,
    picture: null,
  };
}

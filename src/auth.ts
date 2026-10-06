import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { username } from "better-auth/plugins/username";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  socialProviders,
  type SocialProvider,
} from "@/features/account/model/credentials";
import { handleBaseFromEmail, pickFreeHandle } from "@/features/account/model/handle";
import { isUserHandle, USER_MAX_LENGTH, USER_MIN_LENGTH } from "@/features/account/model/schema";
import { env } from "@/lib/env";
import { isSeededE2e } from "@/shared/mock";

// How long a signed session cookie may answer renders without consulting
// Postgres (Better Auth validates the signature instead). Shorter window =
// less staleness for server-side revocation; longer = fewer database reads.
const SESSION_CACHE_MAX_AGE_S = 5 * 60;

// The handle canon lives in the account slice (isUserHandle + the length
// bounds); the username plugin must accept exactly it, otherwise sign-up
// refuses what the form allows. The plugin validates the raw value on sign-in
// and the normalized one on sign-up, so the predicate takes any case while
// storage and lookup stay lower case.
//
// Sessions live in the database, but reading them from there on every render
// would be wasteful: the signed cookie cache keeps the session client-side for
// SESSION_CACHE_MAX_AGE_S, so a render usually verifies a signature instead of
// querying Postgres. Sign-out clears the cache; the window only delays
// server-side revocation (an admin action, not a feature yet).

// Better Auth is the single session source (wave 0: backend-auth; the mock
// session it replaced was removed in backend-e2e-auth). The UI prop-model
// (ShellSession/audience) stays unchanged — getActorSession bridges here.
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: SESSION_CACHE_MAX_AGE_S,
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    // One magic, one place: the constants the form and the action validate with.
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    // v0.1: no mail provider yet; password reset is an admin action.
    requireEmailVerification: false,
  },
  databaseHooks: {
    user: {
      create: {
        // OAuth callbacks bring a name, a mailbox and an avatar — never a
        // username, while the shell keys its prop-model on the handle. Fill the
        // gap at insert time (the username plugin passes handle-less rows
        // through untouched), picking a free one so two same-mailbox providers
        // never collide on the unique column.
        before: async (user, context) => {
          const existing = typeof user.username === "string" ? user.username : null;
          const email = typeof user.email === "string" ? user.email : null;
          const adapter = context?.context.adapter;
          if (existing || !email || !adapter) return { data: user };
          const handle = await pickFreeHandle(handleBaseFromEmail(email), async (candidate) =>
            Boolean(
              await adapter.findOne({
                model: "user",
                where: [{ field: "username", value: candidate }],
              }),
            ),
          );
          return handle ? { data: { ...user, username: handle } } : { data: user };
        },
      },
    },
  },
  socialProviders: isSeededE2e()
    ? {}
    : {
        ...(env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined
          ? {
              google: {
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
        ...(env.GITHUB_CLIENT_ID !== undefined && env.GITHUB_CLIENT_SECRET !== undefined
          ? {
              github: {
                clientId: env.GITHUB_CLIENT_ID,
                clientSecret: env.GITHUB_CLIENT_SECRET,
              },
            }
          : {}),
      },
  plugins: [
    // The seeded e2e run registers loopback stand-ins under the real provider
    // ids (see tasks/backend-e2e-auth): the handshake is the genuine library
    // path (state cookie, callback, verification, account, session), only the
    // issuer at the other end is fake. Real credentials are ignored here, so a
    // run never reaches the outside world even when a developer happens to
    // have them set. The plugin entry stays unconditional (empty outside the
    // run) so the tuple type — and the username-augmented session user it
    // infers — never splits into a union.
    genericOAuth({
      config: isSeededE2e()
        ? socialProviders.map((providerId) => ({
            providerId,
            clientId: `e2e-${providerId}`,
            clientSecret: "e2e-local-only",
            authorizationUrl: `${env.BETTER_AUTH_URL}/api/e2e/oauth/authorize/${providerId}`,
            tokenUrl: `${env.BETTER_AUTH_URL}/api/e2e/oauth/token`,
            userInfoUrl: `${env.BETTER_AUTH_URL}/api/e2e/oauth/userinfo`,
          }))
        : [],
    }),
    username({
      minUsernameLength: USER_MIN_LENGTH,
      maxUsernameLength: USER_MAX_LENGTH,
      usernameValidator: (candidate) => isUserHandle(candidate),
      // Registration stores and sign-in looks up the normalized handle: validate
      // the normalized value on write so `Ada` and `ada` are one account.
      validationOrder: { username: "post-normalization" },
    }),
    nextCookies(),
  ],
});

// Providers with credentials present: the logon/registration forms render
// SSO buttons only for these. The seeded e2e run always offers both — the
// loopback stand-ins above stand behind the same ids.
const SOCIAL_CREDENTIALS: Record<SocialProvider, readonly (string | undefined)[]> = {
  google: [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET],
  github: [env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET],
};

export const configuredSocialProviders: readonly SocialProvider[] = isSeededE2e()
  ? [...socialProviders]
  : (Object.keys(SOCIAL_CREDENTIALS) as SocialProvider[]).filter((provider) =>
      SOCIAL_CREDENTIALS[provider].every((value) => value !== undefined),
    );

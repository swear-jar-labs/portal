import { configuredSocialProviders } from "@/auth";
import type { SocialProvider } from "../model/credentials";

// The provider row has one mapping point: the buttons render only for
// providers with credentials configured (see src/auth.ts) — in the seeded
// e2e run those are the loopback stand-ins behind the same ids. Server-only:
// configuredSocialProviders reads the env through the Better Auth instance.
export type SocialAuth = {
  providers: readonly SocialProvider[];
};

export function socialAuth(): SocialAuth {
  return { providers: configuredSocialProviders };
}

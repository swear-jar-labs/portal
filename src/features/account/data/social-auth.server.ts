import { configuredSocialProviders } from "@/auth";
import { isSeededE2e } from "@/shared/mock";
import type { SocialAuthMode } from "../model/credentials";
import { socialProviders, type SocialProvider } from "./mock-session";

// The provider row has one mapping point: the seeded e2e run keeps the
// deterministic mock buttons, everywhere else the buttons render only for
// providers with credentials configured (see src/auth.ts). Server-only:
// configuredSocialProviders reads the env through the Better Auth instance.
export type SocialAuth = {
  providers: readonly SocialProvider[];
  mode: SocialAuthMode;
};

export function socialAuth(): SocialAuth {
  if (isSeededE2e()) return { providers: socialProviders, mode: "mock" };
  return { providers: configuredSocialProviders, mode: "oauth" };
}

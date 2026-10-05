import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// Client handle for the /login handler swap (Phase 5): markup stays, only
// the submit path calls authClient.signIn.email / signIn.social.
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

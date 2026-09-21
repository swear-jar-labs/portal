import { z } from "zod";
import { MAX_POLICY_NEED, MIN_POLICY_NEED } from "./projects";

// UI-first slice: the claim ladder the maintainers tune per project. When the
// backend lands (Phase 5) the same schema guards the server action; the form
// does not change.
export const claimPolicySchema = z.object({
  minSForM: z.number().int().min(MIN_POLICY_NEED).max(MAX_POLICY_NEED),
  minMForL: z.number().int().min(MIN_POLICY_NEED).max(MAX_POLICY_NEED),
});

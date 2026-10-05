import {
  buildMentionDirectory,
  extractMentionHandles,
  resolveMentionHandles,
} from "@/shared/mentions";
import { memberIdentities } from "./account-registry";

// Server-side mention resolution for the RSC panels: which lower-cased
// handles of a fixture body name a known account. The client twin is
// useMentionUsers (shared) — both resolve through the same registry, so the
// pre-rendered fixture bodies and the session's client bodies link alike.
export function mentionUsersForBody(body: string): string[] {
  return resolveMentionHandles(
    extractMentionHandles(body),
    buildMentionDirectory(memberIdentities()),
  );
}

"use client";

import { useMemo } from "react";
import { buildMentionDirectory, extractMentionHandles, resolveMentionHandles } from "./mentions";
import { useMemberIdentities } from "./MemberIdentity";

/** Lower-cased handles of `body` that resolve to known members — pass to the
 * Markdown `mentionUsers` prop. Unknown handles stay plain text. */
export function useMentionUsers(body: string): ReadonlySet<string> {
  const identities = useMemberIdentities();
  return useMemo(() => {
    const directory = buildMentionDirectory(identities);
    return new Set(resolveMentionHandles(extractMentionHandles(body), directory));
  }, [body, identities]);
}

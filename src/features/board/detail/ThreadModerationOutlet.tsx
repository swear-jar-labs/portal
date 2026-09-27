"use client";

import type { ReactNode } from "react";
import { messages } from "@/content/messages";
import { isThreadHidden, useModeration } from "@/features/moderation/contracts";
import { OverlayOutlet, useShellSession } from "@/features/shell";
import { threadDocumentTitle } from "../model/threads";

/** The intercepted panel's title follows a root-post hide without a route
 * refresh; the body itself has the same live moderation subscription. */
export function ThreadModerationOutlet({
  id,
  title,
  author,
  body,
}: {
  id: string;
  title: string;
  author: string;
  body: ReactNode;
}) {
  const state = useModeration();
  const session = useShellSession();
  const masked = isThreadHidden(state, id) && !session?.admin && session?.user !== author;
  const safeTitle = masked ? messages.moderation.hiddenThread : title;
  return (
    <OverlayOutlet
      panels={[{ title: safeTitle, body }]}
      documentTitle={threadDocumentTitle({ title: safeTitle })}
    />
  );
}

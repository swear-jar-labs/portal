import type { ReactNode } from "react";
import { Markdown } from "@/shared/Markdown/Markdown";
import type { Thread } from "./threads";
import { ThreadView } from "./ThreadView";

export type ThreadPanelProps = {
  thread: Thread;
  now: string;
};

/** The thread's RSC half: renders every fixture body through the Markdown
 * pipeline and hands the prepared nodes to the interactive client view (the
 * pipeline never ships to the client). */
export function ThreadPanel({ thread, now }: ThreadPanelProps) {
  const bodies: Record<string, ReactNode> = {};
  for (const post of thread.posts) {
    bodies[post.id] = <Markdown>{post.body}</Markdown>;
  }

  return <ThreadView thread={thread} now={now} bodies={bodies} />;
}

import { Avatar, Stack, Text } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { Markdown } from "@/shared/Markdown/Markdown";
import { formatAge, type Thread } from "@/shared/board/threads";
import styles from "./board.module.css";

export type ThreadPanelProps = {
  thread: Thread;
  now: string;
};

function ThreadMeta({ thread, now }: ThreadPanelProps) {
  return (
    <Stack direction="row" gap={6} align="baseline" wrap>
      {thread.pinned ? (
        <Text as="span" role="accent">
          {messages.board.card.pinned}
        </Text>
      ) : null}
      {thread.locked ? (
        <Text as="span" role="danger">
          {messages.board.card.locked}
        </Text>
      ) : null}
      <Text as="span" role="hint">
        {[formatAge(thread.createdAt, now), formatCount(thread.votes, pluralForms.vote)].join(
          " · ",
        )}
      </Text>
    </Stack>
  );
}

/** The thread's body: post list rendered in RSC, so Markdown never ships to the
 * client (the same rule as docs). */
export function ThreadPanel({ thread, now }: ThreadPanelProps) {
  return (
    <Stack gap={12}>
      <ThreadMeta thread={thread} now={now} />

      {thread.posts.length === 0 ? (
        <Text role="hint">{messages.board.thread.postsEmpty}</Text>
      ) : (
        thread.posts.map((post) => (
          // A post is a navigation row and its own first control: ↑/↓ steps
          // between posts, ←/→ walks the links inside one.
          <Stack key={post.id} as="article" gap={4} className={styles.post} row tabIndex={0}>
            <Stack direction="row" gap={6} align="center" wrap>
              <Avatar user={post.author.user} src={post.author.avatar} />
              <Text as="span">{post.author.user}</Text>
              <Text as="span" role="hint">
                {[
                  messages.board.roles[post.author.role],
                  formatAge(post.createdAt, now),
                  formatCount(post.votes, pluralForms.vote),
                ].join(" · ")}
              </Text>
            </Stack>
            <Markdown>{post.body}</Markdown>
          </Stack>
        ))
      )}

      {thread.locked ? <Text role="danger">{messages.board.thread.locked}</Text> : null}
    </Stack>
  );
}

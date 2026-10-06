// Server-backed board reads: Drizzle over Postgres, same signatures the
// board pages and the contract manifest consume (backend-board; Phase 5).
// Ranking (pinned/hot/new) and the board/tag filters stay the pure
// model/feed.ts functions over the SQL-fetched set; SQL owns filtering by
// board/author, counting, ordering and limits.

import { and, asc, count, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { posts, sections, threads, user as users, votes } from "@/db/schema";
import { avatarFor } from "@/shared/members";
import type { ForumActivitySeed } from "./forum-activity";
import { filterThreads, rankThreads } from "../model/feed";
import {
  isTagId,
  isThreadTechId,
  summarizeThread,
  type BoardId,
  type BoardMember,
  type BoardRoleId,
  type Thread,
  type ThreadPost,
  type ThreadSummary,
} from "../model/threads";

const uuidSchema = z.string().uuid();

// Vote targets share the row ids they count, so one aggregate query serves a
// whole thread list (thread votes and post votes alike).
const THREAD_VOTE_TARGET = "thread" as const;
const POST_VOTE_TARGET = "post" as const;

// The board canon in the database: a board id is a sections slug, for the
// static boards and the project journals alike (backend-seed-demo owns the
// rows). A thread's project link stays informational: reads resolve the
// board through the section alone.
type SectionRef = { slug: string };

type AuthorRef = {
  username: string | null;
  image: string | null;
  level: string;
  admin: boolean;
};

type PostRow = typeof posts.$inferSelect & { author: AuthorRef };

type ThreadRow = typeof threads.$inferSelect & {
  section: SectionRef;
  author: AuthorRef;
  posts: PostRow[];
  threadTags: { tag: { slug: string } }[];
};

// The with-shape stays inline at the single call site (not shared) so the
// relational query builder keeps its contextual typing. It fetches the
// section (the board), the author, all posts with their authors in
// chronological order (tombstones included — the mapper turns them into
// empty-bodied markers), and the status tags. The root post is the earliest
// (created_at, id): writers insert a thread's posts one row per action, so
// ties cannot occur outside manual seeding.

// The author's board face from a user row: admins maintain, community
// members contribute, everyone else takes part. The avatar prefers the
// account's image over the bundled registry face.
function mapBoardAuthor(author: AuthorRef): BoardMember | null {
  if (author.username === null) return null;
  const role: BoardRoleId = author.admin
    ? "maintainer"
    : author.level === "member"
      ? "contributor"
      : "member";
  const avatar = author.image ?? avatarFor(author.username);
  return { user: author.username, role, ...(avatar === undefined ? {} : { avatar }) };
}

function voteKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function mapThreadPost(row: PostRow, counts: ReadonlyMap<string, number>): ThreadPost | null {
  const author = mapBoardAuthor(row.author);
  if (author === null) return null;
  const tombstoned = row.deletedAt !== null;
  return {
    id: row.id,
    author,
    // A tombstone keeps its place (reply markers still resolve) but loses
    // its text: the body never reaches the search corpus or the RSC markup.
    body: tombstoned ? "" : row.body,
    ...(row.replyToId === null ? {} : { replyTo: row.replyToId }),
    createdAt: row.createdAt.toISOString(),
    votes: counts.get(voteKey(POST_VOTE_TARGET, row.id)) ?? 0,
    ...(row.editedAt === null ? {} : { editedAt: row.editedAt.toISOString() }),
    ...(tombstoned && row.deletedAt !== null ? { deletedAt: row.deletedAt.toISOString() } : {}),
  };
}

function mapThread(row: ThreadRow, counts: ReadonlyMap<string, number>): Thread | null {
  const author = mapBoardAuthor(row.author);
  if (author === null) return null;
  const mappedPosts: ThreadPost[] = [];
  for (const post of row.posts) {
    const mapped = mapThreadPost(post, counts);
    if (mapped !== null) mappedPosts.push(mapped);
  }
  return {
    id: row.id,
    board: row.section.slug,
    title: row.title,
    author,
    tags: row.threadTags.map((entry) => entry.tag.slug).filter(isTagId),
    techs: (row.techs ?? []).filter(isThreadTechId),
    pinned: row.pinned,
    locked: row.locked,
    createdAt: row.createdAt.toISOString(),
    votes: counts.get(voteKey(THREAD_VOTE_TARGET, row.id)) ?? 0,
    posts: mappedPosts,
  };
}

// The list face of a thread: the shared summary derivation, with tombstones
// dropped from the reply count (like the session overlay does) while the
// last activity still counts every post.
function toSummary(thread: Thread): ThreadSummary {
  const live = thread.posts.filter((post) => post.deletedAt === undefined).length;
  return { ...summarizeThread(thread), replies: Math.max(0, live - 1) };
}

// Vote totals for a batch of thread and post ids: one GROUP BY query counts
// both target kinds at once; ids outside the table simply have no row.
async function loadVoteCounts(ids: readonly string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const rows = await db
    .select({ targetType: votes.targetType, targetId: votes.targetId, total: count() })
    .from(votes)
    .where(
      and(
        inArray(votes.targetType, [THREAD_VOTE_TARGET, POST_VOTE_TARGET]),
        inArray(votes.targetId, [...ids]),
      ),
    )
    .groupBy(votes.targetType, votes.targetId);
  for (const row of rows) counts.set(voteKey(row.targetType, row.targetId), row.total);
  return counts;
}

type ThreadListOptions = {
  where?: SQL | undefined;
  orderBy?: SQL[];
  limit?: number;
};

// Every list read funnels through here: one relational fetch (section,
// author, posts, status tags) plus one vote aggregate, mapped to the board
// model. Soft-deleted threads never surface; their route id resolves to
// null (the thread page answers notFound, as for unknown ids).
async function loadThreads(options: ThreadListOptions = {}): Promise<Thread[]> {
  const rows = await db.query.threads.findMany({
    where: and(isNull(threads.deletedAt), options.where),
    with: {
      section: { columns: { slug: true } },
      author: { columns: { username: true, image: true, level: true, admin: true } },
      posts: {
        with: {
          author: { columns: { username: true, image: true, level: true, admin: true } },
        },
        orderBy: [asc(posts.createdAt), asc(posts.id)],
      },
      threadTags: { with: { tag: { columns: { slug: true } } } },
    },
    ...(options.orderBy === undefined ? {} : { orderBy: options.orderBy }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
  });
  if (rows.length === 0) return [];
  const counts = await loadVoteCounts([
    ...rows.map((row) => row.id),
    ...rows.flatMap((row) => row.posts.map((post) => post.id)),
  ]);
  const threadsList: Thread[] = [];
  for (const row of rows) {
    const thread = mapThread(row, counts);
    if (thread !== null) threadsList.push(thread);
  }
  return threadsList;
}

async function findSectionId(slug: string): Promise<string | null> {
  const row = await db.query.sections.findFirst({
    where: eq(sections.slug, slug),
    columns: { id: true },
  });
  return row?.id ?? null;
}

async function findUserId(username: string): Promise<string | null> {
  const row = await db.query.user.findFirst({
    where: eq(users.username, username),
    columns: { id: true },
  });
  return row?.id ?? null;
}

function isUuid(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

// Freshest activity first for SQL-ordered lists: threads.last_post_at is
// maintained by the board mutations (compose/reply refresh it), so the
// journal and the profile read the order without fetching every post.
function activityOrder() {
  return [sql`${threads.lastPostAt} DESC NULLS LAST`, desc(threads.createdAt), asc(threads.id)];
}

export async function listThreads(): Promise<ThreadSummary[]> {
  // Deliberately unpaginated: the feed ranks globally in memory, and hot
  // needs every thread — any SQL window would corrupt the rank. Journals
  // and profiles (bounded surfaces) page in SQL instead. Revisit with a
  // cursor feed when the corpus outgrows one fetch; the no-limit unit below
  // pins the contract until then.
  const loaded = await loadThreads({ orderBy: [asc(threads.createdAt), asc(threads.id)] });
  return loaded.map(toSummary);
}

/** The search corpus: full threads (titles plus every live reply body).
 * Tombstoned bodies read back empty, so deleted text never matches. */
export async function listThreadDocuments(): Promise<readonly Thread[]> {
  return loadThreads({ orderBy: [asc(threads.createdAt), asc(threads.id)] });
}

export async function getThread(id: string): Promise<Thread | null> {
  if (!isUuid(id)) return null;
  const loaded = await loadThreads({ where: eq(threads.id, id), limit: 1 });
  return loaded[0] ?? null;
}

/** A public board member: the first authored post names them, like the
 * fixture source of truth did until the member registry arrives. */
export async function getBoardMember(user: string): Promise<BoardMember | null> {
  const userId = await findUserId(user);
  if (userId === null) return null;
  const row = await db.query.posts.findFirst({
    where: and(eq(posts.authorId, userId), isNull(posts.deletedAt)),
    with: {
      author: { columns: { username: true, image: true, level: true, admin: true } },
    },
    orderBy: [asc(posts.createdAt), asc(posts.id)],
  });
  if (!row) return null;
  return mapBoardAuthor(row.author);
}

/** A member's threads, freshest activity first (for account and public profiles). */
export async function listThreadSummariesByAuthor(user: string): Promise<ThreadSummary[]> {
  const userId = await findUserId(user);
  if (userId === null) return [];
  const loaded = await loadThreads({
    where: eq(threads.authorId, userId),
    orderBy: activityOrder(),
  });
  return loaded.map(toSummary);
}

/** The database part of a profile's forum counts: authored threads plus the
 * member's non-root posts (the root is the thread's earliest post). */
export async function forumActivitySeed(user: string): Promise<ForumActivitySeed> {
  const userId = await findUserId(user);
  if (userId === null) return { posts: 0, replies: [] };
  const authored = await db
    .select({ total: count() })
    .from(threads)
    .where(and(eq(threads.authorId, userId), isNull(threads.deletedAt)));
  const mine = await db.query.posts.findMany({
    where: and(eq(posts.authorId, userId), isNull(posts.deletedAt)),
    columns: { id: true, threadId: true, createdAt: true },
  });
  if (mine.length === 0) return { posts: authored[0]?.total ?? 0, replies: [] };
  const threadIds = [...new Set(mine.map((post) => post.threadId))];
  const firsts = await db
    .selectDistinctOn([posts.threadId], {
      threadId: posts.threadId,
      createdAt: posts.createdAt,
      id: posts.id,
    })
    .from(posts)
    .where(and(inArray(posts.threadId, threadIds), isNull(posts.deletedAt)))
    .orderBy(posts.threadId, asc(posts.createdAt), asc(posts.id));
  const firstKey = new Map(firsts.map((post) => [post.threadId, post] as const));
  const replies = mine
    .filter((post) => {
      const first = firstKey.get(post.threadId);
      return (
        first === undefined ||
        first.createdAt.getTime() !== post.createdAt.getTime() ||
        first.id !== post.id
      );
    })
    .map((post) => ({ threadId: post.threadId, postId: post.id }));
  return { posts: authored[0]?.total ?? 0, replies };
}

/** The full size of one project journal, independent of its preview limit. */
export async function countThreadsByBoard(board: BoardId): Promise<number> {
  const sectionId = await findSectionId(board);
  if (sectionId === null) return 0;
  const rows = await db
    .select({ total: count() })
    .from(threads)
    .where(and(eq(threads.sectionId, sectionId), isNull(threads.deletedAt)));
  return rows[0]?.total ?? 0;
}

/** One board's newest summaries, pinned first: a project journal reads the
 * board through it, never a copied sort. `now` is a parameter so the ranking
 * is pure and testable. SQL pages pinned-first by activity; the pure rank
 * pass keeps the contract even if the data drifts. */
export async function listRecentThreadSummariesByBoard(
  board: BoardId,
  limit: number,
  now: number = Date.now(),
): Promise<ThreadSummary[]> {
  const capped = Math.max(0, limit);
  if (capped === 0) return [];
  const sectionId = await findSectionId(board);
  if (sectionId === null) return [];
  const loaded = await loadThreads({
    where: eq(threads.sectionId, sectionId),
    orderBy: [desc(threads.pinned), ...activityOrder()],
    limit: capped,
  });
  const summaries = loaded.map(toSummary);
  return rankThreads(filterThreads(summaries, { board }), "new", now).slice(0, capped);
}

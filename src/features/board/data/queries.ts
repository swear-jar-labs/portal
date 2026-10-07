// Server-backed board reads: Drizzle over Postgres, same signatures the
// board pages and the contract manifest consume (backend-board; Phase 5).
// Ranking (pinned/hot/new) and the board/tag filters stay the pure
// model/feed.ts functions over the SQL-fetched set; SQL owns filtering by
// board/author, counting, ordering and limits.

import { and, asc, count, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { posts, sections, tags, threads, user as users, votes } from "@/db/schema";
import { getActorSession } from "@/features/account/contracts";
import { avatarFor } from "@/shared/members";
import type { ForumActivitySeed } from "./forum-activity";
import { filterThreads, rankThreads } from "../model/feed";
import {
  isTagId,
  isThreadTechId,
  summarizeThread,
  techKind,
  threadStatusKind,
  type BoardId,
  type BoardMember,
  type BoardRoleId,
  type TagCatalog,
  type TagCatalogEntry,
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
  // Statuses and techs share the join: the kind tells them apart, the label
  // paints the chips, the sort orders them inside their kind.
  threadTags: { tag: { slug: string; kind: string; label: string; sort: number } }[];
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

function mapThread(
  row: ThreadRow,
  counts: ReadonlyMap<string, number>,
  votedThreads: ReadonlySet<string>,
): Thread | null {
  const author = mapBoardAuthor(row.author);
  if (author === null) return null;
  const mappedPosts: ThreadPost[] = [];
  for (const post of row.posts) {
    const mapped = mapThreadPost(post, counts);
    if (mapped !== null) mappedPosts.push(mapped);
  }
  // One join, two vocabularies: the kind routes each slug to its list, both
  // in catalog (`sort`) order; unknown slugs never reach the model.
  const ordered = [...row.threadTags].sort((a, b) => a.tag.sort - b.tag.sort);
  const tagLabels: Record<string, string> = {};
  for (const entry of ordered) tagLabels[entry.tag.slug] = entry.tag.label;
  return {
    id: row.id,
    board: row.section.slug,
    title: row.title,
    author,
    tags: ordered
      .filter((entry) => entry.tag.kind === threadStatusKind)
      .map((entry) => entry.tag.slug)
      .filter(isTagId),
    techs: ordered
      .filter((entry) => entry.tag.kind === techKind)
      .map((entry) => entry.tag.slug)
      .filter(isThreadTechId),
    tagLabels,
    pinned: row.pinned,
    locked: row.locked,
    createdAt: row.createdAt.toISOString(),
    votes: counts.get(voteKey(THREAD_VOTE_TARGET, row.id)) ?? 0,
    voted: votedThreads.has(row.id),
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

// The actor's own thread votes for a batch of thread ids: one query over
// the votes rows, so the pressed state renders from the server instead of a
// session delta. Guests (and unknown actors) voted nothing.
async function loadVotedThreadIds(ids: readonly string[]): Promise<Set<string>> {
  const actor = await getActorSession();
  if (!actor) return new Set();
  const userId = await findUserId(actor.user);
  if (userId === null || ids.length === 0) return new Set();
  const rows = await db
    .select({ targetId: votes.targetId })
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        eq(votes.targetType, THREAD_VOTE_TARGET),
        inArray(votes.targetId, [...ids]),
      ),
    );
  return new Set(rows.map((row) => row.targetId));
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
// author, posts, status tags) plus one vote aggregate and the actor's own
// thread votes, mapped to the board model. Soft-deleted threads never
// surface; their route id resolves to null (the thread page answers
// notFound, as for unknown ids).
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
      threadTags: {
        with: { tag: { columns: { slug: true, kind: true, label: true, sort: true } } },
      },
    },
    ...(options.orderBy === undefined ? {} : { orderBy: options.orderBy }),
    ...(options.limit === undefined ? {} : { limit: options.limit }),
  });
  if (rows.length === 0) return [];
  const threadIds = rows.map((row) => row.id);
  const [counts, voted] = await Promise.all([
    loadVoteCounts([...threadIds, ...rows.flatMap((row) => row.posts.map((post) => post.id))]),
    loadVotedThreadIds(threadIds),
  ]);
  const threadsList: Thread[] = [];
  for (const row of rows) {
    const thread = mapThread(row, counts, voted);
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

/** The picker catalog for the board's tag boxes: statuses first, each kind
 * in `tags.sort` order. Server pages fetch it and hand it to the client
 * leaves as props; slugs outside the validated vocabularies never reach the
 * pickers (form validation stays on the code enums until admin editing
 * opens `tech`). */
export async function listTagCatalog(): Promise<TagCatalog> {
  const rows = await db
    .select({ slug: tags.slug, label: tags.label, kind: tags.kind, sort: tags.sort })
    .from(tags)
    .where(inArray(tags.kind, [threadStatusKind, techKind]));
  const inKindOrder = (kind: string) =>
    rows.filter((row) => row.kind === kind).sort((a, b) => a.sort - b.sort);
  const catalog: TagCatalogEntry[] = [];
  for (const row of inKindOrder(threadStatusKind)) {
    if (isTagId(row.slug)) catalog.push({ id: row.slug, label: row.label });
  }
  for (const row of inKindOrder(techKind)) {
    if (isThreadTechId(row.slug)) catalog.push({ id: row.slug, label: row.label });
  }
  return catalog;
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

// UI-first board data: fixtures and the async getters over them. The board
// pages and the contract manifest consume it; when the backend lands (Phase 5),
// the bodies change to queries while the signatures stay put (TECH.md §5).

import { avatarFor } from "@/shared/members";
import { filterThreads, rankThreads } from "./feed";
import {
  summarizeThread,
  type BoardId,
  type BoardMember,
  type Thread,
  type ThreadSummary,
} from "./threads";

const ada: BoardMember = { user: "ada", role: "maintainer", avatar: avatarFor("ada") };
const grace: BoardMember = { user: "grace", role: "contributor", avatar: avatarFor("grace") };
const ken: BoardMember = { user: "ken", role: "member" };
const lin: BoardMember = { user: "lin", role: "member" };

const threads: readonly Thread[] = [
  {
    id: "read-first",
    board: "general",
    title: "READ FIRST: how this board works",
    author: ada,
    tags: ["meta"],
    pinned: true,
    locked: false,
    createdAt: "2026-08-01T09:00:00.000Z",
    votes: 45,
    posts: [
      {
        id: "read-first-1",
        author: ada,
        createdAt: "2026-08-01T09:00:00.000Z",
        votes: 45,
        body: [
          "Three rules, and the jar watches all of them.",
          "",
          "1. **By hand.** No AI-written code, no AI-written posts.",
          "2. **Show the work.** A claim without a terminal log is a rumor.",
          "3. **Leave the joke in.** The board breathes on dry humor.",
          "",
          "Tags: :cyan[proposal], :green[decision], :yellow[question], plus the topical set.",
        ].join("\n"),
      },
      {
        id: "read-first-2",
        author: grace,
        replyTo: "read-first-1",
        createdAt: "2026-08-02T14:20:00.000Z",
        votes: 6,
        body: "Pinned. If a thread drifts, we point here and carry on.",
      },
      {
        id: "read-first-3",
        author: ada,
        createdAt: "2026-09-14T10:00:00.000Z",
        votes: 3,
        body: "Updated August 2026: tags are now the only taxonomy. No folders, no sub-boards.",
      },
    ],
  },
  {
    id: "by-hand-ritual",
    board: "general",
    title: "Weekly ritual: show what you built BY HAND",
    author: grace,
    tags: ["craft"],
    pinned: true,
    locked: false,
    createdAt: "2026-09-01T18:00:00.000Z",
    votes: 21,
    posts: [
      {
        id: "by-hand-ritual-1",
        author: grace,
        createdAt: "2026-09-01T18:00:00.000Z",
        votes: 21,
        body: [
          "Every Friday: one screenshot, one keyboard, one thing you shipped *without a copilot*.",
          "",
          "No demo reel, no launch. A terminal capture is enough.",
        ].join("\n"),
      },
      {
        id: "by-hand-ritual-2",
        author: ken,
        createdAt: "2026-09-05T09:45:00.000Z",
        votes: 8,
        body: "A 200-line regex engine, written on a train, tested in the station coffee queue.",
      },
      {
        id: "by-hand-ritual-3",
        author: lin,
        createdAt: "2026-09-16T07:30:00.000Z",
        votes: 4,
        body: "My first patch to the readroom parser went in this week. Hands still shaking.",
      },
      {
        id: "by-hand-ritual-4",
        author: ken,
        createdAt: "2026-09-17T18:20:00.000Z",
        votes: 7,
        body: [
          "This week's proof: the whole rig mid-refactor, two people and one cable at a time.",
          "",
          "![Glen Beck and Betty Snyder programming the ENIAC by hand, 1946](/media/eniac-programmers.jpg)",
          "",
          "The screens changed. The hands did not.",
        ].join("\n"),
      },
    ],
  },
  {
    id: "handwritten-parsers",
    board: "compiler",
    title: "Why we write our own parsers: a case for recursive descent",
    author: grace,
    tags: ["compilers", "proposal"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-10T12:00:00.000Z",
    votes: 18,
    posts: [
      {
        id: "handwritten-parsers-1",
        author: grace,
        createdAt: "2026-09-10T12:00:00.000Z",
        votes: 18,
        body: [
          "Generated parsers are a black box with good manners. A hand-written recursive descent parser is 400 lines you can *debug at 3am*.",
          "",
          "Proposal: every new grammar in the lab starts as recursive descent. Generators are allowed only with a benchmark that proves the pain.",
        ].join("\n"),
      },
      {
        id: "handwritten-parsers-2",
        author: ada,
        createdAt: "2026-09-11T08:30:00.000Z",
        votes: 9,
        body: "Agreed, with one exception: the SQL front-end stays generated. Nobody hand-writes that much ambiguity for sport.",
      },
      {
        id: "handwritten-parsers-3",
        author: lin,
        replyTo: "handwritten-parsers-2",
        createdAt: "2026-09-16T09:10:00.000Z",
        votes: 5,
        body: "The stack traces alone are worth it. A generator error message is a fortune cookie.",
      },
      {
        id: "handwritten-parsers-4",
        author: lin,
        createdAt: "2026-09-17T08:20:00.000Z",
        votes: 6,
        body: [
          "My parser, boiled down to the one loop that matters:",
          "",
          "```ts",
          "function term(input: Cursor): Node {",
          "  let node = atom(input);",
          '  while (input.peek() === "*" || input.peek() === "/") {',
          "    node = binary(input.next(), node, atom(input));",
          "  }",
          "  return node;",
          "}",
          "```",
          "",
          "Forty lines like this and the grammar stops being a black box. The `while` is where precedence lives — you can point at it.",
        ].join("\n"),
      },
    ],
  },
  {
    id: "swearjar-boot",
    board: "swearjar-dos",
    title: "Boot sequence: CRT-on before first paint",
    author: grace,
    tags: ["craft"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-15T10:00:00.000Z",
    votes: 9,
    posts: [
      {
        id: "swearjar-boot-1",
        author: grace,
        createdAt: "2026-09-15T10:00:00.000Z",
        votes: 9,
        body: [
          "The shell must feel like a power-on, not a page load: scanlines, then the prompt.",
          "",
          "Rule: no content paints before the CRT-on finishes. A terminal that flashes white is a broken promise.",
        ].join("\n"),
      },
      {
        id: "swearjar-boot-2",
        author: ken,
        createdAt: "2026-09-18T09:00:00.000Z",
        votes: 3,
        body: "Timed it on a cold cache: 250ms per line, two pauses, safety at 8s. Feels like hardware.",
      },
    ],
  },
  {
    id: "swearjar-palette",
    board: "swearjar-dos",
    title: "Palette check: CGA against the CRT glow",
    author: ken,
    tags: ["question"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-16T12:00:00.000Z",
    votes: 5,
    posts: [
      {
        id: "swearjar-palette-1",
        author: ken,
        createdAt: "2026-09-16T12:00:00.000Z",
        votes: 5,
        body: [
          "Dark cyan won the primary-button coin toss, but under the scanline overlay it reads darker than the spec.",
          "",
          "Question: do we calibrate the palette under the overlay, or trust the hex and move on?",
        ].join("\n"),
      },
    ],
  },
  {
    id: "token-cache-evict",
    board: "token-cache",
    title: "Eviction policy: LRU lies about recency",
    author: lin,
    tags: ["tooling"],
    pinned: false,
    locked: false,
    createdAt: "2026-08-28T10:00:00.000Z",
    votes: 4,
    posts: [
      {
        id: "token-cache-evict-1",
        author: lin,
        createdAt: "2026-08-28T10:00:00.000Z",
        votes: 4,
        body: [
          "The cache evicted the hottest token first. The access counter updated on read, but the sweep ran on a stale snapshot.",
          "",
          "Lesson filed: a cache that cannot say what it holds is a jar with a hole.",
        ].join("\n"),
      },
      {
        id: "token-cache-evict-2",
        author: ken,
        replyTo: "token-cache-evict-1",
        createdAt: "2026-08-30T14:00:00.000Z",
        votes: 2,
        body: "Same class of bug as the staging dump: two sources of truth, one of them lying. Freeze it and move on.",
      },
    ],
  },
  {
    id: "heap-postmortem",
    board: "general",
    title: "Postmortem: heap corruption at 3am",
    author: ken,
    tags: ["question", "craft"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-12T22:15:00.000Z",
    votes: 12,
    posts: [
      {
        id: "heap-postmortem-1",
        author: ken,
        createdAt: "2026-09-12T22:15:00.000Z",
        votes: 12,
        body: [
          "The crash was a `free()` on a pointer that had been reallocated three frames up. The fix was one line; the search was six hours.",
          "",
          "Question: what is your first move when the heap smells wrong? Valgrind, canaries, or the classic `printf` archaeology?",
        ].join("\n"),
      },
      {
        id: "heap-postmortem-2",
        author: ada,
        replyTo: "heap-postmortem-1",
        createdAt: "2026-09-15T20:45:00.000Z",
        votes: 7,
        body: "Canaries first, always. Instrument the allocator before you instrument your assumptions.",
      },
      {
        id: "heap-postmortem-3",
        author: ken,
        createdAt: "2026-09-16T21:40:00.000Z",
        votes: 4,
        body: [
          "Here is the crime scene, trimmed to the bones. The pointer outlived its buffer by exactly one `realloc()`:",
          "",
          "```c",
          "buf = realloc(buf, len + extra);   /* may move */",
          "write_thing(old_buf);              /* old_buf is now stale */",
          "```",
          "",
          "Valgrind found it in the coffee queue:",
          "",
          "```text",
          "==531== Invalid write of size 8",
          "==531==    at 0x4012A3: write_thing",
          "==531==  Address 0x5a1c0a0 is 0 bytes after a block of size 64 alloc'd",
          "```",
          "",
          "A bug older than my keyboard, by the way:",
          "",
          "![The first computer bug: a moth taped into the Harvard Mark II logbook, 1947](/media/bug-1947.jpg)",
        ].join("\n"),
      },
    ],
  },
  {
    id: "tabs-vs-spaces",
    board: "general",
    title: "Bikeshed closed: tabs, and here is why",
    author: ken,
    tags: ["meta", "decision"],
    pinned: false,
    locked: true,
    createdAt: "2026-08-20T15:00:00.000Z",
    votes: 9,
    posts: [
      {
        id: "tabs-vs-spaces-1",
        author: ken,
        createdAt: "2026-08-20T15:00:00.000Z",
        votes: 9,
        body: "Tabs for indentation, spaces for alignment. The argument lasted nine years. It is over.",
      },
      {
        id: "tabs-vs-spaces-2",
        author: grace,
        replyTo: "tabs-vs-spaces-1",
        createdAt: "2026-09-02T11:00:00.000Z",
        votes: 11,
        body: "Locking this before someone reopens it with a study about reading speed.",
      },
    ],
  },
  {
    id: "ci-cache-poisoning",
    board: "tooling",
    title: "CI cache poisoning: how we lost a day",
    author: ada,
    tags: ["tooling", "question"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-14T08:30:00.000Z",
    votes: 14,
    posts: [
      {
        id: "ci-cache-poisoning-1",
        author: ada,
        createdAt: "2026-09-14T08:30:00.000Z",
        votes: 14,
        body: [
          "A stale object file outlived its header. The build was green, the binary was wrong, and the cache was proud of itself.",
          "",
          "How do you key your build caches so a header edit cannot slip through?",
        ].join("\n"),
      },
      {
        id: "ci-cache-poisoning-2",
        author: grace,
        replyTo: "ci-cache-poisoning-1",
        createdAt: "2026-09-16T06:05:00.000Z",
        votes: 6,
        body: "Hash the compiler version and the full dependency tree, not the mtime. It costs a second and saves the week.",
      },
    ],
  },
  {
    id: "no-ai-commits",
    board: "general",
    title: "Decision: no AI-written commits, ever",
    author: ada,
    tags: ["decision", "craft"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-03T10:00:00.000Z",
    votes: 33,
    posts: [
      {
        id: "no-ai-commits-1",
        author: ada,
        createdAt: "2026-09-03T10:00:00.000Z",
        votes: 33,
        body: [
          "The rule is old, the wording is new: **the author of a commit is a person who can defend it line by line.**",
          "",
          "AI assistance for reading, searching, spell-checking? Fine. AI authorship? No. The jar stays honest.",
        ].join("\n"),
      },
      {
        id: "no-ai-commits-2",
        author: ken,
        createdAt: "2026-09-04T13:10:00.000Z",
        votes: 12,
        body: "This is why the labs exist. Anywhere else this thread would be a flame war.",
      },
      {
        id: "no-ai-commits-3",
        author: grace,
        createdAt: "2026-09-13T19:20:00.000Z",
        votes: 10,
        body: "Adding it to the review checklist: the reviewer asks the author to explain the diff out loud.",
      },
    ],
  },
  {
    id: "staging-dump-errata",
    board: "errata",
    title: 'Errata: I dropped a table to "clean up" a staging dump',
    author: grace,
    tags: ["craft"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-12T09:15:00.000Z",
    votes: 7,
    posts: [
      {
        id: "staging-dump-errata-1",
        author: grace,
        createdAt: "2026-09-12T09:15:00.000Z",
        votes: 7,
        body: [
          'I restored a staging dump over the wrong database and dropped the table I had just spent a week filling. No backup, of course — staging is "disposable".',
          "",
          "What it taught me: **staging is production with a lying label.** The restore now goes through a script that refuses any database whose name does not end in `_scratch`.",
        ].join("\n"),
      },
      {
        id: "staging-dump-errata-2",
        author: ken,
        replyTo: "staging-dump-errata-1",
        createdAt: "2026-09-13T18:40:00.000Z",
        votes: 4,
        body: "The name check is a one-line guard, and it already saved me once this week.",
      },
    ],
  },
  {
    id: "withdrawn-call",
    board: "general",
    title: "Withdrawn: the weekly call",
    author: lin,
    tags: ["meta"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-15T10:00:00.000Z",
    votes: 0,
    posts: [],
  },
];

function byId(a: ThreadSummary, b: ThreadSummary): number {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export async function listThreads(): Promise<ThreadSummary[]> {
  return threads.map(summarizeThread);
}

export async function getThread(id: string): Promise<Thread | null> {
  return threads.find((thread) => thread.id === id) ?? null;
}

/** A public board member: the first authored post is the fixture source of
 * truth until the member registry arrives with the backend. */
export async function getBoardMember(user: string): Promise<BoardMember | null> {
  for (const thread of threads) {
    const post = thread.posts.find((candidate) => candidate.author.user === user);
    if (post) return post.author;
  }
  return null;
}

/** A member's threads, freshest activity first (for account and public profiles). */
export async function listThreadSummariesByAuthor(user: string): Promise<ThreadSummary[]> {
  return threads
    .filter((thread) => thread.author.user === user)
    .map(summarizeThread)
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt) || byId(a, b));
}

/** One board's newest summaries, pinned first: a project journal reads the
 * board through it, never a copied sort. `now` is a parameter so the ranking
 * is pure and testable. */
export async function listRecentThreadSummariesByBoard(
  board: BoardId,
  limit: number,
  now: number = Date.now(),
): Promise<ThreadSummary[]> {
  const summaries = await listThreads();
  return rankThreads(filterThreads(summaries, { board }), "new", now).slice(0, Math.max(0, limit));
}

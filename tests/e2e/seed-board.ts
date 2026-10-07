// The board seed: the deterministic board canon for seeded runs (e2e and
// local demo). Sections, status tags, threads, posts and votes mirror the
// fixture canon the UI-first board rendered, with fixed UUID identities the
// specs address. Accounts are NOT seeded here — the e2e harness owns them
// (tests/e2e/seed.ts) and the seed only references their mailboxes.
//
// The `db:seed` script runs this file with tsx (hoisted from drizzle-kit, no
// new dependency); the board spec imports it through the Playwright
// transform and the unit test through Vitest.

import "dotenv/config";

import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { posts, sections, tags, threadTags, threads, user, votes } from "../../src/db/schema";
import { e2eMailboxFor } from "./e2e-accounts";

export type SeedSection = {
  slug: string;
  title: string;
  position: number;
};

export type SeedPost = {
  key: string;
  id: string;
  author: string;
  body: string;
  createdAt: string;
  replyTo?: string;
  // Visible vote rows on the reply's own control. Opening posts carry none:
  // the thread view shows the thread tally on the root post instead.
  votes: number;
};

export type SeedThread = {
  key: string;
  id: string;
  board: string;
  title: string;
  author: string;
  tags: readonly string[];
  techs: readonly string[];
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  // Visible vote rows on the thread (the feed cards and the root post read
  // this tally, never the root post's own rows).
  votes: number;
  posts: readonly SeedPost[];
};

// The handles whose votes materialize the tallies, in assignment order: the
// first N handles vote on a target with a tally of N. The pool is the
// harness roster, so tallies stay within one vote per (user, target).
const SEED_VOTE_HANDLES = [
  "ada",
  "grace",
  "ken",
  "lin",
  "admin",
  "coadmin",
  "demo-candidate",
  "demo-second",
] as const;

export const SEED_SECTIONS: readonly SeedSection[] = [
  { slug: "general", title: "GENERAL", position: 0 },
  { slug: "errata", title: "ERRATA", position: 1 },
  { slug: "ideas", title: "IDEAS", position: 2 },
  { slug: "interviews", title: "INTERVIEWS", position: 3 },
  { slug: "swearjar-dos", title: "SWEARJAR.DOS", position: 4 },
  { slug: "compiler", title: "Compiler", position: 5 },
  { slug: "tooling", title: "Tooling", position: 6 },
  { slug: "token-cache", title: "Token Cache", position: 7 },
  { slug: "flagship", title: "Flagship", position: 8 },
];

export const SEED_THREADS: readonly SeedThread[] = [
  {
    key: "read-first",
    id: "2edeac74-2c2f-40b0-ac5e-22b909cd15b2",
    board: "general",
    title: "READ FIRST: how this board works",
    author: "ada",
    tags: [],
    techs: [],
    pinned: true,
    locked: false,
    createdAt: "2026-08-01T09:00:00.000Z",
    votes: 8,
    posts: [
      {
        key: "read-first-1",
        id: "bd03953f-bc9b-43e6-82e6-bc99dd6d2648",
        author: "ada",
        createdAt: "2026-08-01T09:00:00.000Z",
        votes: 0,
        body: [
          "Bring questions, show your reasoning, and leave room to change your mind.",
          "",
          "1. **Own your contribution.** Understand what you post and be ready to discuss it.",
          "2. **Show the work.** An example or a reproduction beats a confident guess.",
          "3. **Respect the person.** Critique the work. A dry joke is welcome; a personal dig is not.",
          "",
          "Tags: :cyan[proposal], :brown[question], plus the shared tech set.",
        ].join("\n"),
      },
      {
        key: "read-first-2",
        id: "438a4e9d-8527-4461-b335-6783ccc7e474",
        author: "grace",
        replyTo: "read-first-1",
        createdAt: "2026-08-02T14:20:00.000Z",
        votes: 2,
        body: "Pinned. If a thread drifts, we point here and carry on.",
      },
      {
        key: "read-first-3",
        id: "94e7b3ca-1691-418b-ae5d-b7822c626a75",
        author: "ada",
        createdAt: "2026-09-14T10:00:00.000Z",
        votes: 1,
        body: "GENERAL is for questions and the work in progress. IDEAS holds a project's seed before it becomes a proposal. INTERVIEWS is for prep: mock questions and answer reviews, not job offers. ERRATA is for mistakes and what they taught you, from here or your own practice. Project boards keep the work in context; tags help people find it.",
      },
    ],
  },
  {
    key: "by-hand-ritual",
    id: "b80b21c3-d350-44d3-bfcd-b3a7696e2252",
    board: "general",
    title: "Weekly ritual: what did you build, and what did it teach you?",
    author: "grace",
    tags: [],
    techs: [],
    pinned: true,
    locked: false,
    createdAt: "2026-09-01T18:00:00.000Z",
    votes: 5,
    posts: [
      {
        key: "by-hand-ritual-1",
        id: "08240046-239e-455d-a9a3-333df418050a",
        author: "grace",
        createdAt: "2026-09-01T18:00:00.000Z",
        votes: 0,
        body: [
          "This week's thread: one thing you worked on, one decision you made, and something you learned when it met reality.",
          "",
          "No demo reel, no launch. A terminal capture is enough.",
        ].join("\n"),
      },
      {
        key: "by-hand-ritual-2",
        id: "19133349-5c70-4802-82f8-1daa00e8e974",
        author: "ken",
        createdAt: "2026-09-05T09:45:00.000Z",
        votes: 3,
        body: "A 200-line regex engine, written on a train, tested in the station coffee queue.",
      },
      {
        key: "by-hand-ritual-3",
        id: "63586efd-9246-482b-9983-7bf83d5497e9",
        author: "lin",
        createdAt: "2026-09-16T07:30:00.000Z",
        votes: 1,
        body: "My first patch to the readroom parser went in this week. Hands still shaking.",
      },
      {
        key: "by-hand-ritual-4",
        id: "55ec3239-7801-4c66-b114-aed0ce4cc974",
        author: "ken",
        createdAt: "2026-09-17T18:20:00.000Z",
        votes: 2,
        body: [
          "This week's proof: the whole rig mid-refactor, two people and one cable at a time.",
          "",
          "![Glen Beck and Betty Snyder programming the ENIAC by hand, 1946](/media/eniac-programmers.jpg)",
          "",
          "The screens changed. Debugging still takes people.",
        ].join("\n"),
      },
    ],
  },
  {
    key: "handwritten-parsers",
    id: "28195ea2-e53b-4d52-9a07-422b9d2aec73",
    board: "compiler",
    title: "Why we write our own parsers: a case for recursive descent",
    author: "grace",
    tags: ["proposal", "question"],
    techs: ["c"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-10T12:00:00.000Z",
    votes: 4,
    posts: [
      {
        key: "handwritten-parsers-1",
        id: "c31fe82d-b018-40cc-9211-64b2f327eb21",
        author: "grace",
        createdAt: "2026-09-10T12:00:00.000Z",
        votes: 0,
        body: [
          "Generated parsers are a black box with good manners. A hand-written recursive descent parser is 400 lines you can *debug at 3am*.",
          "",
          "Proposal: every new grammar in the lab starts as recursive descent. Generators are allowed only with a benchmark that proves the pain.",
        ].join("\n"),
      },
      {
        key: "handwritten-parsers-2",
        id: "e0cf2100-38db-4bcb-a1b0-ef50fed59b5d",
        author: "ada",
        createdAt: "2026-09-11T08:30:00.000Z",
        votes: 3,
        body: "Agreed, with one exception: the SQL front-end stays generated. Nobody hand-writes that much ambiguity for sport.",
      },
      {
        key: "handwritten-parsers-3",
        id: "88ca451f-afa6-4196-a9b9-4aec776bab65",
        author: "lin",
        replyTo: "handwritten-parsers-2",
        createdAt: "2026-09-16T09:10:00.000Z",
        votes: 1,
        body: "The stack traces alone are worth it. A generator error message is a fortune cookie.",
      },
      {
        key: "handwritten-parsers-4",
        id: "4542cf46-232a-40dc-8a76-7e4c4c69b8ad",
        author: "lin",
        createdAt: "2026-09-17T08:20:00.000Z",
        votes: 2,
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
    key: "swearjar-boot",
    id: "de6ce779-e19c-4ad2-b3f5-05bc9f2f5387",
    board: "swearjar-dos",
    title: "Boot sequence: CRT-on before first paint",
    author: "grace",
    tags: ["proposal"],
    techs: ["typescript"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-15T10:00:00.000Z",
    votes: 3,
    posts: [
      {
        key: "swearjar-boot-1",
        id: "5d43cf78-c83f-449d-9ee2-0cc91d8fe01c",
        author: "grace",
        createdAt: "2026-09-15T10:00:00.000Z",
        votes: 0,
        body: [
          "The shell must feel like a power-on, not a page load: scanlines, then the prompt.",
          "",
          "Rule: no content paints before the CRT-on finishes. A terminal that flashes white is a broken promise.",
        ].join("\n"),
      },
      {
        key: "swearjar-boot-2",
        id: "4bee1ebb-1049-40b1-b773-8123f432eaf2",
        author: "ken",
        createdAt: "2026-09-18T09:00:00.000Z",
        votes: 1,
        body: "Timed it on a cold cache: 250ms per line, two pauses, safety at 8s. Feels like hardware.",
      },
    ],
  },
  {
    key: "swearjar-palette",
    id: "0bd57664-7b0d-4e97-979d-f6c218a1447e",
    board: "swearjar-dos",
    title: "Palette check: CGA against the CRT glow",
    author: "ken",
    tags: ["question"],
    techs: ["typescript"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-16T12:00:00.000Z",
    votes: 2,
    posts: [
      {
        key: "swearjar-palette-1",
        id: "6d314cdb-1b1b-428c-8067-e043b8a33437",
        author: "ken",
        createdAt: "2026-09-16T12:00:00.000Z",
        votes: 0,
        body: [
          "Dark cyan won the primary-button coin toss, but under the scanline overlay it reads darker than the spec.",
          "",
          "Question: do we calibrate the palette under the overlay, or trust the hex and move on?",
        ].join("\n"),
      },
    ],
  },
  {
    key: "token-cache-evict",
    id: "2fbf5f2c-0c08-47b3-9199-c11a3f7329bb",
    board: "token-cache",
    title: "Eviction policy: LRU lies about recency",
    author: "lin",
    tags: [],
    techs: ["go"],
    pinned: false,
    locked: false,
    createdAt: "2026-08-28T10:00:00.000Z",
    votes: 2,
    posts: [
      {
        key: "token-cache-evict-1",
        id: "bb1f9295-7373-4627-86dc-1c23a8fd9d16",
        author: "lin",
        createdAt: "2026-08-28T10:00:00.000Z",
        votes: 0,
        body: [
          "The cache evicted the hottest token first. The access counter updated on read, but the sweep ran on a stale snapshot.",
          "",
          "Lesson filed: a cache that cannot say what it holds is a jar with a hole.",
        ].join("\n"),
      },
      {
        key: "token-cache-evict-2",
        id: "8e598d5f-a186-436b-a678-a564e153043d",
        author: "ken",
        replyTo: "token-cache-evict-1",
        createdAt: "2026-08-30T14:00:00.000Z",
        votes: 1,
        body: "Same class of bug as the staging dump: two sources of truth, one of them lying. Freeze it and move on.",
      },
    ],
  },
  {
    key: "heap-postmortem",
    id: "7c1a3802-ce75-4b1d-b9f8-f59263ba4aca",
    board: "general",
    title: "Postmortem: heap corruption at 3am",
    author: "ken",
    tags: ["question"],
    techs: ["c"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-12T22:15:00.000Z",
    votes: 4,
    posts: [
      {
        key: "heap-postmortem-1",
        id: "4828b3a8-0800-48ec-b5d7-aa3b4ac88b9c",
        author: "ken",
        createdAt: "2026-09-12T22:15:00.000Z",
        votes: 0,
        body: [
          "The crash was a `free()` on a pointer that had been reallocated three frames up. The fix was one line; the search was six hours.",
          "",
          "Question: what is your first move when the heap smells wrong? Valgrind, canaries, or the classic `printf` archaeology?",
        ].join("\n"),
      },
      {
        key: "heap-postmortem-2",
        id: "75fe804f-d2c9-4047-b65f-e2383c80012e",
        author: "ada",
        replyTo: "heap-postmortem-1",
        createdAt: "2026-09-15T20:45:00.000Z",
        votes: 2,
        body: "Canaries first, always. Instrument the allocator before you instrument your assumptions.",
      },
      {
        key: "heap-postmortem-3",
        id: "c26cf11c-2842-4346-8ce2-e120ea64f3be",
        author: "ken",
        createdAt: "2026-09-16T21:40:00.000Z",
        votes: 1,
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
    key: "tabs-vs-spaces",
    id: "a835b623-5d59-4625-a932-8c20d7106508",
    board: "general",
    title: "Bikeshed closed: tabs, and here is why",
    author: "ken",
    tags: [],
    techs: [],
    pinned: false,
    locked: true,
    createdAt: "2026-08-20T15:00:00.000Z",
    votes: 3,
    posts: [
      {
        key: "tabs-vs-spaces-1",
        id: "b3440172-99ec-4544-b733-b93fe1488eff",
        author: "ken",
        createdAt: "2026-08-20T15:00:00.000Z",
        votes: 0,
        body: "Tabs for indentation, spaces for alignment. The argument lasted nine years. It is over.",
      },
      {
        key: "tabs-vs-spaces-2",
        id: "7ed6c0f4-118d-4033-b8d6-30cc894f4d36",
        author: "grace",
        replyTo: "tabs-vs-spaces-1",
        createdAt: "2026-09-02T11:00:00.000Z",
        votes: 3,
        body: "Locking this before someone reopens it with a study about reading speed.",
      },
    ],
  },
  {
    key: "ci-cache-poisoning",
    id: "76285ff4-d98f-4991-9d1e-2f71d73b92cf",
    board: "tooling",
    title: "CI cache poisoning: how we lost a day",
    author: "ada",
    tags: ["question"],
    techs: ["ci"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-14T08:30:00.000Z",
    votes: 5,
    posts: [
      {
        key: "ci-cache-poisoning-1",
        id: "b062f822-b688-495f-92bb-95b6064dfc1a",
        author: "ada",
        createdAt: "2026-09-14T08:30:00.000Z",
        votes: 0,
        body: [
          "A stale object file outlived its header. The build was green, the binary was wrong, and the cache was proud of itself.",
          "",
          "How do you key your build caches so a header edit cannot slip through?",
        ].join("\n"),
      },
      {
        key: "ci-cache-poisoning-2",
        id: "02e539c0-1929-4fbf-87cc-57c25f342af2",
        author: "grace",
        replyTo: "ci-cache-poisoning-1",
        createdAt: "2026-09-16T06:05:00.000Z",
        votes: 2,
        body: "Hash the compiler version and the full dependency tree, not the mtime. It costs a second and saves the week.",
      },
    ],
  },
  {
    key: "no-ai-commits",
    id: "0a5e35e8-1fad-4856-9316-1caffb4dc36c",
    board: "general",
    title: "Decision: tools can help, but the author owns the code",
    author: "ada",
    tags: [],
    techs: [],
    pinned: false,
    locked: false,
    createdAt: "2026-09-03T10:00:00.000Z",
    votes: 7,
    posts: [
      {
        key: "no-ai-commits-1",
        id: "4f07387b-508c-4cc0-a341-0e3d559a4066",
        author: "ada",
        createdAt: "2026-09-03T10:00:00.000Z",
        votes: 0,
        body: [
          "**The author of a commit is responsible for understanding it.** That includes code suggested by a tool.",
          "",
          "You may use AI tools in project work, provided you review all generated code yourself and take responsibility for it. If you cannot assess it yet, write it yourself and ask for review.",
        ].join("\n"),
      },
      {
        key: "no-ai-commits-2",
        id: "483a30ba-5640-48ee-9804-e37b5f8d9016",
        author: "ken",
        createdAt: "2026-09-04T13:10:00.000Z",
        votes: 4,
        body: "Useful distinction: the tool can suggest a fix, but it cannot answer the review comments for you.",
      },
      {
        key: "no-ai-commits-3",
        id: "5ab5bc64-1f04-4942-9cef-1fcb21d26050",
        author: "grace",
        createdAt: "2026-09-13T19:20:00.000Z",
        votes: 3,
        body: "For beginners, we recommend minimal AI assistance: make your own decisions, then work through the mistakes with someone more experienced. That's the practice we're here for.",
      },
    ],
  },
  {
    key: "staging-dump-errata",
    id: "d38de008-e0d9-4e63-aa5a-d52f53094e3a",
    board: "errata",
    title: 'Errata: I dropped a table to "clean up" a staging dump',
    author: "grace",
    tags: [],
    techs: ["sql", "postgres"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-12T09:15:00.000Z",
    votes: 2,
    posts: [
      {
        key: "staging-dump-errata-1",
        id: "48372551-96d0-413c-a6bc-cbb94f6d5424",
        author: "grace",
        createdAt: "2026-09-12T09:15:00.000Z",
        votes: 0,
        body: [
          'I restored a staging dump over the wrong database and dropped the table I had just spent a week filling. No backup, of course — staging is "disposable".',
          "",
          "What it taught me: **staging is production with a lying label.** The restore now goes through a script that refuses any database whose name does not end in `_scratch`.",
        ].join("\n"),
      },
      {
        key: "staging-dump-errata-2",
        id: "998c94bf-5d8d-49bd-856c-0540edae63e3",
        author: "ken",
        replyTo: "staging-dump-errata-1",
        createdAt: "2026-09-13T18:40:00.000Z",
        votes: 1,
        body: "The name check is a one-line guard, and it already saved me once this week.",
      },
    ],
  },
  {
    key: "pocket-analyzer-idea",
    id: "d3d09cd3-e180-4292-a11e-96ee3fbd7939",
    board: "ideas",
    title: "Idea: a pocket logic analyzer for the lab bench",
    author: "ken",
    tags: ["proposal"],
    techs: ["rust"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-18T10:00:00.000Z",
    votes: 2,
    posts: [
      {
        key: "pocket-analyzer-idea-1",
        id: "fff23fee-723a-4489-9716-fcf0c38b6f5b",
        author: "ken",
        createdAt: "2026-09-18T10:00:00.000Z",
        votes: 0,
        body: [
          "A weekend build: an 8-channel logic analyzer on a microcontroller, dumping captures over USB for the bench upstairs.",
          "",
          "Open questions: the analog front-end, and whether the firmware fits next to the USB stack. Looking for one person who has held a soldering iron.",
        ].join("\n"),
      },
      {
        key: "pocket-analyzer-idea-2",
        id: "653ee3bc-a548-4103-b30b-d1aed6d71458",
        author: "grace",
        replyTo: "pocket-analyzer-idea-1",
        createdAt: "2026-09-19T09:00:00.000Z",
        votes: 1,
        body: "Count me in for the firmware side. I would start with the capture loop and let the hardware tell us what the front-end must survive.",
      },
    ],
  },
  {
    key: "rate-limiter-mock",
    id: "fe9f7845-dec6-424b-b1da-e06023a287b8",
    board: "interviews",
    title: "Mock question: a rate limiter in 45 minutes",
    author: "lin",
    tags: ["question"],
    techs: ["python"],
    pinned: false,
    locked: false,
    createdAt: "2026-09-18T14:00:00.000Z",
    votes: 2,
    posts: [
      {
        key: "rate-limiter-mock-1",
        id: "e46eea2f-725e-4be2-aad5-3efd284a938d",
        author: "lin",
        createdAt: "2026-09-18T14:00:00.000Z",
        votes: 0,
        body: [
          "The prompt: design a per-user rate limiter for an API gateway, then defend it out loud.",
          "",
          "My attempt: a sliding window log in memory, one counter per user, swept every minute. Where does this fall apart once a second instance appears?",
        ].join("\n"),
      },
      {
        key: "rate-limiter-mock-2",
        id: "cd7dbed4-d2a7-4e58-a000-9cd541210fa6",
        author: "ada",
        replyTo: "rate-limiter-mock-1",
        createdAt: "2026-09-19T11:00:00.000Z",
        votes: 2,
        body: "Two instances double the budget unless the counters move to one place. Say that first, then argue about which place: the sweep you described already names the cost.",
      },
    ],
  },
  {
    key: "withdrawn-call",
    id: "b2fda299-a963-4b11-b322-8818ab2db91f",
    board: "general",
    title: "Withdrawn: the weekly call",
    author: "lin",
    tags: [],
    techs: [],
    pinned: false,
    locked: false,
    createdAt: "2026-09-15T10:00:00.000Z",
    votes: 0,
    posts: [],
  },
];

const SEED_THREAD_IDS: Record<string, string> = Object.fromEntries(
  SEED_THREADS.map((thread) => [thread.key, thread.id]),
);

const SEED_POST_IDS: Record<string, string> = Object.fromEntries(
  SEED_THREADS.flatMap((thread) => thread.posts.map((post) => [post.key, post.id])),
);

/** The seeded UUID of a canon thread (what the specs navigate to). */
export function seedThreadId(key: string): string {
  const id = SEED_THREAD_IDS[key];
  if (id === undefined) throw new Error(`unknown seed thread: ${key}`);
  return id;
}

/** The seeded UUID of a canon post (what anchors and markers resolve to). */
export function seedPostId(key: string): string {
  const id = SEED_POST_IDS[key];
  if (id === undefined) throw new Error(`unknown seed post: ${key}`);
  return id;
}

export type SeedBoardReport = {
  sections: number;
  tags: number;
  threads: number;
  posts: number;
  threadTags: number;
  votes: number;
};

function lastPostAt(thread: SeedThread): Date {
  const last = thread.posts.at(-1);
  return new Date(last?.createdAt ?? thread.createdAt);
}

// Idempotent by fixed identities: every row carries its canon id (or lands on
// a unique key), so a rerun inserts nothing — conflicts are skipped, existing
// rows are never updated or deleted. Session-composed content (random ids)
// survives the reseed untouched.
export async function seedBoard(databaseUrl: string): Promise<SeedBoardReport> {
  if (databaseUrl.trim() === "") throw new Error("seedBoard needs a database URL");
  const client = postgres(databaseUrl, { max: 1 });
  try {
    const db = drizzle(client);
    const report: SeedBoardReport = {
      sections: 0,
      tags: 0,
      threads: 0,
      posts: 0,
      threadTags: 0,
      votes: 0,
    };

    for (const section of SEED_SECTIONS) {
      const inserted = await db
        .insert(sections)
        .values({
          slug: section.slug,
          title: section.title,
          position: section.position,
        })
        .onConflictDoNothing()
        .returning({ id: sections.id });
      report.sections += inserted.length;
    }
    const sectionRows = await db.select({ id: sections.id, slug: sections.slug }).from(sections);
    const sectionBySlug = new Map(sectionRows.map((row) => [row.slug, row.id] as const));

    for (const slug of ["proposal", "question"]) {
      const inserted = await db
        .insert(tags)
        .values({ slug, label: slug })
        .onConflictDoNothing()
        .returning({ id: tags.id });
      report.tags += inserted.length;
    }
    const tagRows = await db.select({ id: tags.id, slug: tags.slug }).from(tags);
    const tagBySlug = new Map(tagRows.map((row) => [row.slug, row.id] as const));

    // Authors, post authors and the vote pool resolve from the same account
    // map; every seeded handle is a harness roster account.
    const handles = [
      ...new Set([
        ...SEED_VOTE_HANDLES,
        ...SEED_THREADS.flatMap((thread) => [
          thread.author,
          ...thread.posts.map((post) => post.author),
        ]),
      ]),
    ];
    const mailboxes = handles.map((handle) => e2eMailboxFor(handle));
    const userRows = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(inArray(user.email, mailboxes));
    const userByEmail = new Map(userRows.map((row) => [row.email, row.id] as const));
    const missing = handles.filter((handle) => !userByEmail.has(e2eMailboxFor(handle)));
    if (missing.length > 0) {
      throw new Error(`board seed needs these accounts, seed them first: ${missing.join(", ")}`);
    }

    for (const thread of SEED_THREADS) {
      const sectionId = sectionBySlug.get(thread.board);
      const authorId = userByEmail.get(e2eMailboxFor(thread.author));
      if (sectionId === undefined || authorId === undefined) {
        throw new Error(`board seed cannot resolve thread ${thread.key}`);
      }
      const inserted = await db
        .insert(threads)
        .values({
          id: thread.id,
          sectionId,
          authorId,
          title: thread.title,
          techs: [...thread.techs],
          pinned: thread.pinned,
          locked: thread.locked,
          createdAt: new Date(thread.createdAt),
          lastPostAt: lastPostAt(thread),
        })
        .onConflictDoNothing()
        .returning({ id: threads.id });
      report.threads += inserted.length;

      for (const post of thread.posts) {
        const postAuthorId = userByEmail.get(e2eMailboxFor(post.author));
        if (postAuthorId === undefined) {
          throw new Error(`board seed cannot resolve post ${post.key}`);
        }
        const replyToId = post.replyTo === undefined ? null : (SEED_POST_IDS[post.replyTo] ?? null);
        if (post.replyTo !== undefined && replyToId === null) {
          throw new Error(`board seed cannot resolve reply target ${post.replyTo}`);
        }
        const insertedPost = await db
          .insert(posts)
          .values({
            id: post.id,
            threadId: thread.id,
            authorId: postAuthorId,
            replyToId,
            body: post.body,
            createdAt: new Date(post.createdAt),
          })
          .onConflictDoNothing()
          .returning({ id: posts.id });
        report.posts += insertedPost.length;
      }

      for (const slug of thread.tags) {
        const tagId = tagBySlug.get(slug);
        if (tagId === undefined) throw new Error(`board seed cannot resolve tag ${slug}`);
        const insertedTag = await db
          .insert(threadTags)
          .values({ threadId: thread.id, tagId })
          .onConflictDoNothing()
          .returning({ threadId: threadTags.threadId });
        report.threadTags += insertedTag.length;
      }

      const threadVoters = SEED_VOTE_HANDLES.slice(0, thread.votes);
      for (const handle of threadVoters) {
        const voterId = userByEmail.get(e2eMailboxFor(handle));
        if (voterId === undefined) throw new Error(`board seed cannot resolve voter ${handle}`);
        const insertedVote = await db
          .insert(votes)
          .values({ userId: voterId, targetType: "thread", targetId: thread.id })
          .onConflictDoNothing()
          .returning({ id: votes.id });
        report.votes += insertedVote.length;
      }
      for (const post of thread.posts) {
        const postVoters = SEED_VOTE_HANDLES.slice(0, post.votes);
        for (const handle of postVoters) {
          const voterId = userByEmail.get(e2eMailboxFor(handle));
          if (voterId === undefined) {
            throw new Error(`board seed cannot resolve voter ${handle}`);
          }
          const insertedVote = await db
            .insert(votes)
            .values({ userId: voterId, targetType: "post", targetId: post.id })
            .onConflictDoNothing()
            .returning({ id: votes.id });
          report.votes += insertedVote.length;
        }
      }
    }

    return report;
  } finally {
    await client.end();
  }
}

function formatReport(report: SeedBoardReport): string {
  return (
    `board seed: ${report.sections} sections, ${report.tags} tags, ` +
    `${report.threads} threads, ${report.posts} posts, ` +
    `${report.threadTags} thread tags, ${report.votes} votes`
  );
}

// `npm run db:seed` lands here: plain node executes this file directly, the
// Playwright and Vitest transforms only import it. Direct execution is
// detected by the invoked path, so importing never seeds as a side effect.
const invokedAsScript = (process.argv[1] ?? "").endsWith("seed-board.ts");
if (invokedAsScript) {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (databaseUrl === "") {
    console.error("db:seed needs DATABASE_URL (copy .env.example to .env)");
    process.exit(1);
  }
  seedBoard(databaseUrl).then(
    (report) => {
      console.log(formatReport(report));
    },
    (error: unknown) => {
      console.error(`db:seed failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    },
  );
}

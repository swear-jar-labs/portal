// UI-first readroom data: fixtures and the async getters over them. The
// readroom pages consume it; when the backend lands (Phase 5), the bodies
// change to queries while the signatures stay put (TECH.md §5).

import { avatarFor } from "@/shared/members";
import type { Readroom, ReadroomNote, ReadroomPerson, ReadroomRef } from "../model/readrooms";
import { readroomPath } from "../model/readrooms";

const ada: ReadroomPerson = { user: "ada", avatar: avatarFor("ada") };
const grace: ReadroomPerson = { user: "grace", avatar: avatarFor("grace") };
const ken: ReadroomPerson = { user: "ken" };
const lin: ReadroomPerson = { user: "lin" };

// Fixture clocks are offsets from module load, not wall-clock dates: the demo
// shows all four phases whenever it runs. Phase 5 replaces the fixtures with
// real rows.
const DAY_MS = 86_400_000;
const BASE_MS = Date.now();

function daysFromNow(days: number): string {
  return new Date(BASE_MS + days * DAY_MS).toISOString();
}

function note(id: string, author: ReadroomPerson, createdAt: string, body: string): ReadroomNote {
  return { id, author, createdAt, body };
}

const readrooms: readonly Readroom[] = [
  {
    id: "bump-allocator",
    title: "Dissect the allocator that hides a free list behind a bump pointer",
    tags: [],
    // The seeded order behind the Top mode: retry-loop (2) first, this one (1)
    // next, the rest ties at zero broken by freshness.
    upvotes: ["lin"],
    description: [
      "The surface is a textbook bump allocator: one pointer, one bound, no free.",
      "",
      "Read `alloc`, `resize` and especially `free` — the free list lives *inside* the bump region, and the doc comment claiming :cyan[O(1) worst case] is doing a lot of quiet work. Bring one note per function: what it does, where it lies, what you could not confirm.",
    ].join("\n"),
    sourceUrl:
      "https://github.com/ziglang/zig/blob/8f9d6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f/lib/std/heap/SmpAllocator.zig",
    lead: grace,
    createdAt: daysFromNow(-2),
    deadlineAt: daysFromNow(4),
    ticket: "DOS-3",
    notes: [
      note(
        "bump-allocator-1",
        ken,
        daysFromNow(-2),
        "`free` pushes the chunk back and walks the list — so the worst case is O(n) after all. Either the comment is wrong or the list is capped somewhere I have not found yet.",
      ),
      note(
        "bump-allocator-2",
        ada,
        daysFromNow(-1),
        "The cap is `max_free_chunks`, but it only bites on 32-bit builds: `usize` on 64-bit never reaches it. That is the lie — the bound is target-dependent.",
      ),
      note(
        "bump-allocator-3",
        lin,
        daysFromNow(-1),
        "`resize` never shrinks in place. It re-allocates, copies and leaves a hole. For a bump allocator that is a *choice*, not a bug — but the hole is exactly what the free list needs to stay flat.",
      ),
    ],
  },
  {
    id: "lookahead-table",
    title: "Read the lookahead table a generator wrote: 4,096 states, no comments",
    tags: ["c"],
    upvotes: [],
    description: [
      "This one is machine-written: an LL(1) table emitted by a parser generator, provenance left at the grammar file. An excerpt is pasted below — 4,096 rows in the full table, no comments.",
      "",
      "```text",
      "state   '+'    '-'    '*'    '/'    NUM    '('    ')'",
      "E        -      -      -      -     T1      -      -",
      "E'      +E'    -E'     -      -      -      -     eps",
      "T        -      -      -      -     F1      -      -",
      "T'       -      -     *T'    /T'     -      -     eps",
      "F        -      -      -      -      n     (E)     -",
      "```",
      "",
      "Find the rows that can never fire. Say whether each is a bug or a mercy — a generator is allowed to be clever, but we are the ones who defend this table at 3am.",
    ].join("\n"),
    lead: ken,
    createdAt: daysFromNow(-1),
    deadlineAt: daysFromNow(6),
    notes: [],
  },
  {
    id: "recursive-descent",
    title: "The hand-written parser: where the precedence table lies",
    tags: ["c"],
    upvotes: [],
    description: [
      "Four hundred lines, no generator, and one table that disagrees with the `switch` beside it. The function below is the whole grammar — the table it consults is not.",
      "",
      "```c",
      "static Node *term(Cursor *in) {",
      "  Node *node = atom(in);",
      "  while (in->tok == TOK_STAR || in->tok == TOK_SLASH) {",
      "    node = binary(next(in), node, atom(in));",
      "  }",
      "  return node;",
      "}",
      "```",
      "",
      "Two rows repeat an operator the loop never reaches. Are they dead weight or a trap for the next reader?",
    ].join("\n"),
    sourceUrl:
      "https://github.com/swear-jar-labs/parser-lab/blob/3b1f9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b/src/parser.c",
    lead: ada,
    createdAt: daysFromNow(-7),
    deadlineAt: daysFromNow(-4),
    notes: [
      note(
        "recursive-descent-1",
        ken,
        daysFromNow(-6),
        "The two rows are reachable from `expr`, not `term` — the table is shared between both. Not dead, just documented in the wrong place.",
      ),
      note(
        "recursive-descent-2",
        lin,
        daysFromNow(-5),
        "Confirmed by instrumenting `binary`: both rows fire in the test suite. The comment above the table predates the split of `expr`.",
      ),
      note(
        "recursive-descent-3",
        grace,
        daysFromNow(-5),
        "Then the *table* is the canon and the `switch` in `term` is the special case. I would keep the rows and move the comment.",
      ),
    ],
  },
  {
    id: "retry-loop",
    title: "Postmortem read: the retry loop that never slept",
    tags: ["go", "linux"],
    upvotes: ["ada", "grace"],
    description: [
      "A queue worker with exponential backoff — except the exponent was an `int` and the jitter was added *after* the cap.",
      "",
      "The write-up reconstructs the night: how the herd formed, why the metrics stayed green, and the two lines that fixed it.",
    ].join("\n"),
    sourceUrl:
      "https://github.com/swear-jar-labs/queue-lab/blob/c41d0aa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3/internal/queue/retry.go",
    lead: ken,
    createdAt: daysFromNow(-28),
    deadlineAt: daysFromNow(-21),
    notes: [
      note(
        "retry-loop-1",
        ada,
        daysFromNow(-25),
        "`1 << attempt` overflows at attempt 31 and goes negative: `time.Sleep` returns instantly. Nobody typed a zero, the type system did.",
      ),
      note(
        "retry-loop-2",
        lin,
        daysFromNow(-23),
        "The jitter after the cap is the second half of the bug: it spread retries that had already collapsed to zero.",
      ),
      note(
        "retry-loop-3",
        grace,
        daysFromNow(-22),
        "Metrics stayed green because the retry counter incremented *before* the sleep. The success rate never saw the storm.",
      ),
    ],
    report: [
      "## What the code does",
      "",
      "`retry` computes `1 << attempt` on a signed 32-bit integer, caps it at 30 seconds, then adds jitter. Up to attempt 30 the backoff grows; at 31 the shift overflows to the minimum integer, the cap and the jitter do not save it, and every replica retries in a tight loop.",
      "",
      "```go",
      "delay := 1 << attempt            // int32: overflows at 31",
      "if delay > 30 { delay = 30 }     // never reached",
      "time.Sleep(delay + jitter())",
      "```",
      "",
      "## Where it lies",
      "",
      "- The cap reads like a cap; it is only a cap while the shift is sane.",
      "- The retry metric increments before the sleep, so a zero-length retry is invisible.",
      "",
      "## Resolution",
      "",
      "Compute in `time.Duration` and clamp the *attempt*, not the sum. The herd is gone; the counter now increments after the sleep. :red[Two lines, one night.]",
    ].join("\n"),
    reportAt: daysFromNow(-14),
  },
  {
    id: "token-cache",
    title: "Archived: the token cache that remembered everything",
    tags: ["go"],
    upvotes: [],
    description: [
      "A cache with a TTL — and a map that never forgot the keys. We read it once, published the write-up, and archived the task when the service was retired.",
    ].join("\n"),
    sourceUrl:
      "https://github.com/swear-jar-labs/auth-lab/blob/d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4/cache/tokens.go",
    lead: grace,
    createdAt: daysFromNow(-49),
    deadlineAt: daysFromNow(-42),
    notes: [
      note(
        "token-cache-1",
        ken,
        daysFromNow(-45),
        "Expiry is checked on `Get`, never on `Set`. The map grows with every token ever minted — the TTL only hides the values.",
      ),
      note(
        "token-cache-2",
        ada,
        daysFromNow(-44),
        "A sweep goroutine was written, reviewed, and never started. `go` is commented out in `main` with a TODO older than the ticket.",
      ),
    ],
    report: [
      "## What the code does",
      "",
      "Tokens are stored in a plain map with an expiry timestamp beside each value. Reads honour the timestamp and rescan the map; writes only insert.",
      "",
      "## Where it lies",
      "",
      "The TTL is a *read* contract, not a storage contract. Memory grows with the total number of issued tokens, so the cache is a slow leak with good manners.",
      "",
      "## Resolution",
      "",
      "The service is retired; the module is deleted with it. This write-up stays as the pattern to recognise.",
    ].join("\n"),
    reportAt: daysFromNow(-38),
    archivedAt: daysFromNow(-35),
  },
];

export async function listReadrooms(): Promise<Readroom[]> {
  return [...readrooms];
}

export async function getReadroom(id: string): Promise<Readroom | null> {
  return readrooms.find((readroom) => readroom.id === id) ?? null;
}

/** The ticket dossier's reverse list: the cycles reading one ticket's code. */
export async function listReadroomsByTicket(ticket: string): Promise<ReadroomRef[]> {
  return readrooms
    .filter((readroom) => readroom.ticket === ticket)
    .map((readroom) => ({
      id: readroom.id,
      title: readroom.title,
      path: readroomPath(readroom.id),
    }));
}

/** The product repos by slug for the compose layer's source suggestions. */
export function projectRepoMap(
  projects: readonly { slug: string; repoUrl?: string }[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    projects.flatMap((project) =>
      project.repoUrl === undefined ? [] : [[project.slug, project.repoUrl]],
    ),
  );
}

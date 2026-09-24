import { describe, expect, it } from "vitest";
import {
  DEFAULT_TICKET_QUERY,
  TICKETS_PATH,
  blockEdges,
  filterTickets,
  isBlocked,
  isDefaultTicketQuery,
  isFinishedStatus,
  isTicketKey,
  nextTicketKey,
  openBlockers,
  parseTicketKey,
  parseTicketQuery,
  projectKeyPrefixes,
  sortTickets,
  ticketPath,
  ticketQueryParams,
  ticketsById,
  transitiveBlockers,
  wouldCycle,
  type Ticket,
} from "@/features/tickets/tickets";
import { isFixtureProjectSlug, projectSlugs } from "@/features/projects/contracts";

const ada = { user: "ada" };

function ticket(overrides: Partial<Ticket> & Pick<Ticket, "key" | "project">): Ticket {
  return {
    id: overrides.key,
    title: overrides.key,
    body: "Work by hand.",
    status: "open",
    size: "S",
    priority: "normal",
    tags: [],
    author: ada,
    links: [],
    comments: [],
    blockedBy: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("tickets model", () => {
  it("pins a unique valid prefix to every project", () => {
    expect(Object.keys(projectKeyPrefixes).sort()).toEqual([...projectSlugs].sort());
    expect(new Set(Object.values(projectKeyPrefixes)).size).toBe(projectSlugs.length);
    for (const prefix of Object.values(projectKeyPrefixes))
      expect(isTicketKey(`${prefix}-1`)).toBe(true);
    expect(isTicketKey("bad-1")).toBe(false);
    expect(parseTicketKey("DOS-42")).toEqual({ prefix: "DOS", seq: 42 });
  });

  it("allocates after the project's highest sequence only", () => {
    expect(
      nextTicketKey("swearjar-dos", [
        ticket({ key: "DOS-2", project: "swearjar-dos" }),
        ticket({ key: "DOS-9", project: "swearjar-dos" }),
        ticket({ key: "CMP-99", project: "compiler" }),
      ]),
    ).toBe("DOS-10");
  });

  it("owns the tracker and dossier URL canon", () => {
    expect(TICKETS_PATH).toBe("/tickets");
    expect(ticketPath("DOS-3")).toBe("/tickets/DOS-3");
  });
});

describe("ticket blockers", () => {
  const chain = [
    ticket({ key: "DOS-1", project: "swearjar-dos" }),
    ticket({ key: "DOS-2", project: "swearjar-dos", blockedBy: ["DOS-1"] }),
    ticket({ key: "DOS-3", project: "swearjar-dos", blockedBy: ["DOS-2"] }),
    ticket({ key: "DOS-4", project: "swearjar-dos", status: "done" }),
    ticket({ key: "DOS-5", project: "swearjar-dos", blockedBy: ["DOS-4"] }),
  ];
  const byId = ticketsById(chain);
  const of = (key: string): Ticket => {
    const found = chain.find((entry) => entry.key === key);
    if (found === undefined) throw new Error(`no fixture ${key}`);
    return found;
  };

  it("counts done and closed as finished", () => {
    expect(isFinishedStatus("done")).toBe(true);
    expect(isFinishedStatus("closed")).toBe(true);
    expect(isFinishedStatus("open")).toBe(false);
    expect(isFinishedStatus("in_progress")).toBe(false);
    expect(isFinishedStatus("review")).toBe(false);
  });

  it("reads the blockers that have not finished yet", () => {
    expect(openBlockers(of("DOS-2"), byId).map((entry) => entry.key)).toEqual(["DOS-1"]);
    // A finished blocker stays on the ticket but no longer blocks it.
    expect(openBlockers(of("DOS-5"), byId)).toEqual([]);
    expect(isBlocked(of("DOS-2"), byId)).toBe(true);
    expect(isBlocked(of("DOS-5"), byId)).toBe(false);
  });

  it("walks the blockers transitively", () => {
    expect([...transitiveBlockers("DOS-3", blockEdges(chain))].sort()).toEqual(["DOS-1", "DOS-2"]);
  });

  it("refuses cycles, self-blocks and non-cycles", () => {
    expect(wouldCycle("DOS-2", "DOS-1", chain)).toBe(true);
    expect(wouldCycle("DOS-3", "DOS-1", chain)).toBe(true);
    expect(wouldCycle("DOS-3", "DOS-2", chain)).toBe(true);
    expect(wouldCycle("DOS-1", "DOS-1", chain)).toBe(true);
    expect(wouldCycle("DOS-1", "DOS-3", chain)).toBe(false);
    expect(wouldCycle("DOS-4", "DOS-3", chain)).toBe(false);
  });
});

describe("ticket query", () => {
  const fixtures = [
    ticket({
      key: "DOS-1",
      project: "swearjar-dos",
      title: "First paint",
      size: "M",
      tags: ["bug"],
      assignee: ada,
      updatedAt: "2026-09-03T00:00:00.000Z",
    }),
    ticket({
      key: "DOS-2",
      project: "swearjar-dos",
      title: "Table contract",
      status: "review",
      priority: "high",
      updatedAt: "2026-09-04T00:00:00.000Z",
    }),
    ticket({
      key: "CMP-1",
      project: "compiler",
      title: "Parser",
      assignee: { user: "grace" },
      updatedAt: "2026-09-02T00:00:00.000Z",
    }),
  ];

  it("parses known filters and omits defaults from the deep link", () => {
    const query = parseTicketQuery(
      new URLSearchParams(
        "project=compiler&size=M&priority=high&status=review&assignee=none&tag=bug&q=grace",
      ),
      isFixtureProjectSlug,
    );
    expect(query).toEqual({
      project: "compiler",
      size: "M",
      priority: "high",
      status: "review",
      assignee: "none",
      tag: "bug",
      q: "grace",
    });
    expect(ticketQueryParams(query).toString()).toBe(
      "project=compiler&size=M&priority=high&status=review&assignee=none&tag=bug&q=grace",
    );
    expect(ticketQueryParams(DEFAULT_TICKET_QUERY).toString()).toBe("");
  });

  it("detects the default view from the address params", () => {
    expect(isDefaultTicketQuery(DEFAULT_TICKET_QUERY)).toBe(true);
    expect(isDefaultTicketQuery({ ...DEFAULT_TICKET_QUERY, q: "parser" })).toBe(false);
    expect(isDefaultTicketQuery({ ...DEFAULT_TICKET_QUERY, assignee: "none" })).toBe(false);
  });

  it("falls back from unknown project, status, priority, tag and named assignee", () => {
    expect(
      parseTicketQuery(
        new URLSearchParams(
          "project=nope&size=XL&priority=urgent&status=nope&tag=nope&assignee=ada",
        ),
        isFixtureProjectSlug,
      ),
    ).toEqual(DEFAULT_TICKET_QUERY);
  });

  it("filters by every field and searches key, title and assignee", () => {
    expect(
      filterTickets(fixtures, { ...DEFAULT_TICKET_QUERY, project: "compiler" }).map(
        (entry) => entry.key,
      ),
    ).toEqual(["CMP-1"]);
    expect(
      filterTickets(fixtures, { ...DEFAULT_TICKET_QUERY, size: "M" }).map((entry) => entry.key),
    ).toEqual(["DOS-1"]);
    expect(
      filterTickets(fixtures, { ...DEFAULT_TICKET_QUERY, priority: "high" }).map(
        (entry) => entry.key,
      ),
    ).toEqual(["DOS-2"]);
    expect(
      filterTickets(fixtures, { ...DEFAULT_TICKET_QUERY, assignee: "none" }).map(
        (entry) => entry.key,
      ),
    ).toEqual(["DOS-2"]);
    expect(
      filterTickets(fixtures, { ...DEFAULT_TICKET_QUERY, q: "grace" }).map((entry) => entry.key),
    ).toEqual(["CMP-1"]);
    expect(
      filterTickets(fixtures, { ...DEFAULT_TICKET_QUERY, q: "DOS-1" }).map((entry) => entry.key),
    ).toEqual(["DOS-1"]);
  });

  it("sorts by priority first, then freshness, then the key", () => {
    const ordered = [
      ticket({
        key: "DOS-1",
        project: "swearjar-dos",
        priority: "low",
        updatedAt: "2026-09-09T00:00:00.000Z",
      }),
      ticket({
        key: "DOS-2",
        project: "swearjar-dos",
        priority: "high",
        updatedAt: "2026-09-01T00:00:00.000Z",
      }),
      ticket({
        key: "DOS-3",
        project: "swearjar-dos",
        priority: "normal",
        updatedAt: "2026-09-05T00:00:00.000Z",
      }),
      ticket({
        key: "DOS-4",
        project: "swearjar-dos",
        priority: "high",
        updatedAt: "2026-09-08T00:00:00.000Z",
      }),
    ];
    expect(sortTickets(ordered).map((entry) => entry.key)).toEqual([
      "DOS-4",
      "DOS-2",
      "DOS-3",
      "DOS-1",
    ]);
  });

  it("sorts same-priority tickets by freshest activity", () => {
    expect(sortTickets(fixtures).map((entry) => entry.key)).toEqual(["DOS-2", "DOS-1", "CMP-1"]);
  });
});

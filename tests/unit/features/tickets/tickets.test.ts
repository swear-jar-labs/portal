import { describe, expect, it } from "vitest";
import {
  DEFAULT_TICKET_QUERY,
  TICKETS_PATH,
  filterTickets,
  isDefaultTicketQuery,
  isTicketKey,
  nextTicketKey,
  parseTicketKey,
  parseTicketQuery,
  projectKeyPrefixes,
  sortTickets,
  ticketPath,
  ticketQueryParams,
  type Ticket,
} from "@/features/tickets/tickets";
import { isProjectSlug, projectSlugs } from "@/features/projects/contracts";

const ada = { user: "ada" };

function ticket(overrides: Partial<Ticket> & Pick<Ticket, "key" | "project">): Ticket {
  return {
    id: overrides.key,
    title: overrides.key,
    body: "Work by hand.",
    status: "open",
    size: "S",
    tags: [],
    author: ada,
    links: [],
    comments: [],
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
      new URLSearchParams("project=compiler&size=M&status=review&assignee=none&tag=bug&q=grace"),
      isProjectSlug,
    );
    expect(query).toEqual({
      project: "compiler",
      size: "M",
      status: "review",
      assignee: "none",
      tag: "bug",
      q: "grace",
    });
    expect(ticketQueryParams(query).toString()).toBe(
      "project=compiler&size=M&status=review&assignee=none&tag=bug&q=grace",
    );
    expect(ticketQueryParams(DEFAULT_TICKET_QUERY).toString()).toBe("");
  });

  it("detects the default view from the address params", () => {
    expect(isDefaultTicketQuery(DEFAULT_TICKET_QUERY)).toBe(true);
    expect(isDefaultTicketQuery({ ...DEFAULT_TICKET_QUERY, q: "parser" })).toBe(false);
    expect(isDefaultTicketQuery({ ...DEFAULT_TICKET_QUERY, assignee: "none" })).toBe(false);
  });

  it("falls back from unknown project, status, tag and named assignee", () => {
    expect(
      parseTicketQuery(
        new URLSearchParams("project=nope&size=XL&status=nope&tag=nope&assignee=ada"),
        isProjectSlug,
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

  it("sorts by freshest activity", () => {
    expect(sortTickets(fixtures).map((entry) => entry.key)).toEqual(["DOS-2", "DOS-1", "CMP-1"]);
  });
});

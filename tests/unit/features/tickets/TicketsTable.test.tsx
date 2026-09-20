import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DOS_ROW_ATTR } from "@swearjar/dos/contracts";
import { TicketsTable } from "@/features/tickets/TicketsTable";
import { TICKETS_ROW_ATTR, ticketRowId, type Ticket } from "@/features/tickets/tickets";

const ticket: Ticket = {
  id: "ticket-dos-3",
  key: "DOS-3",
  project: "swearjar-dos",
  title: "Table contract",
  body: "Make the primary action explicit.",
  status: "review",
  size: "M",
  priority: "normal",
  tags: [],
  author: { user: "ada" },
  assignee: { user: "grace" },
  links: [],
  comments: [],
  blockedBy: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("TicketsTable", () => {
  it("renders KEY as the focusable primary action of its navigation row", () => {
    const html = renderToStaticMarkup(
      <TicketsTable tickets={[ticket]} projectNames={{ "swearjar-dos": "SWEARJAR.DOS" }} />,
    );

    expect(html).toContain(`${DOS_ROW_ATTR}=""`);
    expect(html).toContain(`${TICKETS_ROW_ATTR}=""`);
    expect(html).toContain(`id="${ticketRowId(ticket.key)}"`);
    expect(html).toContain(`href="/tickets/${ticket.key}"`);
    expect(html).toContain(`>${ticket.key}</a>`);
    expect(html).toContain('aria-label="TICKETS" style="min-width:846px"');
    // TITLE carries a floor only: the flexible column absorbs the spare width.
    expect(html).toContain('style="min-width:250px"');
    expect(html).toContain(">M</td>");
    expect(html).toContain(">NORMAL</span>");
    expect(html).toContain('style="width:48px"');
    expect(html).toContain('style="width:96px"');
    expect(html).toContain('style="width:116px"');
    expect(html).toContain('style="width:80px"');
    expect(html).toContain('aria-label="grace"');
    expect(html).not.toContain(">grace<");
  });

  it("marks the open ticket as selected", () => {
    const html = renderToStaticMarkup(
      <TicketsTable
        tickets={[ticket]}
        projectNames={{ "swearjar-dos": "SWEARJAR.DOS" }}
        currentKey={ticket.key}
      />,
    );

    expect(html).toContain('class="row rowAction selected highlightFocused ticketRow"');
  });

  it("uses a caller-provided action for a session ticket", () => {
    const html = renderToStaticMarkup(
      <TicketsTable
        tickets={[ticket]}
        projectNames={{ "swearjar-dos": "SWEARJAR.DOS" }}
        actionForTicket={() => ({ onActivate: vi.fn() })}
      />,
    );

    expect(html).toContain(`id="${ticketRowId(ticket.key)}"`);
    expect(html).toContain(`>${ticket.key}</button>`);
    expect(html).not.toContain(`href="/tickets/${ticket.key}"`);
  });

  it("marks a ticket whose blockers have not finished", () => {
    const blocker: Ticket = {
      ...ticket,
      id: "ticket-dos-1",
      key: "DOS-1",
      title: "Blocker",
      status: "open",
      assignee: undefined,
    };
    const blocked: Ticket = { ...ticket, blockedBy: [blocker.id] };
    const html = renderToStaticMarkup(
      <TicketsTable
        tickets={[blocked, blocker]}
        projectNames={{ "swearjar-dos": "SWEARJAR.DOS" }}
      />,
    );
    expect(html).toContain(">BLOCKED</span>");

    const finished = renderToStaticMarkup(
      <TicketsTable
        tickets={[blocked, { ...blocker, status: "done" }]}
        projectNames={{ "swearjar-dos": "SWEARJAR.DOS" }}
      />,
    );
    expect(finished).not.toContain(">BLOCKED</span>");
  });
});

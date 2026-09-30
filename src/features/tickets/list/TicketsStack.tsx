"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import {
  overlayLayerPanels,
  PanelStack,
  ShellPanel,
  stackMemory,
  useLoginPrompt,
  useOverlayPush,
  useOverlayTop,
  useShellSession,
} from "@/features/shell";
import { type ReadroomRef } from "@/features/readroom/contracts";
import {
  DEFAULT_CLAIM_POLICY,
  livePoliciesByProject,
  projectStoreServerSnapshot,
  projectStoreSnapshot,
  subscribeProjectStore,
} from "@/features/projects/contracts";
import { avatarFor } from "@/shared/members";
import {
  buildTicketAssignEvents,
  buildTicketCreatedEvents,
  buildTicketStatusEvents,
  enqueueInboxEvent,
  useMentionNotifier,
} from "@/features/inbox/contracts";
import { TicketCompose } from "../compose/TicketCompose";
import { TicketEdit } from "../compose/TicketEdit";
import { submitTicketEdit, type TicketEditChanges } from "../data/edit-submit";
import { freshTicketAccess } from "../data/mock-ticket-access";
import { canWriteTicket } from "../model/workflow";
import { TicketPanel } from "../detail/TicketPanel";
import { TicketsFeed, type TicketProjectOption } from "./TicketsFeed";
import { type TicketComposeInput, type TicketEditInput } from "../model/schema";
import type { TicketProject } from "../model/workflow";
import {
  composeButtonId,
  DEFAULT_TICKET_QUERY,
  TICKETS_PATH,
  parseTicketQuery,
  ticketEditButtonId,
  ticketPath,
  ticketQueryParams,
  ticketRowId,
  type Ticket,
  type TicketQuery,
} from "../model/tickets";
import { useTicketSession } from "../data/useTicketSession";

// The routed dossier arrives as data: the stack owns its layers, so the author's
// edit layer opens above it without a round trip.
export type TicketLayer = {
  ticket: Ticket;
  projectName: string;
  readrooms: readonly ReadroomRef[];
};

export type TicketsStackProps = {
  tickets: readonly Ticket[];
  memberUsers: readonly string[];
  projects: readonly TicketProjectOption[];
  initialQuery?: TicketQuery;
  initialCompose?: boolean;
  now: string;
  ticket?: TicketLayer;
};

export function TicketsStack({
  tickets,
  memberUsers,
  projects,
  initialQuery = DEFAULT_TICKET_QUERY,
  initialCompose = false,
  now,
  ticket,
}: TicketsStackProps) {
  const router = useRouter();
  const pushOverlay = useOverlayPush();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const [query, setQuery] = useState(initialQuery);
  const [composing, setComposing] = useState(initialCompose);
  const [localKey, setLocalKey] = useState<string | null>(null);
  // The author's edit layer: the live ticket it edits (null when closed).
  const [editing, setEditing] = useState<Ticket | null>(null);
  const closingRef = useRef(false);
  const returnFocusRef = useRef<string | null>(null);
  // The stack claims the overlay host role while mounted (the fallback host
  // yields) and renders the store layers as the top of this PanelStack.
  const { overlayLayers, overlayOpen, closeOverlay } = useOverlayTop(closingRef);
  const { state, visible, localKeys, addTicket } = useTicketSession({ tickets, query });
  // The maintainers' tuned ladders: the dossier gates ASSIGN on the live one.
  const projectPolicies = useSyncExternalStore(
    subscribeProjectStore,
    projectStoreSnapshot,
    projectStoreServerSnapshot,
  );
  const localTicket = useMemo(
    () => state.addedTickets.find((entry) => entry.key === localKey) ?? null,
    [localKey, state.addedTickets],
  );
  const projectNames = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.slug, project.name])),
    [projects],
  );
  const notifyMentions = useMentionNotifier();

  // A ticket's notify context: the dossier key names it, the project names
  // the source (the slug stays as the fallback, like the dossier title does).
  const notifyTicketMentions = useCallback(
    (messageId: string, body: string, ticketKey: string, projectSlug: string) => {
      if (session === null) return;
      notifyMentions({
        authorUser: session.user,
        messageId,
        body,
        source: projectNames[projectSlug] ?? projectSlug,
        context: ticketKey,
        target: { kind: "ticket", label: ticketKey, href: ticketPath(ticketKey) },
      });
    },
    [notifyMentions, projectNames, session],
  );
  const projectBySlug = useMemo(
    () => new Map(projects.map((project) => [project.slug, project])),
    [projects],
  );
  const policyByProject = useMemo(
    () => livePoliciesByProject(projects, projectPolicies),
    [projects, projectPolicies],
  );

  const accessFor = useCallback(
    (slug: Ticket["project"]): TicketProject => {
      const found = projectBySlug.get(slug);
      return {
        slug,
        status: found?.status ?? "archived",
        lead: found?.lead ?? null,
        maintainers: found?.maintainers ?? [],
        reviewers: found?.reviewers ?? [],
        claimPolicy: policyByProject[slug] ?? DEFAULT_CLAIM_POLICY,
      };
    },
    [policyByProject, projectBySlug],
  );

  useEffect(() => {
    closingRef.current = false;
  }, [composing, localKey, overlayLayers, ticket?.ticket.key]);

  useEffect(() => {
    const handlePopState = () => {
      setQuery(
        parseTicketQuery(
          new URLSearchParams(window.location.search),
          (value): value is Ticket["project"] => projects.some((project) => project.slug === value),
        ),
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [projects]);

  useEffect(() => {
    const id = stackMemory.takePendingCardFocus();
    if (id === null) return;
    const row = document.getElementById(ticketRowId(id));
    row?.focus();
    row?.scrollIntoView({ block: "nearest" });
  }, [localKey, ticket?.ticket.key]);

  useEffect(() => {
    if (composing || editing) return;
    const id = returnFocusRef.current;
    returnFocusRef.current = null;
    if (id) document.getElementById(id)?.focus();
  }, [composing, editing]);

  const replaceTrackerUrl = useCallback((current: TicketQuery) => {
    const params = ticketQueryParams(current);
    const suffix = params.size === 0 ? "" : `?${params.toString()}`;
    window.history.replaceState(window.history.state, "", `${TICKETS_PATH}${suffix}`);
  }, []);

  const changeQuery = useCallback(
    (patch: Partial<TicketQuery>) => {
      const next = { ...query, ...patch };
      setQuery(next);
      replaceTrackerUrl(next);
    },
    [query, replaceTrackerUrl],
  );

  const activateTicket = useCallback(
    (key: string, event?: MouseEvent<HTMLElement>) => {
      if (localKeys.has(key)) {
        setLocalKey(key);
        return;
      }
      // The root slot intercepts the dossier above the current stack: the row
      // stays mounted and returns focus when the overlay peels.
      pushOverlay(ticketPath(key), ticketRowId(key))(event);
    },
    [localKeys, pushOverlay],
  );

  const openCompose = useCallback(() => {
    if (session === null) {
      requestLogin();
      return;
    }
    setComposing(true);
  }, [requestLogin, session]);

  const closeCompose = useCallback(() => {
    returnFocusRef.current = composeButtonId;
    setComposing(false);
    replaceTrackerUrl(query);
  }, [query, replaceTrackerUrl]);

  const submitCompose = useCallback(
    async (input: TicketComposeInput) => {
      if (session === null) {
        requestLogin();
        return messages.tickets.compose.memberRequired;
      }
      const access = await freshTicketAccess(input.project);
      if (
        !access ||
        access.actor?.user !== session.user ||
        !canWriteTicket(access.actor, access.project)
      ) {
        return messages.tickets.compose.memberRequired;
      }
      const created = addTicket(input, { user: session.user, avatar: avatarFor(session.user) });
      notifyTicketMentions(created.id, input.body, created.key, created.project);
      // A new task pings the project's leads from the saved ticket: the team
      // learns about queue growth, the opener never self-notifies.
      const createdAccess = accessFor(created.project);
      const createdAt = new Date().toISOString();
      const createdTarget = {
        kind: "ticket" as const,
        label: created.key,
        href: ticketPath(created.key),
      };
      for (const delivery of buildTicketCreatedEvents({
        ticketId: created.id,
        ticketKey: created.key,
        projectLabel: projectNames[created.project] ?? created.project,
        actorUser: session.user,
        actorName: session.user,
        leadsAndMaintainers: [
          createdAccess.lead?.user,
          ...createdAccess.maintainers.map((person) => person.user),
        ],
        target: createdTarget,
        at: createdAt,
      }))
        enqueueInboxEvent(delivery.user, delivery.event);
      const nextQuery = { ...DEFAULT_TICKET_QUERY, project: input.project };
      setQuery(nextQuery);
      setComposing(false);
      replaceTrackerUrl(nextQuery);
      setLocalKey(created.key);
      return null;
    },
    [
      accessFor,
      addTicket,
      notifyTicketMentions,
      projectNames,
      replaceTrackerUrl,
      requestLogin,
      session,
    ],
  );

  const closeTicket = useCallback(() => {
    if (!ticket || closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(ticket.ticket.key);
    // Direct-load only (an overlay dossier peels with browser back instead).
    if (stackMemory.takePushedFrom(window.location.pathname)) router.back();
    else router.push(TICKETS_PATH);
  }, [router, ticket]);

  const openEdit = useCallback((entry: Ticket) => {
    setEditing(entry);
  }, []);

  const closeEdit = useCallback(() => {
    returnFocusRef.current = ticketEditButtonId;
    setEditing(null);
  }, []);

  const submitEdit = useCallback(
    async (input: TicketEditInput, changes: TicketEditChanges) => {
      if (editing === null || session === null) return "denied" as const;
      const before = editing;
      const result = await submitTicketEdit(editing, tickets, input, changes);
      if (result) return result;
      // An edit that adds tags notifies under the ticket id: the store drops
      // the repeat when the tags were already there.
      notifyTicketMentions(editing.id, input.body, editing.key, editing.project);
      const at = new Date().toISOString();
      const target = { kind: "ticket" as const, label: editing.key, href: ticketPath(editing.key) };
      const label = projectNames[editing.project] ?? editing.project;
      if (input.status !== before.status) {
        for (const delivery of buildTicketStatusEvents({
          ticketId: editing.id,
          ticketKey: editing.key,
          from: before.status,
          to: input.status,
          projectLabel: label,
          actorUser: session.user,
          actorName: session.user,
          ticketAuthor: before.author.user,
          assignee: before.assignee?.user,
          target,
          at,
        }))
          enqueueInboxEvent(delivery.user, delivery.event);
      }
      if (changes.assignee !== undefined) {
        for (const delivery of buildTicketAssignEvents({
          ticketId: editing.id,
          ticketKey: editing.key,
          projectLabel: label,
          actorUser: session.user,
          actorName: session.user,
          previousAssignee: before.assignee?.user,
          nextAssignee: changes.assignee ?? undefined,
          ticketAuthor: before.author.user,
          target,
          at,
        }))
          enqueueInboxEvent(delivery.user, delivery.event);
      }
      if (changes.reviewer !== undefined && changes.reviewer !== null) {
        for (const delivery of buildTicketAssignEvents({
          ticketId: `${editing.id}:review`,
          ticketKey: editing.key,
          projectLabel: label,
          actorUser: session.user,
          actorName: session.user,
          previousAssignee: before.reviewer?.user,
          nextAssignee: changes.reviewer,
          ticketAuthor: before.author.user,
          target,
          at,
        }))
          enqueueInboxEvent(delivery.user, delivery.event);
      }
      returnFocusRef.current = ticketEditButtonId;
      setEditing(null);
      return null;
    },
    [editing, notifyTicketMentions, projectNames, session, tickets],
  );

  const closeLocalTicket = useCallback(() => {
    if (localTicket === null) return;
    stackMemory.requestCardFocus(localTicket.key);
    setLocalKey(null);
  }, [localTicket]);

  const closeTop = useCallback(() => {
    if (overlayOpen) {
      closeOverlay();
      return;
    }
    if (editing) closeEdit();
    else if (composing) closeCompose();
    else if (localTicket) closeLocalTicket();
    else closeTicket();
  }, [
    closeCompose,
    closeEdit,
    closeLocalTicket,
    closeOverlay,
    closeTicket,
    composing,
    editing,
    localTicket,
    overlayOpen,
  ]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("TICKETS")}>
        <TicketsFeed
          tickets={visible}
          query={query}
          projects={projects}
          projectNames={projectNames}
          currentKey={ticket?.ticket.key ?? localTicket?.key}
          localKeys={localKeys}
          onQueryChange={changeQuery}
          onActivate={activateTicket}
          onCompose={openCompose}
        />
      </ShellPanel>
      {ticket ? (
        <ShellPanel
          title={ticket.ticket.key}
          actions={<CloseButton onClose={closeTicket} label={messages.shell.window.closeLabel} />}
        >
          <TicketPanel
            ticket={ticket.ticket}
            tickets={tickets}
            projectName={ticket.projectName}
            project={accessFor(ticket.ticket.project)}
            readrooms={ticket.readrooms}
            now={now}
            onEdit={openEdit}
          />
        </ShellPanel>
      ) : null}
      {localTicket ? (
        <ShellPanel
          title={localTicket.key}
          actions={
            <CloseButton onClose={closeLocalTicket} label={messages.shell.window.closeLabel} />
          }
        >
          <TicketPanel
            ticket={localTicket}
            tickets={tickets}
            projectName={projectNames[localTicket.project] ?? localTicket.project}
            project={accessFor(localTicket.project)}
            readrooms={[]}
            now={now}
            onEdit={openEdit}
          />
        </ShellPanel>
      ) : null}
      {composing ? (
        <ShellPanel
          title={messages.tickets.compose.title}
          surface="light"
          actions={<CloseButton onClose={closeCompose} label={messages.shell.window.closeLabel} />}
        >
          <TicketCompose
            projects={projects}
            defaultProject={query.project === "all" ? undefined : query.project}
            onSubmit={submitCompose}
            onCancel={closeCompose}
          />
        </ShellPanel>
      ) : null}
      {editing ? (
        <ShellPanel
          title={messages.tickets.edit.heading}
          surface="light"
          actions={<CloseButton onClose={closeEdit} label={messages.shell.window.closeLabel} />}
        >
          <TicketEdit
            ticket={editing}
            tickets={tickets}
            project={accessFor(editing.project)}
            memberUsers={memberUsers}
            onSubmit={submitEdit}
            onCancel={closeEdit}
          />
        </ShellPanel>
      ) : null}
      {overlayLayerPanels(overlayLayers, closeOverlay)}
    </PanelStack>
  );
}

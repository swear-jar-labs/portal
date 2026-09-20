"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CloseButton } from "@swearjar/dos";
import { fileTitle } from "@/content/commands";
import { messages } from "@/content/messages";
import { isPlainActivation } from "@/lib/activation";
import { useMemberLayer } from "@/features/members/contracts";
import {
  PanelStack,
  ShellPanel,
  stackMemory,
  useLoginPrompt,
  useShellSession,
} from "@/features/shell";
import { avatarFor } from "@/shared/members";
import { TicketCompose } from "./TicketCompose";
import { TicketPanel } from "./TicketPanel";
import { TicketsFeed, type TicketProjectOption } from "./TicketsFeed";
import { type TicketComposeInput } from "./schema";
import {
  composeButtonId,
  DEFAULT_TICKET_QUERY,
  TICKETS_PATH,
  parseTicketQuery,
  ticketPath,
  ticketQueryParams,
  ticketRowId,
  type Ticket,
  type TicketQuery,
} from "./tickets";
import { useTicketSession } from "./useTicketSession";

export type TicketLayer = { key: string; title: string; layer: ReactNode };

export type TicketsStackProps = {
  tickets: readonly Ticket[];
  projects: readonly TicketProjectOption[];
  initialQuery?: TicketQuery;
  initialCompose?: boolean;
  now: string;
  ticket?: TicketLayer;
};

export function TicketsStack({
  tickets,
  projects,
  initialQuery = DEFAULT_TICKET_QUERY,
  initialCompose = false,
  now,
  ticket,
}: TicketsStackProps) {
  const router = useRouter();
  const session = useShellSession();
  const requestLogin = useLoginPrompt();
  const routedMemberLayer = useMemberLayer();
  const [query, setQuery] = useState(initialQuery);
  const [composing, setComposing] = useState(initialCompose);
  const [localKey, setLocalKey] = useState<string | null>(null);
  const closingRef = useRef(false);
  const returnFocusRef = useRef<string | null>(null);
  const memberLayerOpen = routedMemberLayer !== null;
  const wasMemberLayerOpen = useRef(memberLayerOpen);
  const { state, visible, localKeys, addTicket } = useTicketSession({ tickets, query });
  const localTicket = useMemo(
    () => state.addedTickets.find((entry) => entry.key === localKey) ?? null,
    [localKey, state.addedTickets],
  );
  const projectNames = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.slug, project.name])),
    [projects],
  );

  useEffect(() => {
    closingRef.current = false;
  }, [composing, localKey, memberLayerOpen, ticket?.key]);

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
  }, [localKey, ticket?.key]);

  useEffect(() => {
    const closed = !memberLayerOpen && wasMemberLayerOpen.current;
    wasMemberLayerOpen.current = memberLayerOpen;
    if (!closed) return;
    const id = stackMemory.takePendingMemberFocus();
    if (id) document.getElementById(id)?.focus();
  }, [memberLayerOpen]);

  useEffect(() => {
    if (composing) return;
    const id = returnFocusRef.current;
    returnFocusRef.current = null;
    if (id) document.getElementById(id)?.focus();
  }, [composing]);

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
      if (!isPlainActivation(event)) return;
      event?.preventDefault();
      const route = ticketPath(key);
      stackMemory.rememberPush(route);
      router.push(route);
    },
    [localKeys, router],
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
    (input: TicketComposeInput) => {
      if (session === null) {
        requestLogin();
        return;
      }
      const created = addTicket(input, { user: session.user, avatar: avatarFor(session.user) });
      const nextQuery = { ...DEFAULT_TICKET_QUERY, project: input.project };
      setQuery(nextQuery);
      setComposing(false);
      replaceTrackerUrl(nextQuery);
      setLocalKey(created.key);
    },
    [addTicket, replaceTrackerUrl, requestLogin, session],
  );

  const closeTicket = useCallback(() => {
    if (!ticket || closingRef.current) return;
    closingRef.current = true;
    stackMemory.requestCardFocus(ticket.key);
    if (stackMemory.takePushedFrom(window.location.pathname)) router.back();
    else router.push(TICKETS_PATH);
  }, [router, ticket]);

  const closeLocalTicket = useCallback(() => {
    if (localTicket === null) return;
    stackMemory.requestCardFocus(localTicket.key);
    setLocalKey(null);
  }, [localTicket]);

  const closeMember = useCallback(() => {
    if (!memberLayerOpen || closingRef.current) return;
    closingRef.current = true;
    if (stackMemory.wasMemberPushedFrom(window.location.pathname)) router.back();
    else router.push(ticket ? ticketPath(ticket.key) : TICKETS_PATH);
  }, [memberLayerOpen, router, ticket]);

  const closeTop = useCallback(() => {
    if (memberLayerOpen) closeMember();
    else if (composing) closeCompose();
    else if (localTicket) closeLocalTicket();
    else closeTicket();
  }, [
    closeCompose,
    closeLocalTicket,
    closeMember,
    closeTicket,
    composing,
    localTicket,
    memberLayerOpen,
  ]);

  return (
    <PanelStack onCloseTop={closeTop}>
      <ShellPanel title={fileTitle("TICKETS")} closable>
        <TicketsFeed
          tickets={visible}
          query={query}
          projects={projects}
          projectNames={projectNames}
          currentKey={ticket?.key ?? localTicket?.key}
          localKeys={localKeys}
          onQueryChange={changeQuery}
          onActivate={activateTicket}
          onCompose={openCompose}
        />
      </ShellPanel>
      {ticket ? (
        <ShellPanel
          title={ticket.key}
          actions={<CloseButton onClose={closeTicket} label={messages.shell.window.closeLabel} />}
        >
          {ticket.layer}
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
            readrooms={[]}
            now={now}
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
      {memberLayerOpen ? (
        <ShellPanel
          title={messages.members.panelTitle}
          actions={<CloseButton onClose={closeMember} label={messages.shell.window.closeLabel} />}
        >
          {routedMemberLayer}
        </ShellPanel>
      ) : null}
    </PanelStack>
  );
}

"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  Suspense,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CmdLine,
  Dialog,
  KeyBar,
  MenuBar,
  resolveCommand,
  Screensaver,
  Sprite,
  Stack,
  Text,
} from "@swearjar/dos";
import {
  commandById,
  ERRATA_HREF,
  fileGroupsFor,
  FORUM_PATH,
  BUG_TICKETS_HREF,
  HOME_PATH,
  joinLocation,
  isSearchablePath,
  keyDefsFor,
  loginHref,
  menuDefsFor,
  stripQuery,
  visibleCommands,
  type CommandId,
  type CommunityLevel,
} from "@/content/commands";
import { messages } from "@/content/messages";
import { screensaverDelayMsForPrefs, useScreensaverPrefs } from "./screensaver-prefs";
import { jarSnapshot, recordBadCommand, useJarEvents } from "./data/jar-store";
import { KeyBarClock } from "./KeyBarClock";
import { JarDialogBody, LoginPromptBody } from "./dialogs";
import { useFunctionKeys } from "./hooks/useFunctionKeys";
import { useIdleScreensaver } from "./hooks/useIdleScreensaver";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePanelNav } from "./hooks/usePanelNav";
import { useCommandRunner, type DialogState } from "./hooks/useCommandRunner";
import { CMD_ZONE } from "./zones";
import { SessionProvider } from "./SessionContext";
import { LandingCloseProvider } from "./landing-close";
import { ShellDialogsProvider, type ShellDialogs } from "./ShellDialogs";
import { OverlayHost } from "./OverlayHost";
import { OverlayDocumentTitle, useOverlayFocusReturn } from "./OverlayLayers";
import { useOverlayHostClaimed, useOverlayLayers } from "./overlay-store";
import { ShellControlsProvider } from "./ShellControls";
import { SearchAvailabilityProvider } from "./SearchAvailability";
import { SEARCH_FIELD_ID } from "./attributes";
import { resolveShellAddons, type ShellAddon } from "./addons";
import { FileManagerProvider } from "./FileManager/FileManagerContext";
import { FileManagerPanel } from "./FileManager/FileManagerPanel";
import { useFileCursorKeys } from "./FileManager/useFileCursorKeys";
import { useFileManager } from "./FileManager/useFileManager";
import { focusPanelBody, keepPanelBodyFocus } from "./panel-focus";
import dialogsStyles from "./dialogs.module.css";
import styles from "./DosShell.module.css";

// The shell knows nothing about auth: any session-shaped value with a user
// and a community level works, and logoff is injected by the layout (mock
// action until auth lands). The level type comes from the command registry,
// so the frame never imports the account slice (see AGENTS.md).
export type ShellSession = {
  user: string;
  username?: string;
  level: CommunityLevel;
  admin: boolean;
} | null;

export type DosShellProps = {
  children: ReactNode;
  /** The root `@overlay` slot: outlets register into the store, render null. */
  overlay: ReactNode;
  session: ShellSession;
  logoff: () => Promise<void>;
  // Section-owned chrome (the inbox unread counter and its file icon): the
  // layout composes the addons, so the shell never imports a section.
  addons?: readonly ShellAddon[];
  // The landing window body, composed by the layout like the addons: the
  // shell owns the layer (when it shows, focus, background input) but never
  // imports the landing slice.
  landing?: ReactNode;
  commandAvailability?: Partial<Record<CommandId, boolean>>;
};

// The file highlight follows the query (FORUM vs ERRATA share a pathname),
// but useSearchParams needs a Suspense boundary to keep the shell
// prerenderable: this island syncs the query into the shell state.
function ShellSearchSync({ onSearch }: { onSearch: (search: string) => void }) {
  const params = useSearchParams();
  const search = params.toString();
  useEffect(() => {
    onSearch(search);
  }, [onSearch, search]);
  return null;
}

// Pages without a section stack (/admin, the standalone profile) have nobody
// to render the overlay chain: when the store is non-empty and no stack
// claimed the host role, the fallback host replaces the page. The host
// unmounts the page underneath (admin tabs reset on close) — accepted.
function ShellOverlayBody({ children }: { children: ReactNode }) {
  const layers = useOverlayLayers();
  const hostClaimed = useOverlayHostClaimed();
  // The focus return lives on the always-mounted body: a fallback host
  // unmounts together with its last layer, so its own effect would never run
  // for the closing commit.
  useOverlayFocusReturn(layers);
  if (layers.length > 0 && !hostClaimed) return <OverlayHost />;
  return <>{children}</>;
}

export function DosShell({
  children,
  overlay,
  session,
  logoff,
  addons,
  landing,
  commandAvailability,
}: DosShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === HOME_PATH;
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const jarEvents = useJarEvents();
  const coins = jarEvents.length;
  const [searchAvailable, setSearchAvailable] = useState(false);
  const overlayLayers = useOverlayLayers();

  const isMobile = useIsMobile();
  const screensaverPrefs = useScreensaverPrefs((state) => state.prefs);
  const hydrateScreensaverPrefs = useScreensaverPrefs((state) => state.hydrate);
  const screensaverOn = useIdleScreensaver(
    screensaverDelayMsForPrefs(screensaverPrefs),
    screensaverPrefs.enabled,
  );
  const signedIn = session !== null;
  // Opening the site without a destination lands members on FORUM; guests
  // start at the default document (ABOUT). Mount-only: opening a document
  // in-app also shows "/", and must never bounce to the forum.
  const coldOpened = useRef(false);
  useEffect(() => {
    if (coldOpened.current) return;
    coldOpened.current = true;
    if (signedIn && pathname === HOME_PATH) router.replace(FORUM_PATH);
  }, [signedIn, pathname, router]);
  // The landing window replaces the old welcome dialog. Guests opening
  // the home route see it once per load; members only on demand through
  // WELCOME (they never land on home cold). Neither a logon nor a logoff
  // mid-session turns it back on. A deep link into an inner route must not
  // greet when home opens later.
  const [landingEligible, setLandingEligible] = useState(() => !signedIn && pathname === HOME_PATH);
  const [landingManual, setLandingManual] = useState(false);
  const landingOpen =
    landing !== undefined && isHome && landingEligible && (!signedIn || landingManual);
  const closeLanding = useCallback(() => {
    setLandingEligible(false);
    setLandingManual(false);
    focusPanelBody();
  }, []);

  const openDialog = useCallback((next: DialogState) => setDialog(next), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const addCoin = useCallback((raw: string) => recordBadCommand(raw), []);
  // The push is a transition, so the shell can tell when the route has arrived:
  // the file manager hands the keyboard to the right panel exactly then.
  const [isNavigating, startNavigation] = useTransition();
  const panelFocusTarget = useRef<string | null>(null);
  // Query-only navigations (FORUM <-> ERRATA) keep the pathname: the search
  // arrives through the sync island below.
  const [search, setSearch] = useState("");
  const syncSearch = useCallback((value: string) => setSearch(value), []);
  const location = joinLocation(pathname, search);

  const push = useCallback(
    (href: string) => {
      startNavigation(() => router.push(href));
    },
    [router, startNavigation],
  );

  // WELCOME rings the landing window back: from home it opens in place,
  // from elsewhere the shell lands home first and greets on arrival.
  // Manual reopening works for members too; the unprompted greeting stays
  // a guest privilege.
  const reopenLanding = useCallback(() => {
    if (!isHome) push(HOME_PATH);
    setLandingEligible(true);
    setLandingManual(true);
  }, [isHome, push]);

  const commandList = useMemo(
    () => visibleCommands(session, commandAvailability),
    [session, commandAvailability],
  );
  const groups = useMemo(
    () => fileGroupsFor(session, commandAvailability),
    [session, commandAvailability],
  );
  const searchable =
    isSearchablePath(pathname) &&
    searchAvailable &&
    overlayLayers.length === 0 &&
    !isNavigating &&
    dialog === null &&
    !screensaverOn;
  const functionKeys = useMemo(() => keyDefsFor(session, { searchable }), [session, searchable]);
  const focusSearch = useCallback(() => {
    if (searchable) document.getElementById(SEARCH_FIELD_ID)?.focus();
  }, [searchable]);
  const {
    tray: trayAddons,
    fileIcons,
    jarRows,
  } = useMemo(() => resolveShellAddons(addons), [addons]);

  const openJar = useCallback(() => {
    openDialog({
      title: messages.shell.dialogs.jar.title,
      body: (
        <JarDialogBody
          events={jarSnapshot()}
          rows={jarRows.map(({ id, node }) => (
            <Fragment key={id}>{node}</Fragment>
          ))}
          onOpenErrata={() => {
            closeDialog();
            push(ERRATA_HREF);
          }}
          onOpenBugs={() => {
            closeDialog();
            push(BUG_TICKETS_HREF);
          }}
        />
      ),
    });
  }, [closeDialog, jarRows, openDialog, push]);

  // The file manager runs commands through the runner (to run LOGOFF the
  // runner needs no file manager state): the ref breaks the cycle.
  const runRef = useRef<(commandId: CommandId) => void>(() => {});

  // Opening a program (EXE route) hands the keyboard to the right panel; docs
  // keep it in the list and dialogs take focus themselves. A route that is
  // already open focuses right away, the rest wait for the route to settle.
  // The focus target is the pathname part: query entries (ERRATA) share it.
  // LOGON carries the current location (?next=): a logon started on a page
  // lands back there, a direct /login visit falls back to FORUM.
  const runFromNavigation = useCallback(
    (commandId: CommandId) => {
      const command = commandById.get(commandId);
      const href = commandId === "LOGON" && command?.href ? loginHref(location) : command?.href;
      if (href) {
        const target = stripQuery(href);
        // Re-pushing the same location can replace its RSC panel and lose
        // the focus just handed to it. A repeated shortcut only focuses —
        // except documents, which never take the keyboard out of the file
        // list (see "keeps the keyboard in the list when a doc opens").
        if (href === location) {
          if (!command?.doc) focusPanelBody();
          return;
        }
        // Documents navigate like sections but keep the keyboard in the file
        // list.
        if (!command?.doc) panelFocusTarget.current = target;
      }
      runRef.current(commandId);
    },
    [location],
  );

  const fileManager = useFileManager({
    isMobile,
    pathname,
    search,
    signedIn,
    groups,
    fileIcons,
    onCommand: runFromNavigation,
  });

  useEffect(() => {
    const target = panelFocusTarget.current;
    if (isNavigating || target === null) return;
    panelFocusTarget.current = null;
    if (pathname !== target) return;
    // The route can commit a Suspense placeholder before its island streams
    // in: the body focused now belongs to the placeholder and is replaced.
    return keepPanelBodyFocus(target);
  }, [isNavigating, pathname]);

  const handleLogoff = useCallback(() => {
    setLandingEligible(false);
    // The session cookie dies in the action; the push alone may serve the
    // member shell from the router cache (the root layout holds the session
    // prop), so refresh behind it like the logon forms do.
    void logoff().then(() => {
      router.push(HOME_PATH);
      router.refresh();
    });
  }, [logoff, router]);

  const run = useCommandRunner({
    openDialog,
    closeDialog,
    addCoin,
    coins,
    logoff: handleLogoff,
    push,
    reopenLanding,
    commands: commandList,
    groups,
    focusSearch,
  });

  // Every command goes through the runner, except LOGON: it remembers the
  // current location (?next=), so a logon started on a page lands back there
  // after success. The runner itself stays location-free.
  const runCommand = useCallback(
    (raw: string) => {
      if (resolveCommand(commandList, raw)?.id === "LOGON") {
        push(loginHref(location));
        return;
      }
      run(raw);
    },
    [commandList, location, push, run],
  );

  // Features cannot mount their own modals: they ask the shell to run one. The
  // guest prompt is the shared form of that (the board's gated actions).
  const shellDialogs = useMemo<ShellDialogs>(
    () => ({
      open: openDialog,
      close: closeDialog,
      requestLogin: () =>
        openDialog({
          title: messages.shell.dialogs.login.title,
          body: (
            <LoginPromptBody
              onLogon={() => {
                closeDialog();
                runCommand("LOGON");
              }}
              onCancel={closeDialog}
            />
          ),
        }),
    }),
    [closeDialog, openDialog, runCommand],
  );

  useEffect(() => {
    runRef.current = runCommand;
  }, [runCommand]);

  useEffect(() => {
    hydrateScreensaverPrefs();
  }, [hydrateScreensaverPrefs]);

  const controlsEnabled = dialog === null && !screensaverOn && !landingOpen;
  useFunctionKeys(functionKeys, runFromNavigation, controlsEnabled);
  usePanelNav(controlsEnabled);
  useFileCursorKeys({
    enabled: controlsEnabled,
    cursorId: fileManager.cursorId,
    collapsedGroups: fileManager.collapsedGroups,
    moveCursor: fileManager.moveCursor,
    toggleGroup: fileManager.toggleGroup,
    activate: fileManager.activateSelection,
  });

  const commandToFKey = useMemo(
    () => new Map(functionKeys.map((def) => [def.command, def.key])),
    [functionKeys],
  );

  const menus = useMemo(
    () =>
      menuDefsFor(session, commandAvailability).map((menu) => ({
        id: menu.id,
        label: menu.label,
        entries: menu.entries.map((entry) => ({
          id: `${menu.id}-${entry.command}`,
          label: entry.label,
          hint: commandToFKey.get(entry.command),
          onSelect: () => runCommand(entry.command),
        })),
      })),
    [commandAvailability, runCommand, session, commandToFKey],
  );

  const keyItems = useMemo(
    () =>
      functionKeys.map((def) => ({
        key: def.key,
        label: def.label,
        disabled: def.disabled || !controlsEnabled,
        onSelect: () => runFromNavigation(def.command),
      })),
    [controlsEnabled, functionKeys, runFromNavigation],
  );

  return (
    <Stack as="main" align="center" justify="center" className={styles.stage}>
      <div className={styles.shell} inert={landingOpen || undefined}>
        <div className={styles.topRow}>
          <MenuBar menus={menus} className={styles.menuBar} />
          <button
            type="button"
            onClick={openJar}
            aria-label={messages.shell.dialogs.jar.brandLabel}
            className={styles.brandButton}
          >
            <Sprite name="jar" cell={2} decorative />
            <Text as="span" className={styles.brandName}>
              {messages.shell.brand.name}{" "}
              <Text as="span" role="danger">
                {messages.shell.brand.version}
              </Text>
            </Text>
          </button>
        </div>

        <FileManagerProvider value={fileManager}>
          <Suspense fallback={null}>
            <ShellSearchSync onSearch={syncSearch} />
          </Suspense>
          <Stack direction={isMobile ? "column" : "row"} gap={0} className={styles.panels}>
            <FileManagerPanel
              isMobile={isMobile}
              listSize={fileManager.listSize}
              onCycleSize={fileManager.cycleSize}
              columns={fileManager.columns}
              rows={fileManager.rows}
              dirCount={fileManager.dirCount}
              fileCount={fileManager.fileCount}
            />
            <ShellControlsProvider enabled={controlsEnabled}>
              <SearchAvailabilityProvider onChange={setSearchAvailable}>
                <SessionProvider session={session}>
                  <ShellDialogsProvider dialogs={shellDialogs}>
                    <Fragment key="overlay">{overlay}</Fragment>
                    <OverlayDocumentTitle />
                    <ShellOverlayBody>{children}</ShellOverlayBody>
                  </ShellDialogsProvider>
                </SessionProvider>
              </SearchAvailabilityProvider>
            </ShellControlsProvider>
          </Stack>
        </FileManagerProvider>

        <CmdLine
          commands={commandList}
          onSubmit={runCommand}
          onSubmitEmpty={fileManager.activateSelection}
          onNavigate={fileManager.moveCursor}
          captureDisabled={dialog !== null || screensaverOn || landingOpen}
          ariaLabel={messages.shell.cmdLine.ariaLabel}
          zone={CMD_ZONE}
        />
        <KeyBar
          items={keyItems}
          ariaLabel={messages.shell.keyBar.ariaLabel}
          scrollTrailingIntoView={isMobile}
          trailing={
            <>
              {trayAddons.map(({ id, node }) => (
                <Fragment key={id}>{node}</Fragment>
              ))}
              <Text as="span">
                {session ? (session.username ?? session.user) : messages.shell.keyBar.guest}
              </Text>
              <KeyBarClock />
            </>
          }
        />
      </div>

      {landingOpen && landing ? (
        <div className={styles.landingOverlay}>
          <LandingCloseProvider close={closeLanding}>{landing}</LandingCloseProvider>
        </div>
      ) : null}

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog?.title ?? ""}
        tone={dialog?.tone}
        closeLabel={messages.shell.window.closeLabel}
        className={dialog?.wide ? dialogsStyles.wide : undefined}
      >
        {dialog?.body}
      </Dialog>

      <Screensaver
        active={screensaverOn}
        title={messages.shell.screensaver.title}
        hint={messages.shell.screensaver.hint}
      />
    </Stack>
  );
}

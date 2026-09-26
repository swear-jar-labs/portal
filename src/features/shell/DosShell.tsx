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
  cx,
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
  fileGroupsFor,
  FORUM_PATH,
  HOME_PATH,
  joinLocation,
  keyDefsFor,
  loginHref,
  menuDefsFor,
  stripQuery,
  visibleCommands,
  type CommandId,
  type CommunityLevel,
} from "@/content/commands";
import { bootLines, welcome } from "@/content/landing";
import { messages } from "@/content/messages";
import { screensaverDelayMsForPrefs, useScreensaverPrefs } from "./screensaver-prefs";
import { BootScreen } from "./BootScreen";
import { KeyBarClock } from "./KeyBarClock";
import { LoginPromptBody, WelcomeBody } from "./dialogs";
import { useBootState } from "./hooks/useBootState";
import { useFunctionKeys } from "./hooks/useFunctionKeys";
import { useIdleScreensaver } from "./hooks/useIdleScreensaver";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePanelNav } from "./hooks/usePanelNav";
import { useWelcomeDialog } from "./hooks/useWelcomeDialog";
import { useCommandRunner, type DialogState } from "./useCommandRunner";
import { CMD_ZONE } from "./zones";
import { SessionProvider } from "./SessionContext";
import { ShellDialogsProvider, type ShellDialogs } from "./ShellDialogs";
import { OverlayHost } from "./OverlayHost";
import { OverlayDocumentTitle, useOverlayFocusReturn } from "./OverlayLayers";
import { useOverlayHostClaimed, useOverlayLayers } from "./overlay-store";
import { ShellControlsProvider } from "./ShellControls";
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

export function DosShell({ children, overlay, session, logoff, addons }: DosShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === HOME_PATH;
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [coins, setCoins] = useState(0);

  const isMobile = useIsMobile();
  // The boot screen and the welcome dialog belong to the home route only.
  const { phase, revealed, bootFired } = useBootState(isHome, bootLines.length);
  const booted = phase === "ready";
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
  // Welcome is a boot-time greeting: guests see it once per load, and neither a
  // logon nor a logoff mid-session turns it back on.
  const [welcomeEligible, setWelcomeEligible] = useState(() => !signedIn);

  const openDialog = useCallback((next: DialogState) => setDialog(next), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const addCoin = useCallback(() => setCoins((value) => value + 1), []);
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
  const goHome = useCallback(() => {
    if (!isHome) push(HOME_PATH);
  }, [isHome, push]);

  const commandList = useMemo(() => visibleCommands(session), [session]);
  const groups = useMemo(() => fileGroupsFor(session), [session]);
  const functionKeys = useMemo(() => keyDefsFor(session), [session]);
  const { tray: trayAddons, fileIcons } = useMemo(() => resolveShellAddons(addons), [addons]);

  // The runner needs the file manager (to open docs) and the file manager needs
  // the runner (to run LOGOFF): the ref breaks the cycle.
  const runRef = useRef<(commandId: CommandId) => void>(() => {});

  // Opening a program (EXE route) hands the keyboard to the right panel; docs
  // keep it in the list and dialogs take focus themselves. A route that is
  // already open focuses right away, the rest wait for the route to settle.
  // The focus target is the pathname part: query entries (ERRATA) share it.
  // LOGON carries the current location (?next=): a logon started on a page
  // lands back there, a direct /login visit falls back to FORUM.
  const runFromFiles = useCallback(
    (commandId: CommandId) => {
      const command = commandById.get(commandId);
      const href = commandId === "LOGON" && command?.href ? loginHref(location) : command?.href;
      if (href) {
        const target = stripQuery(href);
        if (target === pathname) focusPanelBody();
        else panelFocusTarget.current = target;
      }
      runRef.current(commandId);
    },
    [location, pathname],
  );

  const fileManager = useFileManager({
    isMobile,
    pathname,
    search,
    signedIn,
    onDocumentOpened: goHome,
    groups,
    fileIcons,
    onCommand: runFromFiles,
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
    setWelcomeEligible(false);
    void logoff().then(() => router.push(HOME_PATH));
  }, [logoff, router]);

  const run = useCommandRunner({
    openDialog,
    closeDialog,
    addCoin,
    coins,
    openDocument: fileManager.openCommand,
    clearDocument: fileManager.closeDoc,
    logoff: handleLogoff,
    push,
    commands: commandList,
    groups,
    signedIn,
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

  const controlsEnabled = booted && dialog === null && !screensaverOn;
  useFunctionKeys(functionKeys, runCommand, controlsEnabled);
  usePanelNav(controlsEnabled);
  useFileCursorKeys({
    enabled: controlsEnabled,
    cursorId: fileManager.cursorId,
    collapsedGroups: fileManager.collapsedGroups,
    moveCursor: fileManager.moveCursor,
    toggleGroup: fileManager.toggleGroup,
    activate: fileManager.activateSelection,
  });

  const openWelcome = useCallback(() => {
    openDialog({
      title: welcome.title,
      body: (
        <WelcomeBody
          onExplore={() => {
            closeDialog();
            runFromFiles("FORUM");
          }}
          onHow={() => {
            closeDialog();
            runFromFiles("HOW");
          }}
        />
      ),
    });
  }, [closeDialog, openDialog, runFromFiles]);
  // Welcome belongs to the boot: without a boot (deep link into an inner
  // route) entering home must not greet the guest out of nowhere.
  useWelcomeDialog(isHome && booted && bootFired && !signedIn && welcomeEligible, openWelcome);

  const menus = useMemo(
    () =>
      menuDefsFor(session).map((menu) => ({
        id: menu.id,
        label: menu.label,
        entries: menu.entries.map((entry) =>
          entry.kind === "separator"
            ? { kind: "separator" as const }
            : {
                kind: "item" as const,
                id: `${menu.id}-${entry.command}`,
                label: entry.label,
                onSelect: () => runCommand(entry.command),
              },
        ),
      })),
    [runCommand, session],
  );

  const keyItems = useMemo(
    () =>
      functionKeys.map((def) => ({
        key: def.key,
        label: def.label,
        onSelect: () => runCommand(def.command),
      })),
    [functionKeys, runCommand],
  );

  if (!booted) {
    return <BootScreen revealed={revealed} closing={phase === "closing"} />;
  }

  return (
    <Stack as="main" align="center" justify="center" className={styles.stage}>
      {/* The CRT switch-on belongs to the boot: routes without it open plainly. */}
      <div className={cx(styles.shell, bootFired && styles.boot)}>
        <MenuBar
          menus={menus}
          brand={
            <>
              <Sprite name="jar" cell={2} decorative />
              <Text as="span" className={styles.brandName}>
                {messages.shell.brand.name}{" "}
                <Text as="span" role="danger">
                  {messages.shell.brand.version}
                </Text>
              </Text>
            </>
          }
        />

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
              <SessionProvider session={session}>
                <ShellDialogsProvider dialogs={shellDialogs}>
                  <Fragment key="overlay">{overlay}</Fragment>
                  <OverlayDocumentTitle />
                  <ShellOverlayBody>{children}</ShellOverlayBody>
                </ShellDialogsProvider>
              </SessionProvider>
            </ShellControlsProvider>
          </Stack>
        </FileManagerProvider>

        <CmdLine
          commands={commandList}
          onSubmit={runCommand}
          onSubmitEmpty={fileManager.activateSelection}
          onNavigate={fileManager.moveCursor}
          captureDisabled={dialog !== null || screensaverOn}
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

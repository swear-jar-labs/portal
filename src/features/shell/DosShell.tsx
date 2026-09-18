"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CmdLine,
  cx,
  Dialog,
  KeyBar,
  MenuBar,
  Screensaver,
  Sprite,
  Stack,
  Text,
} from "@swearjar/dos";
import {
  commandById,
  fileGroupsFor,
  HOME_PATH,
  keyDefsFor,
  menuDefsFor,
  visibleCommands,
  type CommandId,
} from "@/content/commands";
import { bootLines, welcome } from "@/content/landing";
import { messages } from "@/content/messages";
import { screensaverDelayMsForPrefs, useScreensaverPrefs } from "./screensaver-prefs";
import { BootScreen } from "./BootScreen";
import { KeyBarClock } from "./KeyBarClock";
import { WelcomeBody } from "./dialogs";
import { useBootState } from "./hooks/useBootState";
import { useFunctionKeys } from "./hooks/useFunctionKeys";
import { useIdleScreensaver } from "./hooks/useIdleScreensaver";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePanelNav } from "./hooks/usePanelNav";
import { useWelcomeDialog } from "./hooks/useWelcomeDialog";
import { useCommandRunner, type DialogState } from "./useCommandRunner";
import { CMD_ZONE } from "./zones";
import { ShellControlsProvider } from "./ShellControls";
import { FileManagerProvider } from "./FileManager/FileManagerContext";
import { FileManagerPanel } from "./FileManager/FileManagerPanel";
import { useFileCursorKeys } from "./FileManager/useFileCursorKeys";
import { useFileManager } from "./FileManager/useFileManager";
import { focusPanelBody, keepPanelBodyFocus } from "./panel-focus";
import dialogsStyles from "./dialogs.module.css";
import styles from "./DosShell.module.css";

// The shell knows nothing about auth: any session-shaped value with a user
// works, and logoff is injected by the layout (mock action until auth lands).
export type ShellSession = { user: string } | null;

export type DosShellProps = {
  children: ReactNode;
  session: ShellSession;
  logoff: () => Promise<void>;
};

export function DosShell({ children, session, logoff }: DosShellProps) {
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

  const push = useCallback(
    (href: string) => {
      startNavigation(() => router.push(href));
    },
    [router, startNavigation],
  );
  const goHome = useCallback(() => {
    if (!isHome) push(HOME_PATH);
  }, [isHome, push]);

  const commandList = useMemo(() => visibleCommands(signedIn), [signedIn]);
  const groups = useMemo(() => fileGroupsFor(signedIn), [signedIn]);
  const functionKeys = useMemo(() => keyDefsFor(signedIn), [signedIn]);

  // The runner needs the file manager (to open docs) and the file manager needs
  // the runner (to run LOGOFF): the ref breaks the cycle.
  const runRef = useRef<(commandId: CommandId) => void>(() => {});

  // Opening a program (EXE route) hands the keyboard to the right panel; docs
  // keep it in the list and dialogs take focus themselves. A route that is
  // already open focuses right away, the rest wait for the route to settle.
  const runFromFiles = useCallback(
    (commandId: CommandId) => {
      const href = commandById.get(commandId)?.href;
      if (href) {
        if (href === pathname) focusPanelBody();
        else panelFocusTarget.current = href;
      }
      runRef.current(commandId);
    },
    [pathname],
  );

  const fileManager = useFileManager({
    isMobile,
    pathname,
    signedIn,
    onDocumentOpened: goHome,
    groups,
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

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    hydrateScreensaverPrefs();
  }, [hydrateScreensaverPrefs]);

  const controlsEnabled = booted && dialog === null && !screensaverOn;
  useFunctionKeys(functionKeys, run, controlsEnabled);
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
    openDialog({ title: welcome.title, body: <WelcomeBody /> });
  }, [openDialog]);
  // Welcome belongs to the boot: without a boot (deep link into an inner
  // route) entering home must not greet the guest out of nowhere.
  useWelcomeDialog(isHome && booted && bootFired && !signedIn && welcomeEligible, openWelcome);

  const menus = useMemo(
    () =>
      menuDefsFor(signedIn).map((menu) => ({
        id: menu.id,
        label: menu.label,
        entries: menu.entries.map((entry) =>
          entry.kind === "separator"
            ? { kind: "separator" as const }
            : {
                kind: "item" as const,
                id: `${menu.id}-${entry.command}`,
                label: entry.label,
                onSelect: () => run(entry.command),
              },
        ),
      })),
    [run, signedIn],
  );

  const keyItems = useMemo(
    () =>
      functionKeys.map((def) => ({
        key: def.key,
        label: def.label,
        onSelect: () => run(def.command),
      })),
    [functionKeys, run],
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
            <ShellControlsProvider enabled={controlsEnabled}>{children}</ShellControlsProvider>
          </Stack>
        </FileManagerProvider>

        <CmdLine
          commands={commandList}
          onSubmit={run}
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
              <Text as="span">{session ? session.user : messages.shell.keyBar.guest}</Text>
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

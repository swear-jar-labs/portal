"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CmdLine,
  Crt,
  Dialog,
  KeyBar,
  MenuBar,
  Screensaver,
  Sprite,
  Stack,
  StatusBar,
  Text,
  cx,
} from "@swearjar/dos";
import {
  fileGroupsFor,
  HOME_PATH,
  keyDefsFor,
  menuDefsFor,
  visibleCommands,
  type CommandId,
} from "@/content/commands";
import { bootLines, welcome } from "@/content/landing";
import { messages, pluralForms } from "@/content/messages";
import { formatCount } from "@/lib/format";
import { screensaverDelayMsForPrefs, useScreensaverPrefs } from "./screensaver-prefs";
import { BootScreen } from "./BootScreen";
import { StatusClock } from "./StatusClock";
import { WelcomeBody } from "./dialogs";
import { useBootState } from "./hooks/useBootState";
import { useFunctionKeys } from "./hooks/useFunctionKeys";
import { useIdleScreensaver } from "./hooks/useIdleScreensaver";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePanelNav } from "./hooks/usePanelNav";
import { useWelcomeDialog } from "./hooks/useWelcomeDialog";
import { useCommandRunner, type DialogState } from "./useCommandRunner";
import { CMD_ZONE } from "./zones";
import { FileManagerProvider } from "./FileManager/FileManagerContext";
import { FileManagerPanel } from "./FileManager/FileManagerPanel";
import { useFileCursorKeys } from "./FileManager/useFileCursorKeys";
import { useFileManager } from "./FileManager/useFileManager";
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
  const push = useCallback((href: string) => router.push(href), [router]);
  const goHome = useCallback(() => {
    if (!isHome) router.push(HOME_PATH);
  }, [isHome, router]);

  const commandList = useMemo(() => visibleCommands(signedIn), [signedIn]);
  const groups = useMemo(() => fileGroupsFor(signedIn), [signedIn]);
  const functionKeys = useMemo(() => keyDefsFor(signedIn), [signedIn]);

  // The runner needs the file manager (to open docs) and the file manager needs
  // the runner (to run LOGOFF): the ref breaks the cycle.
  const runRef = useRef<(commandId: CommandId) => void>(() => {});
  const onCommand = useCallback((commandId: CommandId) => runRef.current(commandId), []);
  const fileManager = useFileManager({
    isMobile,
    pathname,
    signedIn,
    onDocumentOpened: goHome,
    groups,
    onCommand,
  });

  const handleLogoff = useCallback(() => {
    setWelcomeEligible(false);
    void logoff().then(() => router.push(HOME_PATH));
  }, [logoff, router]);

  const run = useCommandRunner({
    openDialog,
    closeDialog,
    addCoin,
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
      <Crt boot={bootFired} className={styles.shell}>
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
            {children}
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
        <KeyBar items={keyItems} ariaLabel={messages.shell.keyBar.ariaLabel} />
        <StatusBar
          left={
            <Text key={coins} as="span" className={cx(styles.jar, coins > 0 && styles.flash)}>
              {`${messages.shell.statusBar.jar}: ${formatCount(coins, pluralForms.coin)}`}
            </Text>
          }
          right={
            <>
              <Text as="span">{session ? session.user : messages.shell.statusBar.guest}</Text>
              <StatusClock />
            </>
          }
        />
      </Crt>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog?.title ?? ""}
        tone={dialog?.tone}
        surface={dialog?.surface}
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

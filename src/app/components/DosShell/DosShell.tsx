"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
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
import { commands, keyDefs, menuDefs } from "@/content/commands";
import { bootLines, welcome } from "@/content/landing";
import { messages, pluralForms } from "@/content/messages";
import { defaultScreensaver } from "@/content/settings";
import { formatCount } from "@/lib/format";
import { BootScreen } from "./BootScreen";
import { FileManagerProvider } from "./FileManagerContext";
import { FileManagerPanel } from "./FileManagerPanel";
import { WelcomeBody } from "./dialogs";
import { useBootState } from "./hooks/useBootState";
import { useClock } from "./hooks/useClock";
import { useFileCursorKeys } from "./hooks/useFileCursorKeys";
import { useFunctionKeys } from "./hooks/useFunctionKeys";
import { useIdleScreensaver } from "./hooks/useIdleScreensaver";
import { useIsMobile } from "./hooks/useIsMobile";
import { useWelcomeDialog } from "./hooks/useWelcomeDialog";
import { useCommandRunner, type DialogState } from "./useCommandRunner";
import { useFileManager } from "./useFileManager";
import styles from "./DosShell.module.css";

const CLOCK_INTERVAL_MS = 10_000;
const HOME_PATH = "/";

export type DosShellProps = {
  children: ReactNode;
};

export function DosShell({ children }: DosShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === HOME_PATH;
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [coins, setCoins] = useState(0);

  const isMobile = useIsMobile();
  // The boot screen and the welcome dialog belong to the home route only.
  const { phase, revealed } = useBootState(isHome, bootLines.length);
  const booted = phase === "ready";
  const screensaverOn = useIdleScreensaver(defaultScreensaver.delayMs, defaultScreensaver.enabled);

  const openDialog = useCallback((next: DialogState) => setDialog(next), []);
  const addCoin = useCallback(() => setCoins((value) => value + 1), []);
  const push = useCallback((href: string) => router.push(href), [router]);
  const goHome = useCallback(() => {
    if (!isHome) router.push(HOME_PATH);
  }, [isHome, router]);

  const fileManager = useFileManager(isMobile, goHome);

  const run = useCommandRunner({
    openDialog,
    addCoin,
    openDocument: fileManager.openCommand,
    clearDocument: fileManager.closeDoc,
    push,
  });

  const controlsEnabled = booted && dialog === null && !screensaverOn;
  useFunctionKeys(keyDefs, run, controlsEnabled);
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
  useWelcomeDialog(isHome && booted, openWelcome);

  const time = useClock(CLOCK_INTERVAL_MS);

  const menus = useMemo(
    () =>
      menuDefs.map((menu) => ({
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
    [run],
  );

  const keyItems = useMemo(
    () =>
      keyDefs.map((def) => ({
        key: def.key,
        label: def.label,
        onSelect: () => run(def.command),
      })),
    [run],
  );

  if (!booted) {
    return <BootScreen revealed={revealed} closing={phase === "closing"} />;
  }

  return (
    <Stack as="main" align="center" justify="center" className={styles.stage}>
      <Crt boot className={styles.shell}>
        <MenuBar
          menus={menus}
          brand={
            <>
              <Sprite name="jar" cell={2} decorative />
              <Text as="span">
                {messages.shell.brand.name}{" "}
                <Text as="span" tone="red">
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
          commands={commands}
          onSubmit={run}
          onSubmitEmpty={fileManager.activateSelection}
          onNavigate={fileManager.moveCursor}
          captureDisabled={dialog !== null || screensaverOn}
          ariaLabel={messages.shell.cmdLine.ariaLabel}
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
              <Text as="span">{messages.shell.statusBar.guest}</Text>
              <Text as="span">{time ?? messages.shell.statusBar.clockFallback}</Text>
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
        closeLabel={messages.shell.window.closeLabel}
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

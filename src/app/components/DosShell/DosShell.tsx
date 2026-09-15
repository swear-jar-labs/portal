"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CmdLine,
  Crt,
  Dialog,
  Heading,
  KeyBar,
  MenuBar,
  Panel,
  Screensaver,
  Sprite,
  Stack,
  StatusBar,
  Text,
  cx,
} from "@swearjar/dos";
import { commands, keyDefs, menuDefs } from "@/content/commands";
import { bootLines, docsById, welcome } from "@/content/landing";
import { defaultScreensaver, screensaverText } from "@/content/settings";
import { DocView } from "../DocView/DocView";
import { BootScreen } from "./BootScreen";
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
import { DOC_ZONE } from "./zones";
import styles from "./DosShell.module.css";

const CLOCK_INTERVAL_MS = 10_000;

export function DosShell() {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [coins, setCoins] = useState(0);

  const isMobile = useIsMobile();
  const { phase, revealed } = useBootState(bootLines.length);
  const booted = phase === "ready";
  const screensaverOn = useIdleScreensaver(defaultScreensaver.delayMs, defaultScreensaver.enabled);
  const fileManager = useFileManager(isMobile);

  const openDialog = useCallback((next: DialogState) => setDialog(next), []);
  const addCoin = useCallback(() => setCoins((value) => value + 1), []);
  const push = useCallback((href: string) => router.push(href), [router]);

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
  useWelcomeDialog(booted, openWelcome);

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

  const selectedDoc = fileManager.selectedDocId ? docsById[fileManager.selectedDocId] : undefined;

  return (
    <Stack as="main" align="center" justify="center" className={styles.stage}>
      <Crt boot className={styles.shell}>
        <MenuBar
          menus={menus}
          brand={
            <>
              <Sprite name="jar" cell={2} decorative />
              <Text as="span">
                SWEARJAR.DOS{" "}
                <Text as="span" tone="red">
                  v0.1
                </Text>
              </Text>
            </>
          }
        />

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

          <Panel
            title={selectedDoc ? selectedDoc.title : "C:\\"}
            zone={DOC_ZONE}
            className={cx(styles.panel, styles.panelRight)}
          >
            {selectedDoc ? (
              <DocView doc={selectedDoc} />
            ) : (
              <Stack gap={8}>
                <Heading level={1} className="sr-only">
                  SWEAR JAR LABS
                </Heading>
                <Text tone="dim">Screen cleared. Pick a file to read.</Text>
              </Stack>
            )}
          </Panel>
        </Stack>

        <CmdLine
          commands={commands}
          onSubmit={run}
          onSubmitEmpty={fileManager.activateSelection}
          onNavigate={fileManager.moveCursor}
          captureDisabled={dialog !== null || screensaverOn}
        />
        <KeyBar items={keyItems} />
        <StatusBar
          left={
            <Text key={coins} as="span" className={cx(styles.jar, coins > 0 && styles.flash)}>
              {`JAR: ${coins} ${coins === 1 ? "COIN" : "COINS"}`}
            </Text>
          }
          right={
            <>
              <Text as="span">GUEST</Text>
              <Text as="span">{time ?? "--:--"}</Text>
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
      >
        {dialog?.body}
      </Dialog>

      <Screensaver
        active={screensaverOn}
        title={screensaverText.title}
        hint={screensaverText.hint}
      />
    </Stack>
  );
}

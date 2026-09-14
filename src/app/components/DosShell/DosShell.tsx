"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CmdLine,
  Crt,
  Dialog,
  FileTable,
  Heading,
  KeyBar,
  MenuBar,
  Panel,
  Screensaver,
  Sprite,
  Stack,
  StatusBar,
  Text,
  buildHelp,
  cx,
  resolveCommand,
  type FileTableColumn,
  type FileTableItem,
} from "@swearjar/dos";
import {
  commands,
  fileGroups,
  keyDefs,
  menuDefs,
} from "@/content/commands";
import { bootLines, bootSkip, bootTitle, docsById, welcome } from "@/content/landing";
import { defaultScreensaver, screensaverText } from "@/content/settings";
import { formatSize, formatSummary } from "@/lib/format";
import { DocView } from "../DocView/DocView";
import styles from "./DosShell.module.css";

type DialogState = {
  title: string;
  tone?: "default" | "error";
  body: ReactNode;
};

const sizeOrder = ["peek", "compact", "full"] as const;
type FileListSize = (typeof sizeOrder)[number];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function CoffeeBody() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(100, value + 8)),
      180,
    );
    return () => window.clearInterval(timer);
  }, []);

  const filled = Math.round(progress / 5);

  return (
    <Stack gap={8}>
      <Text as="div">
        <Text as="span" tone="green">
          {"#".repeat(filled)}
        </Text>
        <Text as="span" tone="dim">
          {"-".repeat(20 - filled)}
        </Text>
        <Text as="span" tone="yellow">{` ${progress}%`}</Text>
      </Text>
      <Text as="div" tone="white">
        {progress >= 100 ? "The team is now 94% caffeinated." : "brewing by hand..."}
      </Text>
    </Stack>
  );
}

export function DosShell() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [booted, setBooted] = useState(false);
  const [bootVisible, setBootVisible] = useState(true);
  const [bootClosing, setBootClosing] = useState(false);
  const [bootRevealed, setBootRevealed] = useState(0);
  const [selectedDocId, setSelectedDocId] = useState<string | null>("ABOUT");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [coins, setCoins] = useState(0);
  const [flash, setFlash] = useState(false);
  const [listSize, setListSize] = useState<FileListSize>("compact");
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [screensaverOn, setScreensaverOn] = useState(false);
  const [cursorId, setCursorId] = useState("file-ABOUT");

  const welcomeShown = useRef(false);
  const screensaverOnRef = useRef(false);
  const focusCursor = useRef(false);
  const bootDone = useRef(false);

  const flatItems = useMemo(() => fileGroups.flatMap((group) => group.items), []);

  const finishBoot = useCallback(() => {
    if (bootDone.current) return;
    bootDone.current = true;
    setBootClosing(true);
    window.setTimeout(() => {
      setBootVisible(false);
      setBooted(true);
    }, 480);
  }, []);

  const openDialog = useCallback((next: DialogState) => {
    setDialog(next);
  }, []);

  const run = useCallback(
    (raw: string) => {
      const command = resolveCommand(commands, raw);

      if (!command) {
        setCoins((value) => value + 1);
        setFlash(true);
        window.setTimeout(() => setFlash(false), 700);
        openDialog({
          title: "ERROR",
          tone: "error",
          body: (
            <Stack gap={4}>
              <Text as="div" tone="red" weight="bold">
                Bad command or file name.
              </Text>
              <Text as="div" tone="yellow">
                The jar clinks. +1 coin.
              </Text>
              <Text as="div" tone="dim">
                Try HELP.
              </Text>
            </Stack>
          ),
        });
        return;
      }

      if (command.id === "HELP") {
        openDialog({
          title: "HELP",
          body: <Text as="div">{buildHelp(commands)}</Text>,
        });
        return;
      }

      if (command.id === "DIR") {
        openDialog({
          title: "DIR",
          body: (
            <Stack gap={2}>
              {flatItems.map((item) => (
                <Text key={item.command} as="div" tone="green">
                  {`  ${item.name}.${item.ext}`}
                </Text>
              ))}
            </Stack>
          ),
        });
        return;
      }

      if (command.id === "CLS") {
        setSelectedDocId(null);
        return;
      }

      if (command.id === "COFFEE") {
        openDialog({ title: "COFFEE.EXE", body: <CoffeeBody /> });
        return;
      }

      if (command.id === "DOOM") {
        openDialog({
          title: "DOOM.EXE",
          body: (
            <Stack gap={4}>
              <Text as="div">
                This is the only OS DOOM has not been ported to yet.
              </Text>
              <Text as="div" tone="yellow">
                But if you wish, you can take this on — APPLY.
              </Text>
            </Stack>
          ),
        });
        return;
      }

      if (command.id === "EXIT") {
        openDialog({
          title: "EXIT",
          body: (
            <Stack gap={4}>
              <Text as="div" tone="red">
                There is no exit, as there is no logon.
              </Text>
              <Text as="div" tone="dim">
                Type LOGON to sign in.
              </Text>
            </Stack>
          ),
        });
        return;
      }

      if (command.doc) {
        setSelectedDocId(command.doc);
        setCursorId(`file-${command.doc}`);
        if (isMobile) setListSize("compact");
        return;
      }

      if (command.href) {
        router.push(command.href);
      }
    },
    [flatItems, isMobile, openDialog, router],
  );

  const openWelcome = useCallback(() => {
    openDialog({
      title: welcome.title,
      body: (
        <Stack direction="row" align="start" gap={18} wrap>
          <Sprite name="jar" cell={4} decorative />
          <Stack gap={6}>
            <Heading level={2} tone="yellow">
              {welcome.heading}
            </Heading>
            <Text>{welcome.intro}</Text>
            {welcome.lines.map((line) => (
              <Text key={line}>
                <Text as="span" tone="green">{"> "}</Text>
                {line}
              </Text>
            ))}
            <Text tone="dim">{welcome.footer}</Text>
          </Stack>
        </Stack>
      ),
    });
  }, [openDialog]);

  useEffect(() => {
    if (!bootVisible) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const steps = bootLines.length + 1;
    const timers: number[] = [];

    if (reduced) {
      timers.push(window.setTimeout(() => setBootRevealed(steps), 0));
      timers.push(window.setTimeout(finishBoot, 1200));
    } else {
      let delay = 250;
      for (let index = 0; index < steps; index += 1) {
        timers.push(window.setTimeout(() => setBootRevealed(index + 1), delay));
        delay += index === 2 || index === 5 ? 500 : 250;
      }
      timers.push(window.setTimeout(finishBoot, delay + 700));
    }
    timers.push(window.setTimeout(finishBoot, 8000));

    const skip = () => finishBoot();
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("click", skip, { once: true });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("keydown", skip);
      window.removeEventListener("click", skip);
    };
  }, [bootVisible, finishBoot]);

  useEffect(() => {
    if (!booted || welcomeShown.current) return;
    const timer = window.setTimeout(() => {
      if (welcomeShown.current) return;
      welcomeShown.current = true;
      openWelcome();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [booted, openWelcome]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes(),
        ).padStart(2, "0")}`,
      );
    };
    update();
    const timer = window.setInterval(update, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const match = /^F([1-9]|10)$/.exec(event.key);
      if (!match) return;
      event.preventDefault();
      const def = keyDefs[Number(match[1]) - 1];
      if (def) run(def.command);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [run]);

  useEffect(() => {
    screensaverOnRef.current = screensaverOn;
  }, [screensaverOn]);

  useEffect(() => {
    if (!defaultScreensaver.enabled) return;

    const delay = defaultScreensaver.delayMinutes * 60_000;
    const events = [
      "keydown",
      "pointerdown",
      "pointermove",
      "wheel",
      "touchstart",
    ] as const;

    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScreensaverOn(true), delay);
    };

    const onActivity = (event: Event) => {
      if (screensaverOnRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setScreensaverOn(false);
      }
      arm();
    };

    arm();
    for (const name of events) {
      window.addEventListener(name, onActivity, { capture: true, passive: false });
    }

    return () => {
      window.clearTimeout(timer);
      for (const name of events) {
        window.removeEventListener(name, onActivity, { capture: true });
      }
    };
  }, []);

  const rowIds = useMemo(() => {
    const ids: string[] = [];
    for (const group of fileGroups) {
      ids.push(`dir-${group.id}`);
      if (!collapsedGroups.includes(group.id)) {
        for (const item of group.items) ids.push(`file-${item.command}`);
      }
    }
    return ids;
  }, [collapsedGroups]);

  const moveCursor = useCallback(
    (direction: "up" | "down") => {
      const step = direction === "down" ? 1 : -1;
      const current = rowIds.indexOf(cursorId);
      const start = current === -1 ? 0 : current;
      const next = (start + step + rowIds.length) % rowIds.length;
      focusCursor.current = true;
      setCursorId(rowIds[next]);
    },
    [cursorId, rowIds],
  );

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((groups) =>
      groups.includes(id)
        ? groups.filter((group) => group !== id)
        : [...groups, id],
    );
  }, []);

  const activateSelection = useCallback(() => {
    document.getElementById(cursorId)?.click();
  }, [cursorId]);

  useEffect(() => {
    if (!focusCursor.current) return;
    focusCursor.current = false;
    const element = document.getElementById(cursorId);
    element?.focus();
    element?.scrollIntoView({ block: "nearest" });
  }, [cursorId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || dialog) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [role='menubar'], [role='menu']",
        )
      ) {
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        moveCursor(event.key === "ArrowUp" ? "up" : "down");
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (cursorId.startsWith("dir-")) {
          const groupId = cursorId.slice(4);
          const collapsed = collapsedGroups.includes(groupId);
          if (event.key === "ArrowRight" && collapsed) {
            event.preventDefault();
            toggleGroup(groupId);
          } else if (event.key === "ArrowLeft" && !collapsed) {
            event.preventDefault();
            toggleGroup(groupId);
          }
          return;
        }
        if (event.key === "ArrowRight") {
          const element = document.getElementById(cursorId);
          if (!element) return;
          event.preventDefault();
          element.click();
        }
        return;
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        document.activeElement === document.body
      ) {
        const element = document.getElementById(cursorId);
        if (!element) return;
        event.preventDefault();
        element.click();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsedGroups, cursorId, dialog, moveCursor, toggleGroup]);

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

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const onChange = () => {
      if (!query.matches) setListSize("compact");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const fileColumns: FileTableColumn[] = [
    { id: "name", label: "NAME" },
    { id: "type", label: "TYPE", width: "6ch" },
    { id: "size", label: "SIZE", width: "6ch", align: "right" },
  ];

  const fileRows = useMemo(() => {
    const rows: FileTableItem[] = [];
    for (const group of fileGroups) {
      const collapsed = collapsedGroups.includes(group.id);
      const dirId = `dir-${group.id}`;
      rows.push({
        id: dirId,
        name: group.short,
        type: "DIR",
        kind: "dir",
        expanded: !collapsed,
        selected: cursorId === dirId,
        onActivate: () => {
          setCursorId(dirId);
          toggleGroup(group.id);
        },
      });

      if (collapsed) continue;

      for (const item of group.items) {
        const rowId = `file-${item.command}`;
        const opened = item.command === selectedDocId;

        if (item.ext === "EXE") {
          const target = resolveCommand(commands, item.command);
          rows.push({
            id: rowId,
            name: item.name,
            type: item.ext,
            size: formatSize(item.size),
            kind: "exe",
            selected: cursorId === rowId,
            href: target?.href ?? "#",
            onActivate: () => setCursorId(rowId),
          });
        } else {
          rows.push({
            id: rowId,
            name: item.name,
            type: item.ext,
            size: formatSize(item.size),
            kind: "file",
            selected: cursorId === rowId,
            current: opened,
            onActivate: () => {
              setCursorId(rowId);
              run(item.command);
            },
          });
        }
      }
    }
    return rows;
  }, [collapsedGroups, cursorId, run, selectedDocId, toggleGroup]);

  const dirCount = fileGroups.length;
  const fileCount = fileGroups.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  const cycleSize = useCallback((direction: 1 | -1) => {
    setListSize((current) => {
      const index = sizeOrder.indexOf(current);
      return sizeOrder[(index + direction + sizeOrder.length) % sizeOrder.length];
    });
  }, []);

  if (!booted) {
    return (
      <Stack
        as="main"
        align="center"
        justify="center"
        className={cx(styles.bootScreen, bootClosing && styles.bootDone)}
      >
        <Stack gap={0}>
          <Text as="div" className={styles.bootTitle}>
            {bootTitle}
          </Text>
          {bootLines.map((line, index) => (
            <Text
              key={line.id}
              as="div"
              className={cx(styles.bootLine, bootRevealed > index && styles.bootLineShown)}
            >
              {line.text}
              {line.status ? (
                <>
                  {" "}
                  <Text as="span" tone={line.status.tone}>
                    {line.status.text}
                  </Text>
                </>
              ) : null}
            </Text>
          ))}
          <Text
            as="div"
            className={cx(styles.bootSkip, bootRevealed > bootLines.length && styles.bootLineShown)}
          >
            {bootSkip}
          </Text>
        </Stack>
      </Stack>
    );
  }

  const selectedDoc = selectedDocId ? docsById[selectedDocId] : undefined;

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

        <Stack direction="row" gap={0} className={styles.panels}>
          <Panel
            title="C:\SWEARJAR"
            scroll={false}
            padded={false}
            className={cx(
              styles.panel,
              styles.panelLeft,
              isMobile && listSize === "peek" && styles.panelPeek,
              isMobile && listSize === "compact" && styles.panelCompact,
              isMobile && listSize === "full" && styles.panelExpanded,
            )}
            leading={
              isMobile ? (
                <Button
                  variant="ghost"
                  className={styles.navButton}
                  ariaLabel="Collapse file list"
                  onClick={() => cycleSize(-1)}
                >
                  [▲]
                </Button>
              ) : undefined
            }
            onTitleActivate={isMobile ? () => cycleSize(1) : undefined}
            titleActionLabel="Cycle file list size"
            actions={
              isMobile ? (
                <Button
                  variant="ghost"
                  className={styles.navButton}
                  ariaLabel="Expand file list"
                  onClick={() => cycleSize(1)}
                >
                  [▼]
                </Button>
              ) : undefined
            }
          >
            <FileTable
              className={styles.fileTable}
              columns={fileColumns}
              items={fileRows}
              label="Files"
              footer={formatSummary(dirCount, fileCount)}
              onFooterActivate={isMobile ? () => cycleSize(1) : undefined}
              footerActionLabel="Cycle file list size"
            />
          </Panel>

          <Panel
            title={selectedDoc ? selectedDoc.title : "C:\\"}
            className={cx(styles.panel, styles.panelRight)}
          >
            {selectedDoc ? (
              <DocView doc={selectedDoc} />
            ) : (
              <Text tone="dim">Screen cleared. Pick a file to read.</Text>
            )}
          </Panel>
        </Stack>

        <CmdLine
          commands={commands}
          onSubmit={run}
          onSubmitEmpty={activateSelection}
          onNavigate={moveCursor}
          captureDisabled={dialog !== null || screensaverOn}
        />
        <KeyBar items={keyItems} />
        <StatusBar
          left={
            <>
              <Text
                as="span"
                className={cx(styles.jar, flash && styles.flash)}
              >
                {`JAR: ${coins} ${coins === 1 ? "COIN" : "COINS"}`}
              </Text>
            </>
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

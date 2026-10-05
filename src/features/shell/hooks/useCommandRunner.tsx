"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { resolveCommand } from "@swearjar/dos";
import {
  isActionCommand,
  type ActionCommandId,
  type AppCommand,
  type FileGroup,
} from "@/content/commands";
import { messages } from "@/content/messages";
import { CoffeeBody } from "../CoffeeBody";
import { DirBody, DoomBody, ErrorBody, HelpBody, LogoffBody } from "../dialogs";

export type DialogState = {
  title: string;
  tone?: "default" | "error";
  // A wider window for content that reads better in columns (HELP).
  wide?: boolean;
  body: ReactNode;
};

export type CommandRunnerOptions = {
  openDialog: (dialog: DialogState) => void;
  closeDialog: () => void;
  addCoin: (raw: string) => void;
  coins: number;
  logoff: () => void;
  push: (href: string) => void;
  reopenLanding: () => void;
  commands: readonly AppCommand[];
  groups: readonly FileGroup[];
  focusSearch: () => void;
};

export function useCommandRunner({
  openDialog,
  closeDialog,
  addCoin,
  coins,
  logoff,
  push,
  reopenLanding,
  commands,
  groups,
  focusSearch,
}: CommandRunnerOptions) {
  const handlers = useMemo<Record<ActionCommandId, () => void>>(
    () => ({
      SEARCH: focusSearch,
      HELP: () =>
        openDialog({
          title: messages.shell.dialogs.help.title,
          wide: true,
          body: <HelpBody commands={commands} />,
        }),
      DIR: () =>
        openDialog({
          title: messages.shell.dialogs.dir.title,
          body: <DirBody groups={groups} />,
        }),
      COFFEE: () =>
        openDialog({
          title: messages.shell.dialogs.coffee.title,
          body: <CoffeeBody />,
        }),
      DOOM: () => openDialog({ title: messages.shell.dialogs.doom.title, body: <DoomBody /> }),
      // The landing window closed into the shell; WELCOME rings it back.
      WELCOME: reopenLanding,
      // Logging off ends the session, so it asks first.
      LOGOFF: () =>
        openDialog({
          title: messages.shell.dialogs.logoff.title,
          body: (
            <LogoffBody
              onConfirm={() => {
                closeDialog();
                logoff();
              }}
              onCancel={closeDialog}
            />
          ),
        }),
    }),
    [closeDialog, commands, focusSearch, groups, logoff, openDialog, reopenLanding],
  );

  return useCallback(
    (raw: string) => {
      const command = resolveCommand(commands, raw);
      if (!command) {
        addCoin(raw);
        openDialog({
          title: messages.shell.dialogs.error.title,
          tone: "error",
          body: <ErrorBody coins={coins + 1} />,
        });
        return;
      }
      if (isActionCommand(command.id)) {
        handlers[command.id]();
        return;
      }
      // Docs navigate by href like sections; the file manager needs no
      // document state (see useFileManager).
      if (command.href) {
        push(command.href);
      }
    },
    [addCoin, coins, commands, handlers, openDialog, push],
  );
}

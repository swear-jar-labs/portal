"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { resolveCommand } from "@swearjar/dos";
import {
  isActionCommand,
  type ActionCommandId,
  type AppCommand,
  type CommandId,
  type FileGroup,
} from "@/content/commands";
import { messages } from "@/content/messages";
import { CoffeeBody } from "./CoffeeBody";
import { DirBody, DoomBody, ErrorBody, ExitBody, HelpBody, LogoffBody } from "./dialogs";

export type DialogState = {
  title: string;
  tone?: "default" | "error";
  body: ReactNode;
};

export type CommandRunnerOptions = {
  openDialog: (dialog: DialogState) => void;
  closeDialog: () => void;
  addCoin: () => void;
  openDocument: (commandId: CommandId) => void;
  clearDocument: () => void;
  logoff: () => void;
  push: (href: string) => void;
  commands: readonly AppCommand[];
  groups: readonly FileGroup[];
  signedIn: boolean;
};

export function useCommandRunner({
  openDialog,
  closeDialog,
  addCoin,
  openDocument,
  clearDocument,
  logoff,
  push,
  commands,
  groups,
  signedIn,
}: CommandRunnerOptions) {
  const handlers = useMemo<Record<ActionCommandId, () => void>>(
    () => ({
      HELP: () =>
        openDialog({
          title: messages.shell.dialogs.help.title,
          body: <HelpBody commands={commands} />,
        }),
      DIR: () =>
        openDialog({ title: messages.shell.dialogs.dir.title, body: <DirBody groups={groups} /> }),
      CLS: clearDocument,
      COFFEE: () =>
        openDialog({ title: messages.shell.dialogs.coffee.title, body: <CoffeeBody /> }),
      DOOM: () => openDialog({ title: messages.shell.dialogs.doom.title, body: <DoomBody /> }),
      EXIT: () =>
        openDialog({
          title: messages.shell.dialogs.exit.title,
          body: <ExitBody signedIn={signedIn} />,
        }),
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
    [clearDocument, closeDialog, commands, groups, logoff, openDialog, signedIn],
  );

  return useCallback(
    (raw: string) => {
      const command = resolveCommand(commands, raw);
      if (!command) {
        addCoin();
        openDialog({
          title: messages.shell.dialogs.error.title,
          tone: "error",
          body: <ErrorBody />,
        });
        return;
      }
      if (isActionCommand(command.id)) {
        handlers[command.id]();
        return;
      }
      if (command.doc) {
        openDocument(command.id);
        return;
      }
      if (command.href) {
        push(command.href);
      }
    },
    [addCoin, commands, handlers, openDialog, openDocument, push],
  );
}

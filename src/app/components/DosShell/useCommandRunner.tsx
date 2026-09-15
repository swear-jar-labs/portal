"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { resolveCommand } from "@swearjar/dos";
import { commands, type CommandId } from "@/content/commands";
import { messages } from "@/content/messages";
import { CoffeeBody } from "./CoffeeBody";
import { DirBody, DoomBody, ErrorBody, ExitBody, HelpBody } from "./dialogs";

export type DialogState = {
  title: string;
  tone?: "default" | "error";
  body: ReactNode;
};

export type CommandRunnerOptions = {
  openDialog: (dialog: DialogState) => void;
  addCoin: () => void;
  openDocument: (commandId: CommandId) => void;
  clearDocument: () => void;
  push: (href: string) => void;
};

export function useCommandRunner({
  openDialog,
  addCoin,
  openDocument,
  clearDocument,
  push,
}: CommandRunnerOptions) {
  const handlers = useMemo<Partial<Record<CommandId, () => void>>>(
    () => ({
      HELP: () => openDialog({ title: messages.shell.dialogs.help.title, body: <HelpBody /> }),
      DIR: () => openDialog({ title: messages.shell.dialogs.dir.title, body: <DirBody /> }),
      CLS: clearDocument,
      COFFEE: () =>
        openDialog({ title: messages.shell.dialogs.coffee.title, body: <CoffeeBody /> }),
      DOOM: () => openDialog({ title: messages.shell.dialogs.doom.title, body: <DoomBody /> }),
      EXIT: () => openDialog({ title: messages.shell.dialogs.exit.title, body: <ExitBody /> }),
    }),
    [clearDocument, openDialog],
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
      const handler = handlers[command.id];
      if (handler) {
        handler();
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
    [addCoin, handlers, openDialog, openDocument, push],
  );
}

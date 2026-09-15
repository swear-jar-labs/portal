import type { Command } from "@swearjar/dos";
import type { DocId } from "./landing";
import { messages } from "./messages";

export type FileExt = "TXT" | "EXE";
export type FileGroupId = "read" | "board" | "account";

export type FileMeta = {
  group: FileGroupId;
  name: string;
  ext: FileExt;
  size: number;
};

type AppCommandDef = Command & { file?: FileMeta };

const commandDefs = [
  {
    id: "ABOUT",
    description: messages.shell.registry.descriptions.ABOUT,
    doc: "ABOUT",
    file: { group: "read", name: "ABOUT", ext: "TXT", size: 1024 },
  },
  {
    id: "MANIFESTO",
    description: messages.shell.registry.descriptions.MANIFESTO,
    doc: "MANIFESTO",
    file: { group: "read", name: "MANIFESTO", ext: "TXT", size: 512 },
  },
  {
    id: "HOW",
    description: messages.shell.registry.descriptions.HOW,
    doc: "HOW",
    file: { group: "read", name: "HOW-IT-WORKS", ext: "TXT", size: 2048 },
  },
  {
    id: "RULES",
    description: messages.shell.registry.descriptions.RULES,
    doc: "RULES",
    file: { group: "read", name: "RULES", ext: "TXT", size: 640 },
  },
  {
    id: "STATUS",
    description: messages.shell.registry.descriptions.STATUS,
    doc: "STATUS",
    file: { group: "read", name: "STATUS", ext: "TXT", size: 384 },
  },
  {
    id: "DISCUSSIONS",
    description: messages.shell.registry.descriptions.DISCUSSIONS,
    href: "/discussions",
    file: { group: "board", name: "DISCUSSIONS", ext: "EXE", size: 2048 },
  },
  {
    id: "ERRATA",
    description: messages.shell.registry.descriptions.ERRATA,
    href: "/errata",
    file: { group: "board", name: "ERRATA", ext: "EXE", size: 4096 },
  },
  {
    id: "READROOM",
    description: messages.shell.registry.descriptions.READROOM,
    href: "/readroom",
    file: { group: "board", name: "READROOM", ext: "EXE", size: 3072 },
  },
  {
    id: "PRODUCTS",
    description: messages.shell.registry.descriptions.PRODUCTS,
    href: "/products",
    file: { group: "board", name: "PRODUCTS", ext: "EXE", size: 2048 },
  },
  {
    id: "TICKETS",
    description: messages.shell.registry.descriptions.TICKETS,
    href: "/tickets",
    file: { group: "board", name: "TICKETS", ext: "EXE", size: 1024 },
  },
  {
    id: "APPLY",
    description: messages.shell.registry.descriptions.APPLY,
    href: "/apply",
    file: { group: "account", name: "APPLY", ext: "EXE", size: 512 },
  },
  {
    id: "LOGON",
    description: messages.shell.registry.descriptions.LOGON,
    href: "/login",
    file: { group: "account", name: "LOGON", ext: "EXE", size: 512 },
  },
  {
    id: "SETTINGS",
    description: messages.shell.registry.descriptions.SETTINGS,
    href: "/settings",
    file: { group: "account", name: "SETTINGS", ext: "EXE", size: 512 },
  },
  { id: "COFFEE", description: messages.shell.registry.descriptions.COFFEE },
  {
    id: "DOOM",
    description: messages.shell.registry.descriptions.DOOM,
    hidden: true,
  },
  {
    id: "EXIT",
    description: messages.shell.registry.descriptions.EXIT,
    hidden: true,
  },
  { id: "DIR", description: messages.shell.registry.descriptions.DIR },
  { id: "HELP", description: messages.shell.registry.descriptions.HELP },
  { id: "CLS", description: messages.shell.registry.descriptions.CLS },
] as const satisfies readonly AppCommandDef[];

export type CommandId = (typeof commandDefs)[number]["id"];

export type AppCommand = Omit<Command, "id" | "doc" | "href"> & {
  id: CommandId;
  doc?: DocId;
  href?: `/${string}`;
  file?: FileMeta;
};

export const commands: readonly AppCommand[] = commandDefs;

export const commandById: ReadonlyMap<CommandId, AppCommand> = new Map(
  commands.map((command) => [command.id, command]),
);

export type FileItem = {
  command: CommandId;
  name: string;
  ext: FileExt;
  size: number;
};

export type FileGroup = {
  id: FileGroupId;
  label: string;
  short: string;
  items: FileItem[];
};

const fileGroupDefs = [
  { id: "read", ...messages.shell.files.groups.read },
  { id: "board", ...messages.shell.files.groups.board },
  { id: "account", ...messages.shell.files.groups.account },
] as const satisfies readonly { id: FileGroupId; label: string; short: string }[];

export const fileGroups: FileGroup[] = fileGroupDefs.map((group) => ({
  ...group,
  items: commands.flatMap((command) => {
    const file = command.file;
    if (!file || file.group !== group.id) return [];
    return [{ command: command.id, name: file.name, ext: file.ext, size: file.size }];
  }),
}));

export type MenuEntry =
  { kind: "separator" } | { kind: "command"; command: CommandId; label: string };

export type MenuDef = {
  id: string;
  label: string;
  entries: MenuEntry[];
};

export const menuDefs: MenuDef[] = [
  {
    id: "file",
    label: messages.shell.menuBar.titles.file,
    entries: [
      { kind: "command", command: "ABOUT", label: messages.shell.menuBar.labels.ABOUT },
      { kind: "command", command: "MANIFESTO", label: messages.shell.menuBar.labels.MANIFESTO },
      { kind: "command", command: "HOW", label: messages.shell.menuBar.labels.HOW },
      { kind: "command", command: "RULES", label: messages.shell.menuBar.labels.RULES },
      { kind: "separator" },
      { kind: "command", command: "APPLY", label: messages.shell.menuBar.labels.APPLY },
      { kind: "command", command: "LOGON", label: messages.shell.menuBar.labels.LOGON },
    ],
  },
  {
    id: "board",
    label: messages.shell.menuBar.titles.board,
    entries: [
      {
        kind: "command",
        command: "DISCUSSIONS",
        label: messages.shell.menuBar.labels.DISCUSSIONS,
      },
      { kind: "command", command: "ERRATA", label: messages.shell.menuBar.labels.ERRATA },
      { kind: "command", command: "READROOM", label: messages.shell.menuBar.labels.READROOM },
      { kind: "command", command: "PRODUCTS", label: messages.shell.menuBar.labels.PRODUCTS },
      { kind: "command", command: "TICKETS", label: messages.shell.menuBar.labels.TICKETS },
    ],
  },
  {
    id: "account",
    label: messages.shell.menuBar.titles.account,
    entries: [
      { kind: "command", command: "LOGON", label: messages.shell.menuBar.labels.LOGON },
      { kind: "command", command: "APPLY", label: messages.shell.menuBar.labels.APPLY },
    ],
  },
  {
    id: "help",
    label: messages.shell.menuBar.titles.help,
    entries: [
      { kind: "command", command: "HELP", label: messages.shell.menuBar.labels.HELP },
      { kind: "separator" },
      { kind: "command", command: "COFFEE", label: messages.shell.menuBar.labels.COFFEE },
    ],
  },
];

export type KeyDef = {
  key: string;
  label: string;
  command: CommandId;
};

export const keyDefs: KeyDef[] = [
  { key: "F1", label: messages.shell.keyBar.labels.HELP, command: "HELP" },
  { key: "F2", label: messages.shell.keyBar.labels.ABOUT, command: "ABOUT" },
  { key: "F3", label: messages.shell.keyBar.labels.MANIFESTO, command: "MANIFESTO" },
  { key: "F4", label: messages.shell.keyBar.labels.RULES, command: "RULES" },
  { key: "F5", label: messages.shell.keyBar.labels.DOOM, command: "DOOM" },
  { key: "F6", label: messages.shell.keyBar.labels.PRODUCTS, command: "PRODUCTS" },
  { key: "F7", label: messages.shell.keyBar.labels.STATUS, command: "STATUS" },
  { key: "F8", label: messages.shell.keyBar.labels.APPLY, command: "APPLY" },
  { key: "F9", label: messages.shell.keyBar.labels.LOGON, command: "LOGON" },
  { key: "F10", label: messages.shell.keyBar.labels.EXIT, command: "EXIT" },
];

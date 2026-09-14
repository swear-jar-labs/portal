import type { Command } from "@swearjar/dos";

export const commands: Command[] = [
  { id: "ABOUT", description: "what is this place", doc: "ABOUT" },
  { id: "MANIFESTO", description: "what we believe", doc: "MANIFESTO" },
  { id: "HOW", description: "how the team works", doc: "HOW" },
  { id: "RULES", description: "the rules", doc: "RULES" },
  { id: "STATUS", description: "who we need now", doc: "STATUS" },
  { id: "DISCUSSIONS", description: "open the board", href: "/discussions" },
  { id: "ERRATA", description: "the jar, written down", href: "/errata" },
  { id: "READROOM", description: "the reading cycle", href: "/readroom" },
  { id: "PRODUCTS", description: "what we build", href: "/products" },
  { id: "TICKETS", description: "the work queue", href: "/tickets" },
  { id: "APPLY", description: "join the team", href: "/apply" },
  { id: "LOGON", description: "member login", href: "/login" },
  { id: "SETTINGS", description: "tune the terminal", href: "/settings" },
  { id: "COFFEE", description: "brew something" },
  { id: "DOOM", description: "the only OS without DOOM", hidden: true },
  { id: "EXIT", description: "end the session", hidden: true },
  { id: "DIR", description: "list files" },
  { id: "HELP", description: "this list" },
  { id: "CLS", description: "clear the screen" },
];

export type FileItem = {
  command: string;
  name: string;
  ext: "TXT" | "EXE";
  size: number;
};

export type FileGroup = {
  id: string;
  label: string;
  short: string;
  items: FileItem[];
};

export const fileGroups: FileGroup[] = [
  {
    id: "read",
    label: "── READ ──────────────",
    short: "READ",
    items: [
      { command: "ABOUT", name: "ABOUT", ext: "TXT", size: 1024 },
      { command: "MANIFESTO", name: "MANIFESTO", ext: "TXT", size: 512 },
      { command: "HOW", name: "HOW-IT-WORKS", ext: "TXT", size: 2048 },
      { command: "RULES", name: "RULES", ext: "TXT", size: 640 },
      { command: "STATUS", name: "STATUS", ext: "TXT", size: 384 },
    ],
  },
  {
    id: "board",
    label: "── BOARD ─────────────",
    short: "BOARD",
    items: [
      { command: "DISCUSSIONS", name: "DISCUSSIONS", ext: "EXE", size: 2048 },
      { command: "ERRATA", name: "ERRATA", ext: "EXE", size: 4096 },
      { command: "READROOM", name: "READROOM", ext: "EXE", size: 3072 },
      { command: "PRODUCTS", name: "PRODUCTS", ext: "EXE", size: 2048 },
      { command: "TICKETS", name: "TICKETS", ext: "EXE", size: 1024 },
    ],
  },
  {
    id: "account",
    label: "── ACCOUNT ───────────",
    short: "ACCOUNT",
    items: [
      { command: "APPLY", name: "APPLY", ext: "EXE", size: 512 },
      { command: "LOGON", name: "LOGON", ext: "EXE", size: 512 },
      { command: "SETTINGS", name: "SETTINGS", ext: "EXE", size: 512 },
    ],
  },
];

export type MenuEntry =
  | { kind: "separator" }
  | { kind: "command"; command: string; label: string };

export type MenuDef = {
  id: string;
  label: string;
  entries: MenuEntry[];
};

export const menuDefs: MenuDef[] = [
  {
    id: "file",
    label: "File",
    entries: [
      { kind: "command", command: "ABOUT", label: "About..." },
      { kind: "command", command: "MANIFESTO", label: "Manifesto" },
      { kind: "command", command: "HOW", label: "How it works" },
      { kind: "command", command: "RULES", label: "Rules" },
      { kind: "separator" },
      { kind: "command", command: "APPLY", label: "Apply..." },
      { kind: "command", command: "LOGON", label: "Logon..." },
    ],
  },
  {
    id: "board",
    label: "Board",
    entries: [
      { kind: "command", command: "DISCUSSIONS", label: "Discussions" },
      { kind: "command", command: "ERRATA", label: "Errata" },
      { kind: "command", command: "READROOM", label: "Readroom" },
      { kind: "command", command: "PRODUCTS", label: "Products" },
      { kind: "command", command: "TICKETS", label: "Tickets" },
    ],
  },
  {
    id: "account",
    label: "Account",
    entries: [
      { kind: "command", command: "LOGON", label: "Logon..." },
      { kind: "command", command: "APPLY", label: "Apply..." },
    ],
  },
  {
    id: "help",
    label: "Help",
    entries: [
      { kind: "command", command: "HELP", label: "Commands..." },
      { kind: "separator" },
      { kind: "command", command: "COFFEE", label: "Coffee" },
    ],
  },
];

export type KeyDef = {
  key: string;
  label: string;
  command: string;
};

export const keyDefs: KeyDef[] = [
  { key: "F1", label: "Help", command: "HELP" },
  { key: "F2", label: "About", command: "ABOUT" },
  { key: "F3", label: "Manifesto", command: "MANIFESTO" },
  { key: "F4", label: "Rules", command: "RULES" },
  { key: "F5", label: "Doom", command: "DOOM" },
  { key: "F6", label: "Products", command: "PRODUCTS" },
  { key: "F7", label: "Status", command: "STATUS" },
  { key: "F8", label: "Apply", command: "APPLY" },
  { key: "F9", label: "Logon", command: "LOGON" },
  { key: "F10", label: "Exit", command: "EXIT" },
];

import type { PluralForms } from "@/lib/plural";

// UI text lives here only: every localizable string of the app. The shell is the
// landing experience (chrome + its surfaces); page sections of future routes are
// added as siblings. Ids, routes, file names and other canon stay in code;
// boot/welcome/doc content stays structural in landing.ts.
export const messages = {
  metadata: {
    title: "Swear Jar Labs",
    description:
      "The public terminal of Swear Jar Labs — a community keeping the craft of software engineering alive.",
  },
  shell: {
    brand: { name: "SWEARJAR.DOS", version: "v0.1" },
    menuBar: {
      titles: { file: "File", board: "Board", account: "Account", help: "Help" },
      labels: {
        ABOUT: "About...",
        MANIFESTO: "Manifesto",
        HOW: "How it works",
        RULES: "Rules",
        DISCUSSIONS: "Discussions",
        ERRATA: "Errata",
        READROOM: "Readroom",
        PRODUCTS: "Products",
        TICKETS: "Tickets",
        APPLY: "Apply...",
        LOGON: "Logon...",
        HELP: "Commands...",
        COFFEE: "Coffee",
      },
    },
    keyBar: {
      ariaLabel: "Function keys",
      labels: {
        HELP: "Help",
        ABOUT: "About",
        MANIFESTO: "Manifesto",
        RULES: "Rules",
        DOOM: "Doom",
        PRODUCTS: "Products",
        STATUS: "Status",
        APPLY: "Apply",
        LOGON: "Logon",
        EXIT: "Exit",
      },
    },
    cmdLine: { ariaLabel: "Command line" },
    statusBar: {
      guest: "GUEST",
      jar: "JAR",
      clockFallback: "--:--",
    },
    window: { closeLabel: "Close" },
    screensaver: { title: "STARFIELD.SCR", hint: "PRESS ANY KEY TO WAKE UP" },
    files: {
      tableLabel: "Files",
      columns: { name: "NAME", type: "TYPE", size: "SIZE" },
      collapse: "Collapse file list",
      expand: "Expand file list",
      cycleHeader: "Cycle file list size (header)",
      cycleFooter: "Cycle file list size (footer)",
      groups: {
        read: { label: "── READ ──────────────", short: "READ" },
        board: { label: "── BOARD ─────────────", short: "BOARD" },
        account: { label: "── ACCOUNT ───────────", short: "ACCOUNT" },
      },
    },
    dialogs: {
      help: {
        title: "HELP",
        intro: "Available commands:",
        outro: "Tab completes. Try an unknown command — the jar clinks.",
      },
      dir: { title: "DIR" },
      coffee: {
        title: "COFFEE.EXE",
        brewing: "brewing by hand...",
        done: "The team is now 94% caffeinated.",
      },
      doom: {
        title: "DOOM.EXE",
        text: "This is the only OS DOOM has not been ported to yet.",
        hint: "But if you wish, you can take this on — APPLY.",
      },
      exit: {
        title: "EXIT",
        text: "There is no exit, as there is no logon.",
        hint: "Type LOGON to sign in.",
      },
      error: {
        title: "ERROR",
        headline: "Bad command or file name.",
        jar: "The jar clinks. +1 coin.",
        hint: "Try HELP.",
      },
    },
    doc: {
      emptyHeading: "SWEAR JAR LABS",
      empty: "Screen cleared. Pick a file to read.",
    },
    notFound: {
      title: "404.TXT",
      heading: "PATH NOT FOUND",
      hint: "No such route in the file list. Pick a file on the left or type HELP.",
    },
    registry: {
      descriptions: {
        ABOUT: "what is this place",
        MANIFESTO: "what we believe",
        HOW: "how the team works",
        RULES: "the rules",
        STATUS: "who we need now",
        DISCUSSIONS: "open the board",
        ERRATA: "the jar, written down",
        READROOM: "the reading cycle",
        PRODUCTS: "what we build",
        TICKETS: "the work queue",
        APPLY: "join the team",
        LOGON: "member login",
        SETTINGS: "tune the terminal",
        COFFEE: "brew something",
        DOOM: "the only OS without DOOM",
        EXIT: "end the session",
        DIR: "list files",
        HELP: "this list",
        CLS: "clear the screen",
      },
    },
  },
} as const;

export const pluralForms = {
  coin: { one: "COIN", other: "COINS" },
  dir: { one: "DIR", other: "DIRS" },
  file: { one: "FILE", other: "FILES" },
} as const satisfies Record<string, PluralForms>;

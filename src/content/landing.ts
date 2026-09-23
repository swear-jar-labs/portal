import type { Tone } from "@swearjar/dos";

export type BootLine = {
  id: string;
  text: string;
  status?: { text: string; tone: Tone };
};

export const bootTitle = "SWEAR JAR LABS";

export const bootLines: BootLine[] = [
  { id: "load", text: "SWEARJAR.DOS /LOAD" },
  {
    id: "kernel",
    text: "Initializing team_kernel...............",
    status: { text: "OK", tone: "green" },
  },
  {
    id: "ai",
    text: "Checking for AI dependencies..........",
    status: { text: "NOT REQUIRED", tone: "yellow" },
  },
  {
    id: "coffee",
    text: "Warming up the coffee machine..........",
    status: { text: "OK", tone: "green" },
  },
  {
    id: "members",
    text: "Calling the members....................",
    status: { text: "OK", tone: "green" },
  },
  {
    id: "intentions",
    text: "Loading good intentions................",
    status: { text: "OK", tone: "green" },
  },
];

export const bootSkip = "[ CLICK OR PRESS ANY KEY TO SKIP ]";

export const welcome = {
  title: "WELCOME.TXT",
  heading: "WELCOME TO SWEARJAR.DOS",
  intro:
    "A workshop for people who want to understand how software works — and how to build it well.",
  lines: [
    "We write code, question it, and help each other fix what we were sure would work.",
    "Bring a question to FORUM, a mistake to ERRATA, or some code to READROOM.",
    "Open HOW-IT-WORKS.TXT to learn about participation and project work.",
    "Pick a file on the left to get started.",
    "Type HELP for commands. Tab completes commands while you type.",
  ],
  footer: "Mistakes happen. Keep the lessons.",
};

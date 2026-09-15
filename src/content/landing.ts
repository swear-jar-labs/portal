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
    status: { text: "REFERENCE ONLY", tone: "yellow" },
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
    "The public terminal of Swear Jar Labs — a community keeping the craft of software engineering alive.",
  lines: [
    "Pick a file on the left to read.",
    "Type HELP for commands. Tab completes.",
    "APPLY to join. LOGON if you are a member.",
  ],
  footer: "The jar is empty. Let's keep it that way.",
};

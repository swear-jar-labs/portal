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
  heading: "SWEAR JAR LABS",
  intro: "A workshop for curious developers",
  description: "We write code, question it, and help each other fix what we were sure would work.",
  places: [
    { name: "FORUM", description: "Ask questions. Share what you know." },
    { name: "READROOM", description: "Read code. Compare notes." },
    { name: "PROJECTS", description: "Build something together." },
  ],
  footer: "Mistakes happen. Keep the lessons.",
  explore: "Explore the forum",
  how: "How it works",
};

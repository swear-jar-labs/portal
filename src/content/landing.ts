// Structural landing copy (not localized): the fullscreen window on `/`.
// Sources: COPY.md "Лендинг /" and the approved mock
// (private/mockups/landing-hero). Routes stay symbolic here through the
// command registry constants; the two doc-less literals below are route
// paths, which live in code by convention.
export const landing = {
  title: "SWEARJAR.TEAM",
  slogan: ["MAKE SOFTWARE", "ENGINEERING", "GREAT AGAIN"] as const,
  hook: "How will you write code when AI rises?",
  lead: [
    "Today AI writes a growing share of the code, and the developer reads more than ever before. But reading alone won't make you a solid developer. If you don't write, how do you grow?",
    "We close that gap: a community for curious developers who want to keep growing. Write, review, get things wrong in public and keep the lessons.",
  ] as const,
  joinTeam: "JOIN THE TEAM",
  howItWorks: "HOW IT WORKS",
  diskBox: {
    // No version of its own: the box carries the product version from
    // messages.shell.brand (one magic, one place).
    title: "SWEARJAR.DOS",
    caption: "buy on 3 x floppy disks or",
    joinOnline: "join online",
  },
  position: {
    title: "THE POSITION",
    text: "The code may come from a model. It may come from you. Either way, the human answers for what ships. You review it, you own it. Think of us as a swear jar for code. Every time you miss an edge case or break production, you put the lesson in the jar.",
    manifesto: "READ THE MANIFESTO",
  },
  places: {
    title: "WHAT'S IN THE BOX",
    intro: "Four places, one habit: write it down, read it back.",
    open: "OPEN",
    entries: [
      {
        id: "forum",
        name: "FORUM",
        first: "Ask questions. Share what you know.",
        second: "Technical discussions — no question too small.",
        alt: "FORUM.EXE board with discussion threads",
      },
      {
        id: "errata",
        name: "ERRATA",
        first: "Own mistakes. Share the lesson.",
        second: "Our mistakes, documented in public. The swear jar, in prose.",
        alt: "ERRATA board with lessons learned in public",
      },
      {
        id: "readroom",
        name: "READROOM",
        first: "Read code. Compare notes.",
        second: "Read code together, submit notes before the deadline, and compare conclusions.",
        alt: "READROOM list of code-reading tasks and notes",
      },
      {
        id: "projects",
        name: "PROJECTS",
        first: "Build something together.",
        second: "Real projects, not training exercises, with tickets, reviews, maintainers.",
        alt: "PROJECTS.EXE board with real projects and tickets",
      },
    ],
  },
  art: {
    title: "WHEN SOFTWARE ENGINEERING WAS AN ART",
    text: "This look is a direct reference to those days, when people relied only on their own knowledge. There was barely an internet to ask. A manual, a machine, and your own head.",
  },
  footer: {
    line: "Mistakes happen. Keep the lessons.",
    brand: "SWEAR JAR LABS",
    email: "hello@swearjar.team",
  },
} as const;

export type LandingPlaceId = "forum" | "errata" | "readroom" | "projects";

export type LandingPlaceEntry = {
  id: LandingPlaceId;
  name: string;
  first: string;
  second: string;
  alt: string;
};

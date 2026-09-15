import type { Tone } from "@swearjar/dos";

export type Inline = {
  text: string;
  tone?: Tone;
  bold?: boolean;
};

export type Block =
  | { type: "hero"; title: string; tagline: string }
  | { type: "heading"; text: string; tone?: Tone }
  | {
      type: "paragraph";
      content: readonly Inline[];
      tone?: Tone;
      align?: "left" | "right";
    }
  | { type: "list"; items: readonly (readonly Inline[])[] };

type DocShape = {
  id: string;
  title: string;
  blocks: readonly Block[];
};

export type Doc = {
  id: DocId;
  title: string;
  blocks: readonly Block[];
};

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

const docDefs = [
  {
    id: "ABOUT",
    title: "ABOUT.TXT",
    blocks: [
      {
        type: "hero",
        title: "SWEAR JAR LABS",
        tagline: "AN ENGINEERING COMMUNITY · SWEARJAR.DOS",
      },
      {
        type: "paragraph",
        content: [
          { text: "We are a small community of engineers " },
          {
            text: "keeping the craft of building software systems alive",
            tone: "cyan",
            bold: true,
          },
          {
            text: " — judgment is grown by writing, and by getting things wrong in public.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            text: "Like a craft bakery: small batches, by hand, no shortcuts. Only the loaves are software systems.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            text: "Most code today is read far more than it is written. So we read carefully, we review by hand, and we keep a ",
          },
          { text: "swear jar", tone: "yellow", bold: true },
          {
            text: " for the times we break our own rules. The jar is public. So are the lessons.",
          },
        ],
      },
      {
        type: "list",
        items: [
          [{ text: "AI is a reference, not a co-author." }],
          [{ text: "One problem at a time, done properly." }],
          [{ text: "Kindness is a rule, not a mood." }],
        ],
      },
      {
        type: "paragraph",
        tone: "dim",
        content: [
          {
            text: "Not a startup, not an agency. The place to learn the craft of building software systems.",
          },
        ],
      },
    ],
  },
  {
    id: "MANIFESTO",
    title: "MANIFESTO.TXT",
    blocks: [
      { type: "heading", text: "THE MANIFESTO", tone: "yellow" },
      {
        type: "paragraph",
        content: [
          { text: "1. What we believe.", tone: "yellow", bold: true },
          {
            text: " Judgment is grown by writing and by mistakes. Code is now read more than it is written — and reading is earned by writing, so we practice reading through writing.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "2. How we work.", tone: "yellow", bold: true },
          {
            text: " By hand. Mistakes in public. Slow text. AI is a reference, never a co-author.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "3. The rule of kindness.", tone: "yellow", bold: true },
          { text: " No toxicity. We are all kittens here. Critique the work, never the person." },
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "4. Value flows.", tone: "yellow", bold: true },
          {
            text: " Members get real products, like-minded peers, and a pace without the grind. Sharpening the craft is the point.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "5. What we do not promise.", tone: "yellow", bold: true },
          {
            text: " A job, a guarantee, or a certificate. We promise the work and the people who do it.",
          },
        ],
      },
      { type: "paragraph", content: [{ text: "— the team" }], tone: "cyan", align: "right" },
    ],
  },
  {
    id: "HOW",
    title: "HOW-IT-WORKS.TXT",
    blocks: [
      {
        type: "paragraph",
        content: [
          { text: "Learners", tone: "cyan", bold: true },
          {
            text: " — this is a learning project first: junior and mid developers grow judgment by working on real code. Claim a task from a real backlog, write a short spec, pass review, then a maintainer reads and merges. Review is a gift: give it, receive it, and write down what you learned.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "Products", tone: "cyan", bold: true },
          {
            text: " — real projects, not training exercises: the platform itself, a flagship project, and the projects members bring — each with a public journal. Every product has its own maintainers with review and merge rights, and every change is read by a human before it lands.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "Readroom", tone: "cyan", bold: true },
          {
            text: " — we read code together — human or machine — on a deadline, then publish a report.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "Errata", tone: "cyan", bold: true },
          {
            text: " — our mistakes, written down. Public. That is the jar, but in prose.",
          },
        ],
      },
      {
        type: "paragraph",
        tone: "dim",
        content: [
          {
            text: "Type DISCUSSIONS, ERRATA, READROOM, PRODUCTS or TICKETS to open the board.",
          },
        ],
      },
    ],
  },
  {
    id: "RULES",
    title: "RULES.TXT",
    blocks: [
      {
        type: "list",
        items: [
          [{ text: "Be kind. Always." }],
          [{ text: "AI answers questions. It does not ship code." }],
          [{ text: "Write it by hand — even the boilerplate." }],
          [{ text: "Review is a gift. Give it and receive it." }],
          [{ text: "The jar only accepts coins. No exceptions." }],
        ],
      },
      {
        type: "paragraph",
        tone: "dim",
        content: [{ text: "Break a rule and the jar clinks. Type an unknown command to hear it." }],
      },
    ],
  },
  {
    id: "STATUS",
    title: "STATUS.TXT",
    blocks: [
      { type: "paragraph", content: [{ text: "NOW RECRUITING", tone: "yellow", bold: true }] },
      {
        type: "list",
        items: [
          [{ text: "2–4 reviewers — open review trial" }],
          [{ text: "4–5 learners (junior+/mid) — by application" }],
        ],
      },
      {
        type: "paragraph",
        content: [
          { text: "APPLY", tone: "green", bold: true },
          { text: " to start. " },
          { text: "LOGON", tone: "cyan", bold: true },
          { text: " if you are already a member." },
        ],
      },
    ],
  },
] as const satisfies readonly DocShape[];

export type DocId = (typeof docDefs)[number]["id"];

export const docs: readonly Doc[] = docDefs;

export const docsById = docs.reduce<Partial<Record<DocId, Doc>>>((byId, doc) => {
  byId[doc.id] = doc;
  return byId;
}, {});

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

// The shared tech vocabulary: the tags the readroom reads by and the stack
// the projects are built with, one list for both (boards come third). Labels
// live in messages.readroom.tags; the readroom aliases the list whole
// (readroomTagIds), projects take their subsets per fixture.

// One magic, one place: every static tech chip (cards, rows, posts, panels)
// spends this tone, so the vocabulary reads as one color family everywhere.
export const techTagTone = "muted-magenta" as const;

export const techIds = [
  "c",
  "cpp",
  "rust",
  "go",
  "python",
  "typescript",
  "sql",
  "js",
  "java",
  "kotlin",
  "csharp",
  "dotnet",
  "php",
  "ruby",
  "ios",
  "android",
  "linux",
  "windows",
  "macos",
  "nextjs",
  "postgres",
  "shell",
  "ci",
] as const;
export type TechId = (typeof techIds)[number];

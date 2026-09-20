// The shared tech vocabulary: the tags the readroom reads by and the stack
// the projects are built with, one list for both (boards come third). Labels
// live in messages.readroom.tags; the readroom aliases the list whole
// (readroomTagIds), projects take their subsets per fixture.

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

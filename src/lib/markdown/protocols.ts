// The URL protocols the Markdown pipeline accepts, in one place. Two guards
// read them: react-markdown's URL transform (Markdown.tsx) and the
// rehype-sanitize schema (sanitize.ts). `blob:` is the editor's upload
// imitation: picked files preview through object URLs for one SPA session;
// stored content never contains them, and a dead blob URL does not load.
export const MARKDOWN_SRC_PROTOCOLS = ["http", "https", "blob"] as const;

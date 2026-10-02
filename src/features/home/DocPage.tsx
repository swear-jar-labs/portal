import { notFound } from "next/navigation";
import { docs, type DocId } from "@/content/docs";
import { ShellPanel } from "@/features/shell";
import { DocView } from "./DocView/DocView";

// Docs with a URL (TECH.md §2): every doc except ABOUT, which lives on `/`.
// The single source for links between docs; the pin test next to this module
// keeps the table and the doc ids partitioned.
export const docPaths = {
  HOW: "/how",
  MANIFESTO: "/manifesto",
  RULES: "/rules",
} as const;
export type RoutableDocId = keyof typeof docPaths;

export function DocPage({ id }: { id: DocId }) {
  const doc = docs.find((entry) => entry.id === id);
  if (!doc) return notFound();
  return (
    <ShellPanel title={doc.title} surface="paper">
      <DocView doc={doc} />
    </ShellPanel>
  );
}

export function HowPage() {
  return <DocPage id="HOW" />;
}

export function ManifestoPage() {
  return <DocPage id="MANIFESTO" />;
}

export function RulesPage() {
  return <DocPage id="RULES" />;
}

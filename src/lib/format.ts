import { plural, type PluralForms } from "./plural";

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${Math.round(bytes / 1024)}K`;
}

export function formatCount(count: number, forms: PluralForms): string {
  return `${count} ${plural(count, forms)}`;
}

export type FileSummaryForms = {
  dir: PluralForms;
  file: PluralForms;
};

export function formatSummary(dirs: number, files: number, forms: FileSummaryForms): string {
  return `${formatCount(dirs, forms.dir)}, ${formatCount(files, forms.file)}`;
}

const ISO_STAMP_MINUTES = 16;

// Compact UTC stamp for audit-style history ("2026-09-20 11:00 UTC"): the
// queues show decision trails where two same-day entries must stay
// distinguishable (relative ages would read the same). Slice-and-space keeps
// the server render and hydration byte-identical without locale rules.
export function formatTimestamp(iso: string): string {
  return `${iso.slice(0, ISO_STAMP_MINUTES).replace("T", " ")} UTC`;
}

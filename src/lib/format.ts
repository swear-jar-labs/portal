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

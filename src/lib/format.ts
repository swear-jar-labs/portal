export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${Math.round(bytes / 1024)}K`;
}

export function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "S"}`;
}

export function formatSummary(dirs: number, files: number): string {
  return `${formatCount(dirs, "DIR")}, ${formatCount(files, "FILE")}`;
}

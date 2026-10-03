import type { ReactNode } from "react";
import type { CommandId } from "@/content/commands";

// Section-owned chrome contributions composed by the layout: the frame owns
// the surfaces (the KeyBar session tray and the file-row icons), sections own
// the data, and the shell never imports a section.
export type ShellAddon = {
  /** Stable id: the key of the tray entry and a diagnostic handle. */
  id: string;
  /** Rendered in the KeyBar session tray, in composition order. */
  tray?: ReactNode;
  /** File-row icons replacing a command's default sprite. */
  fileIcons?: Partial<Record<CommandId, ReactNode>>;
  /** Extra stat rows of the JAR dialog (Errata, Bugs), in composition order. */
  jar?: ReactNode;
};

type ShellTrayEntry = {
  id: string;
  node: ReactNode;
};

type ResolvedShellAddons = {
  tray: readonly ShellTrayEntry[];
  fileIcons: Partial<Record<CommandId, ReactNode>>;
  jarRows: readonly ShellTrayEntry[];
};

/** Flattens the addon list into the shell surfaces; later icons win. */
export function resolveShellAddons(addons: readonly ShellAddon[] | undefined): ResolvedShellAddons {
  const tray: ShellTrayEntry[] = [];
  const jarRows: ShellTrayEntry[] = [];
  const fileIcons: Partial<Record<CommandId, ReactNode>> = {};
  for (const addon of addons ?? []) {
    if (addon.tray !== undefined) tray.push({ id: addon.id, node: addon.tray });
    if (addon.jar !== undefined) jarRows.push({ id: addon.id, node: addon.jar });
    if (addon.fileIcons) Object.assign(fileIcons, addon.fileIcons);
  }
  return { tray, fileIcons, jarRows };
}

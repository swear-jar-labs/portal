import { Panel, type PanelProps } from "@swearjar/dos";
import { DOC_ZONE } from "../DosShell/zones";
import styles from "./ShellPanel.module.css";

export type ShellPanelProps = Omit<PanelProps, "zone" | "className">;

// The right-hand panel of the shell: route content lives here.
export function ShellPanel(props: ShellPanelProps) {
  return <Panel {...props} zone={DOC_ZONE} className={styles.panel} />;
}

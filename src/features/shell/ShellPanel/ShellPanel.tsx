import { Panel, type PanelProps } from "@swearjar/dos";
import { DOC_ZONE } from "../zones";
import styles from "./ShellPanel.module.css";

export type ShellPanelProps = Omit<PanelProps, "zone" | "className">;

// The right-hand panel of the shell: route content lives here. Top-level
// panels carry no [X]: a panel alone in the stack has nothing to close back
// to. Only layers above it pass their own CloseButton in `actions`.
export function ShellPanel({ actions, ...props }: ShellPanelProps) {
  return <Panel {...props} zone={DOC_ZONE} className={styles.panel} actions={actions} />;
}

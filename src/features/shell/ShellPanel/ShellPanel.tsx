import { Panel, type PanelProps } from "@swearjar/dos";
import { DOC_ZONE } from "../zones";
import { PanelClose } from "./PanelClose";
import styles from "./ShellPanel.module.css";

export type ShellPanelProps = Omit<PanelProps, "zone" | "className"> & {
  // Inner route windows ([X] in the title bar) close back to the default doc.
  closable?: boolean;
};

// The right-hand panel of the shell: route content lives here.
export function ShellPanel({ closable = false, actions, ...props }: ShellPanelProps) {
  return (
    <Panel
      {...props}
      zone={DOC_ZONE}
      className={styles.panel}
      actions={
        closable ? (
          <>
            {actions}
            <PanelClose />
          </>
        ) : (
          actions
        )
      }
    />
  );
}

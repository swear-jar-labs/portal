import { Button, cx, FileTable, Panel } from "@swearjar/dos";
import type { FileTableColumn, FileTableItem } from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { formatSummary } from "@/lib/format";
import type { FileListSize } from "./useFileManager";
import { FILES_ZONE } from "./zones";
import styles from "./DosShell.module.css";

// DOS flavor path: canonical chrome, not a localizable string.
const FILES_PANEL_TITLE = "C:\\SWEARJAR";
const CORNER_PADDING = "0 6px";

export type FileManagerPanelProps = {
  isMobile: boolean;
  listSize: FileListSize;
  onCycleSize: (direction: 1 | -1) => void;
  columns: FileTableColumn[];
  rows: FileTableItem[];
  dirCount: number;
  fileCount: number;
};

export function FileManagerPanel({
  isMobile,
  listSize,
  onCycleSize,
  columns,
  rows,
  dirCount,
  fileCount,
}: FileManagerPanelProps) {
  return (
    <Panel
      title={FILES_PANEL_TITLE}
      zone={FILES_ZONE}
      scroll={false}
      padded={false}
      className={cx(
        styles.panel,
        styles.panelLeft,
        isMobile && listSize === "peek" && styles.panelPeek,
        isMobile && listSize === "compact" && styles.panelCompact,
        isMobile && listSize === "full" && styles.panelExpanded,
      )}
      leading={
        isMobile ? (
          <Button
            variant="ghost"
            style={{ padding: CORNER_PADDING }}
            ariaLabel={messages.shell.files.collapse}
            onClick={() => onCycleSize(-1)}
          >
            [▲]
          </Button>
        ) : undefined
      }
      onTitleActivate={isMobile ? () => onCycleSize(1) : undefined}
      titleActionLabel={messages.shell.files.cycleHeader}
      actions={
        isMobile ? (
          <Button
            variant="ghost"
            style={{ padding: CORNER_PADDING }}
            ariaLabel={messages.shell.files.expand}
            onClick={() => onCycleSize(1)}
          >
            [▼]
          </Button>
        ) : undefined
      }
    >
      <FileTable
        className={styles.fileTable}
        columns={columns}
        items={rows}
        label={messages.shell.files.tableLabel}
        footer={formatSummary(dirCount, fileCount, pluralForms)}
        onFooterActivate={isMobile ? () => onCycleSize(1) : undefined}
        footerActionLabel={messages.shell.files.cycleFooter}
      />
    </Panel>
  );
}

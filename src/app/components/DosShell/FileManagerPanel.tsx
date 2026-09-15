import { Button, cx, FileTable, Panel } from "@swearjar/dos";
import type { FileTableColumn, FileTableItem } from "@swearjar/dos";
import { formatSummary } from "@/lib/format";
import type { FileListSize } from "./useFileManager";
import { FILES_ZONE } from "./zones";
import styles from "./DosShell.module.css";

const COLLAPSE_LABEL = "Collapse file list";
const EXPAND_LABEL = "Expand file list";
const HEADER_CYCLE_LABEL = "Cycle file list size (header)";
const FOOTER_CYCLE_LABEL = "Cycle file list size (footer)";
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
      title="C:\SWEARJAR"
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
            ariaLabel={COLLAPSE_LABEL}
            onClick={() => onCycleSize(-1)}
          >
            [▲]
          </Button>
        ) : undefined
      }
      onTitleActivate={isMobile ? () => onCycleSize(1) : undefined}
      titleActionLabel={HEADER_CYCLE_LABEL}
      actions={
        isMobile ? (
          <Button
            variant="ghost"
            style={{ padding: CORNER_PADDING }}
            ariaLabel={EXPAND_LABEL}
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
        label="Files"
        footer={formatSummary(dirCount, fileCount)}
        onFooterActivate={isMobile ? () => onCycleSize(1) : undefined}
        footerActionLabel={FOOTER_CYCLE_LABEL}
      />
    </Panel>
  );
}

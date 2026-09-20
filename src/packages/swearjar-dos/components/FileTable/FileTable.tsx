import { type MouseEvent, type ReactNode } from "react";
import type { SpriteName } from "../../sprites";
import { Table, type TableColumn } from "../Table/Table";
import { FileIcon } from "./FileIcon";
import styles from "./FileTable.module.css";

export type FileTableColumn = {
  id: string;
  label: string;
  width?: string;
  align?: "left" | "right";
  render?: (item: FileTableItem) => ReactNode;
};

export type FileTableItem = {
  id: string;
  name: string;
  type: string;
  size?: string;
  kind?: "file" | "dir" | "exe";
  icon?: SpriteName;
  expanded?: boolean;
  nested?: boolean;
  selected?: boolean;
  current?: boolean;
  href?: string;
  onActivate?: (event?: MouseEvent<HTMLElement>) => void;
};

export type FileTableProps = {
  columns: FileTableColumn[];
  items: FileTableItem[];
  label?: string;
  footer?: ReactNode;
  onFooterActivate?: () => void;
  footerActionLabel?: string;
  className?: string;
};

const cellContent: Record<string, ((item: FileTableItem) => ReactNode) | undefined> = {
  type: (item) => item.type,
  size: (item) => item.size,
};

const cellClass: Record<string, string | undefined> = {
  type: styles.type,
  size: styles.size,
};

function fileRowClass(item: FileTableItem): string {
  return [
    item.kind === "dir" ? styles.dir : undefined,
    item.kind === "exe" ? styles.exe : undefined,
    item.nested ? styles.nested : undefined,
  ]
    .filter((value) => value !== undefined)
    .join(" ");
}

export function FileTable({
  columns,
  items,
  label,
  footer,
  onFooterActivate,
  footerActionLabel,
  className,
}: FileTableProps) {
  const tableColumns: TableColumn<FileTableItem>[] = columns.map((column) => ({
    id: column.id,
    label: column.label,
    width: column.width,
    align: column.align,
    className: cellClass[column.id],
    ...(column.id === "name"
      ? {
          action: (item: FileTableItem) => ({
            id: item.id,
            content: (
              <>
                <FileIcon kind={item.kind ?? "file"} expanded={item.expanded} icon={item.icon} />
                <span className={styles.name}>{item.name}</span>
              </>
            ),
            ...(item.href === undefined ? {} : { href: item.href }),
            ...(item.current === undefined ? {} : { current: item.current }),
            ...(item.expanded === undefined ? {} : { expanded: item.expanded }),
            ...(item.onActivate === undefined ? {} : { onActivate: item.onActivate }),
            className: styles.fileControl,
            rowActivation: true,
          }),
        }
      : { render: column.render ?? cellContent[column.id] }),
  }));

  return (
    <Table
      columns={tableColumns}
      items={items}
      rowKey={(item) => item.id}
      rowClassName={fileRowClass}
      selected={(item) => item.selected === true}
      label={label}
      footer={footer}
      onFooterActivate={onFooterActivate}
      footerActionLabel={footerActionLabel}
      className={className}
      fill
      navigationBoundary
    />
  );
}

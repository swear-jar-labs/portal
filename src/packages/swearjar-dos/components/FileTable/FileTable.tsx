import { type MouseEvent, type ReactNode } from "react";
import { cx } from "../tone";
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
  expanded?: boolean;
  selected?: boolean;
  current?: boolean;
  href?: string;
  // Rows without a click (e.g. keyboard activation) pass no event.
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

function Control({ item }: { item: FileTableItem }) {
  const content =
    item.kind === "dir" ? (
      <>
        <span className={styles.mark} aria-hidden="true">
          {item.expanded ? "[-]" : "[+]"}
        </span>
        <span className={styles.name}>{item.name}</span>
      </>
    ) : (
      <span className={styles.name}>{item.name}</span>
    );

  if (item.href) {
    return (
      <a
        id={item.id}
        className={styles.control}
        href={item.href}
        aria-current={item.current ? "true" : undefined}
        onClick={item.onActivate}
        onKeyDown={(event) => {
          // A link activates natively on Enter only; Space is the button idiom
          // the file list shares, so the row forwards it like a click.
          if (event.key !== " ") return;
          event.preventDefault();
          item.onActivate?.();
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      id={item.id}
      type="button"
      className={styles.control}
      aria-expanded={item.kind === "dir" ? item.expanded : undefined}
      aria-current={item.current ? "true" : undefined}
      onClick={item.onActivate}
    >
      {content}
    </button>
  );
}

const cellContent: Record<string, ((item: FileTableItem) => ReactNode) | undefined> = {
  name: (item) => <Control item={item} />,
  type: (item) => item.type,
  size: (item) => item.size,
};

const cellClass: Record<string, string | undefined> = {
  type: styles.type,
  size: styles.size,
};

export function FileTable({
  columns,
  items,
  label,
  footer,
  onFooterActivate,
  footerActionLabel,
  className,
}: FileTableProps) {
  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.scroll}>
        <table className={styles.table} aria-label={label}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cx(styles.cell, styles.head, column.align === "right" && styles.right)}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={cx(
                  styles.row,
                  item.kind === "dir" && styles.dir,
                  item.kind === "exe" && styles.exe,
                  item.selected && styles.selected,
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cx(
                      styles.cell,
                      column.align === "right" && styles.right,
                      cellClass[column.id],
                    )}
                  >
                    {column.render ? column.render(item) : cellContent[column.id]?.(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? (
        onFooterActivate ? (
          <button
            type="button"
            className={cx(styles.footer, styles.footerButton)}
            aria-label={footerActionLabel}
            onClick={onFooterActivate}
          >
            {footer}
          </button>
        ) : (
          <div className={styles.footer}>{footer}</div>
        )
      ) : null}
    </div>
  );
}

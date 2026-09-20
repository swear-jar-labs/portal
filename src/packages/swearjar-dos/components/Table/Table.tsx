import { type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { DOS_ROW_ATTR, DOS_SCROLL_ATTR } from "../../attributes";
import { cx } from "../tone";
import styles from "./Table.module.css";

export type TableRowAction = {
  id: string;
  content: ReactNode;
  href?: string;
  current?: boolean;
  expanded?: boolean;
  onActivate?: (event?: MouseEvent<HTMLElement>) => void;
  className?: string;
  rowActivation?: boolean;
};

export type TableColumn<Item> = {
  id: string;
  label: string;
  width?: string;
  minWidth?: string;
  align?: "left" | "right";
  className?: string;
  render?: (item: Item) => ReactNode;
  action?: (item: Item) => TableRowAction;
};

export type TableProps<Item> = {
  columns: readonly TableColumn<Item>[];
  items: readonly Item[];
  rowKey: (item: Item) => string;
  label?: string;
  footer?: ReactNode;
  onFooterActivate?: () => void;
  footerActionLabel?: string;
  className?: string;
  fill?: boolean;
  minWidth?: string;
  rowClassName?: (item: Item) => string | undefined;
  selected?: (item: Item) => boolean;
  highlightFocusedRow?: boolean;
  navigationBoundary?: boolean;
  rowAttribute?: string;
};

function Action({ action }: { action: TableRowAction }) {
  function handleLinkKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.key !== " " || !action.onActivate) return;
    event.preventDefault();
    action.onActivate();
  }

  if (action.href) {
    return (
      <a
        id={action.id}
        className={cx(styles.control, action.className)}
        href={action.href}
        aria-current={action.current ? "true" : undefined}
        aria-expanded={action.expanded}
        onClick={action.onActivate}
        onKeyDown={action.onActivate ? handleLinkKeyDown : undefined}
      >
        {action.content}
      </a>
    );
  }

  return (
    <button
      id={action.id}
      type="button"
      className={cx(styles.control, action.className)}
      aria-current={action.current ? "true" : undefined}
      aria-expanded={action.expanded}
      onClick={action.onActivate}
    >
      {action.content}
    </button>
  );
}

export function Table<Item>({
  columns,
  items,
  rowKey,
  label,
  footer,
  onFooterActivate,
  footerActionLabel,
  className,
  fill = false,
  minWidth,
  rowClassName,
  selected,
  highlightFocusedRow = false,
  navigationBoundary = false,
  rowAttribute,
}: TableProps<Item>) {
  return (
    <div className={cx(styles.wrap, fill && styles.fill, className)}>
      <div
        className={styles.scroll}
        {...(navigationBoundary ? { [DOS_SCROLL_ATTR]: "" } : undefined)}
      >
        <table
          className={styles.table}
          aria-label={label}
          style={minWidth ? { minWidth } : undefined}
        >
          <colgroup>
            {columns.map((column) => (
              // A column with a width keeps it; a column with only a min-width
              // stays flexible and absorbs the table's spare space (its floor is
              // the table's own min-width).
              <col key={column.id} style={{ width: column.width, minWidth: column.minWidth }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cx(styles.cell, styles.head, column.align === "right" && styles.right)}
                  style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const cells = columns.map((column) => ({
                column,
                action: column.action?.(item),
              }));
              const activatesRow = cells.some((cell) => cell.action?.rowActivation === true);
              return (
                <tr
                  key={rowKey(item)}
                  {...{
                    [DOS_ROW_ATTR]: "",
                    ...(rowAttribute === undefined ? {} : { [rowAttribute]: "" }),
                  }}
                  className={cx(
                    styles.row,
                    activatesRow && styles.rowAction,
                    selected?.(item) && styles.selected,
                    highlightFocusedRow && styles.highlightFocused,
                    rowClassName?.(item),
                  )}
                >
                  {cells.map(({ column, action }) => (
                    <td
                      key={column.id}
                      className={cx(
                        styles.cell,
                        column.align === "right" && styles.right,
                        column.className,
                      )}
                      style={column.minWidth ? { minWidth: column.minWidth } : undefined}
                    >
                      {action ? <Action action={action} /> : column.render?.(item)}
                    </td>
                  ))}
                </tr>
              );
            })}
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

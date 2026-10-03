"use client";

import * as RadixMenubar from "@radix-ui/react-menubar";
import { cx } from "../tone";
import styles from "./MenuBar.module.css";

export type MenuBarEntry = {
  id: string;
  label: string;
  /** The activation key, shown after a dotted leader; announced as the shortcut. */
  hint?: string;
  onSelect: () => void;
  disabled?: boolean;
};

export type MenuBarMenu = {
  id: string;
  label: string;
  entries: MenuBarEntry[];
};

export type MenuBarProps = {
  menus: MenuBarMenu[];
  className?: string;
};

export function MenuBar({ menus, className }: MenuBarProps) {
  return (
    <RadixMenubar.Root className={cx(styles.root, className)}>
      {menus.map((menu) => (
        <RadixMenubar.Menu key={menu.id}>
          <RadixMenubar.Trigger className={styles.trigger}>{menu.label}</RadixMenubar.Trigger>
          <RadixMenubar.Portal>
            <RadixMenubar.Content className={styles.content} sideOffset={0}>
              {menu.entries.map((entry) => (
                <RadixMenubar.Item
                  key={entry.id}
                  className={styles.item}
                  disabled={entry.disabled}
                  aria-keyshortcuts={entry.hint}
                  onSelect={entry.onSelect}
                >
                  <span className={styles.label}>{entry.label}</span>
                  {entry.hint && (
                    <span className={styles.hint} aria-hidden="true">
                      {entry.hint}
                    </span>
                  )}
                </RadixMenubar.Item>
              ))}
            </RadixMenubar.Content>
          </RadixMenubar.Portal>
        </RadixMenubar.Menu>
      ))}
    </RadixMenubar.Root>
  );
}

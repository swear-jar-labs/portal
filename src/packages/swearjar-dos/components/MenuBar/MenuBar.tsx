"use client";

import * as RadixMenubar from "@radix-ui/react-menubar";
import { type ReactNode } from "react";
import { cx } from "../tone";
import styles from "./MenuBar.module.css";

export type MenuBarEntry =
  | { kind?: "item"; id: string; label: string; onSelect: () => void; disabled?: boolean }
  | { kind: "separator" };

export type MenuBarMenu = {
  id: string;
  label: string;
  entries: MenuBarEntry[];
};

export type MenuBarProps = {
  menus: MenuBarMenu[];
  brand?: ReactNode;
  className?: string;
};

export function MenuBar({ menus, brand, className }: MenuBarProps) {
  return (
    <RadixMenubar.Root className={cx(styles.root, className)}>
      {menus.map((menu) => (
        <RadixMenubar.Menu key={menu.id}>
          <RadixMenubar.Trigger className={styles.trigger}>
            {menu.label}
          </RadixMenubar.Trigger>
          <RadixMenubar.Portal>
            <RadixMenubar.Content className={styles.content} sideOffset={0}>
              {menu.entries.map((entry, index) =>
                entry.kind === "separator" ? (
                  <RadixMenubar.Separator
                    key={`separator-${index}`}
                    className={styles.separator}
                  />
                ) : (
                  <RadixMenubar.Item
                    key={entry.id}
                    className={styles.item}
                    disabled={entry.disabled}
                    onSelect={entry.onSelect}
                  >
                    {entry.label}
                  </RadixMenubar.Item>
                ),
              )}
            </RadixMenubar.Content>
          </RadixMenubar.Portal>
        </RadixMenubar.Menu>
      ))}
      {brand ? <span className={styles.brand}>{brand}</span> : null}
    </RadixMenubar.Root>
  );
}

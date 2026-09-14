"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { useRef, type ReactNode } from "react";
import { Window } from "../Window/Window";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "error";
};

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  tone = "default",
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          ref={contentRef}
          className={styles.content}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            contentRef.current?.focus();
          }}
          onKeyDown={(event) => {
            if (event.defaultPrevented || event.repeat) return;
            if (event.nativeEvent.isComposing) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.target !== event.currentTarget) return;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onOpenChange(false);
          }}
        >
          <Window
            title={
              <RadixDialog.Title asChild>
                <span>{title}</span>
              </RadixDialog.Title>
            }
            tone={tone}
            onClose={() => onOpenChange(false)}
            footer={footer}
          >
            {children}
          </Window>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

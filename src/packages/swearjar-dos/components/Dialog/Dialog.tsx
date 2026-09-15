"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { useCallback, useRef, type ReactNode } from "react";
import { DOS_WINDOW_BODY_ATTR } from "../../attributes";
import { Window } from "../Window/Window";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "error";
  closeLabel?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  tone = "default",
  closeLabel,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Action buttons live in the window body; the title-bar [X] is not part of
  // the arrow cycle (Tab still reaches it).
  const actionButtons = useCallback((): HTMLElement[] => {
    const body = contentRef.current?.querySelector(`[${DOS_WINDOW_BODY_ATTR}]`);
    return body ? Array.from(body.querySelectorAll("button")) : [];
  }, []);

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
            const [first] = actionButtons();
            (first ?? contentRef.current)?.focus();
          }}
          onKeyDown={(event) => {
            if (event.defaultPrevented || event.repeat) return;
            if (event.nativeEvent.isComposing) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              const buttons = actionButtons();
              if (buttons.length < 2) return;
              const active = document.activeElement;
              const current = active instanceof HTMLElement ? buttons.indexOf(active) : -1;
              const step = event.key === "ArrowRight" ? 1 : -1;
              // Focus outside the buttons (surface, [X]) enters the row from its edge.
              const start = current === -1 ? (step === 1 ? -1 : 0) : current;
              const next = buttons[(start + step + buttons.length) % buttons.length];
              if (!next) return;
              event.preventDefault();
              next.focus();
              return;
            }

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
            closeLabel={closeLabel}
            footer={footer}
          >
            {children}
          </Window>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { useCallback, useRef, type ReactNode } from "react";
import { DOS_WINDOW_BODY_ATTR } from "../../attributes";
import { FOCUSABLE_SELECTOR, nextControlIndex } from "../../focus";
import { cx } from "../tone";
import { Window } from "../Window/Window";
import styles from "./Dialog.module.css";

const ARROW_STEP: Record<string, 1 | -1> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

const VERTICAL_KEYS = ["ArrowUp", "ArrowDown"];

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "error";
  closeLabel?: string;
  className?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  tone = "default",
  closeLabel,
  className,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const body = useCallback(
    () => contentRef.current?.querySelector<HTMLElement>(`[${DOS_WINDOW_BODY_ATTR}]`) ?? null,
    [],
  );

  // Controls of the window body, in DOM order: the arrow cycle. The title-bar
  // [X] is not part of it (Tab still reaches it natively).
  const controls = useCallback((): HTMLElement[] => {
    const node = body();
    return node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
  }, [body]);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          ref={contentRef}
          className={cx(styles.content, className)}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const [first] = controls();
            // With no controls the body itself takes focus: it is the scroll
            // region, so ↑/↓ scroll a long text (HELP) natively.
            (first ?? body() ?? contentRef.current)?.focus();
          }}
          onKeyDown={(event) => {
            if (event.defaultPrevented || event.repeat) return;
            if (event.nativeEvent.isComposing) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            const step = ARROW_STEP[event.key];
            if (step) {
              const list = controls();
              if (list.length === 0) return;
              const active = document.activeElement;
              const current = active instanceof HTMLElement ? list.indexOf(active) : -1;
              // On the surface ↑/↓ stay native (they scroll the body); ←/→
              // enter the control row from its edge. Inside the controls all
              // four arrows cycle with wrap-around.
              if (current === -1 && VERTICAL_KEYS.includes(event.key)) return;
              const next = list[nextControlIndex(list.length, current, step)];
              if (!next) return;
              event.preventDefault();
              next.focus();
              return;
            }

            // Enter/Space on the surface close the window; on a control they
            // activate it natively.
            const target = event.target instanceof HTMLElement ? event.target : null;
            if (target !== event.currentTarget && target !== body()) return;
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

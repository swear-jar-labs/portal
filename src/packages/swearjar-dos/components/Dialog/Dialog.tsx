"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { useCallback, useRef, type ReactNode } from "react";
import { DOS_WINDOW_BODY_ATTR } from "../../attributes";
import { FOCUSABLE_SELECTOR } from "../../focus";
import { hasCommandModifier, shouldSkipEvent } from "../../keyboard";
import { useControlWalk } from "../../walk";
import { cx, type Surface } from "../tone";
import { Window } from "../Window/Window";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "error";
  surface?: Surface;
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
  surface,
  closeLabel,
  className,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const body = useCallback(
    () => contentRef.current?.querySelector<HTMLElement>(`[${DOS_WINDOW_BODY_ATTR}]`) ?? null,
    [],
  );

  // Controls of the window body, in DOM order: the autofocus target. The
  // title-bar [X] is not part of it (Tab still reaches it natively).
  const controls = useCallback((): HTMLElement[] => {
    const node = body();
    return node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
  }, [body]);

  // The body is the walk region: a flat list (no marked rows), so all four
  // arrows step through the controls; with no controls the arrows stay native,
  // and on the body surface ↑/↓ scroll a long text (HELP).
  const region = useCallback(
    (target: Element): Element | null => {
      const node = body();
      return node !== null && node.contains(target) ? node : null;
    },
    [body],
  );

  useControlWalk({ region, enabled: open });

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
            if (shouldSkipEvent(event.nativeEvent)) return;
            if (hasCommandModifier(event.nativeEvent)) return;
            // Holding Enter or Space is still one close.
            if (event.repeat) return;

            // Enter/Space on the surface close the window; on a control they
            // activate it natively. The arrows belong to the kit's walk.
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
            surface={surface}
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

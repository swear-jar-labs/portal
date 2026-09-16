"use client";

import { type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../tone";

export type FormProps = {
  children: ReactNode;
  onSubmit: () => void;
  ariaLabel?: string;
  className?: string;
};

// Native <form> wrapper: the kit owns intrinsic elements, the app only composes
// components. noValidate keeps validation ours (zod + Field error messages).
// Control-to-control keys (↑/↓) belong to the shell's panel model, not here:
// the same walk covers links and buttons outside a form.
// Shift+Enter is the form's submit accelerator: Enter itself belongs to the
// focused control (a checkbox toggles, a textarea keeps its newline). Buttons
// and links stay out of it — they keep their native activation (a link opens
// in a new tab on Shift+Enter).
export function Form({ children, onSubmit, ariaLabel, className }: FormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    if (event.key !== "Enter" || !event.shiftKey) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return;
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className={cx(className)}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      noValidate
    >
      {children}
    </form>
  );
}

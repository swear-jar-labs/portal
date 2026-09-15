"use client";

import { type FormEvent, type ReactNode } from "react";
import { cx } from "../tone";

export type FormProps = {
  children: ReactNode;
  onSubmit: () => void;
  ariaLabel?: string;
  className?: string;
};

// Native <form> wrapper: the kit owns intrinsic elements, the app only composes
// components. noValidate keeps validation ours (zod + Field error messages).
export function Form({ children, onSubmit, ariaLabel, className }: FormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={cx(className)} onSubmit={handleSubmit} aria-label={ariaLabel} noValidate>
      {children}
    </form>
  );
}

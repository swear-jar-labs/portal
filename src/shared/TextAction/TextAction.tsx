"use client";

import { Button } from "@swearjar/dos";
import styles from "./TextAction.module.css";

type TextActionProps = {
  children: string;
  onClick: () => void;
  bracketed?: boolean;
  id?: string;
  disabled?: boolean;
};

/** A plain text action can carry DOS brackets without changing its accessible name. */
export function TextAction({
  children,
  onClick,
  bracketed = false,
  id,
  disabled,
}: TextActionProps) {
  return (
    <Button
      id={id}
      variant="ghost"
      ariaLabel={children}
      className={bracketed ? styles.bracketed : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

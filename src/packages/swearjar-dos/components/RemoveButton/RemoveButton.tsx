"use client";

import { Button } from "../Button/Button";

const REMOVE_GLYPH = "[×]";

export type RemoveButtonProps = {
  ariaLabel: string;
  onClick: () => void;
  className?: string;
};

/** The DOS remove control: a ghost [×] button with the caller's accessible
 * name (the removed item's label lives with the consumer's messages). */
export function RemoveButton({ ariaLabel, onClick, className }: RemoveButtonProps) {
  return (
    <Button variant="ghost" ariaLabel={ariaLabel} onClick={onClick} className={className}>
      {REMOVE_GLYPH}
    </Button>
  );
}

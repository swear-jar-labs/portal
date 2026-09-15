"use client";

import { useEffect, useRef } from "react";

// Radix DismissableLayer would otherwise close the dialog during the boot→shell swap.
const WELCOME_DELAY_MS = 50;

export function useWelcomeDialog(enabled: boolean, open: () => void) {
  const shown = useRef(false);

  useEffect(() => {
    if (!enabled || shown.current) return;
    const timer = window.setTimeout(() => {
      if (shown.current) return;
      shown.current = true;
      open();
    }, WELCOME_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, open]);
}

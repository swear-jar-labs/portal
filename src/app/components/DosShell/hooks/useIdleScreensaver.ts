"use client";

import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["keydown", "pointerdown", "pointermove", "wheel", "touchstart"] as const;

export function useIdleScreensaver(delayMs: number, enabled: boolean) {
  const [active, setActive] = useState(false);
  // Read by the capture listener without re-arming it on every wake.
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!enabled) return;

    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setActive(true), delayMs);
    };

    const onActivity = (event: Event) => {
      if (activeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setActive(false);
      }
      arm();
    };

    arm();
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { capture: true, passive: false });
    }

    return () => {
      window.clearTimeout(timer);
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity, { capture: true });
      }
    };
  }, [delayMs, enabled]);

  return active;
}

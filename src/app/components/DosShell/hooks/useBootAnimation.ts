"use client";

import { useEffect, useRef, useState } from "react";
import { BOOT_REDUCED_DONE_MS, buildBootSchedule } from "../boot";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

export function useBootAnimation(lineCount: number, visible: boolean, onDone: () => void) {
  const [revealed, setRevealed] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (!visible) return;

    const timers: number[] = [];
    const done = () => onDoneRef.current();

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      timers.push(window.setTimeout(() => setRevealed(lineCount + 1), 0));
      timers.push(window.setTimeout(done, BOOT_REDUCED_DONE_MS));
    } else {
      const { steps, doneAt } = buildBootSchedule(lineCount);
      for (const step of steps) {
        timers.push(window.setTimeout(() => setRevealed(step.revealed), step.at));
      }
      timers.push(window.setTimeout(done, doneAt));
    }

    const skipKey = (event: KeyboardEvent) => {
      if (MODIFIER_KEYS.has(event.key)) return;
      window.removeEventListener("keydown", skipKey);
      done();
    };
    window.addEventListener("keydown", skipKey);
    window.addEventListener("click", done, { once: true });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("keydown", skipKey);
      window.removeEventListener("click", done);
    };
  }, [lineCount, visible]);

  return revealed;
}

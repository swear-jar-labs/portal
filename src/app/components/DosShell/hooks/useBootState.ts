"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bootFadeMs } from "@/content/settings";
import { useBootAnimation } from "./useBootAnimation";

export type BootPhase = "booting" | "closing" | "ready";

export function useBootState(lineCount: number) {
  const [phase, setPhase] = useState<BootPhase>("booting");
  const finished = useRef(false);
  const fadeTimer = useRef(0);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setPhase("closing");
    fadeTimer.current = window.setTimeout(() => setPhase("ready"), bootFadeMs);
  }, []);

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  const revealed = useBootAnimation(lineCount, phase === "booting", finish);

  return { phase, revealed, finish };
}

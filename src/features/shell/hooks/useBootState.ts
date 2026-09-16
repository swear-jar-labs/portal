"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bootFadeMs } from "@/content/settings";
import { useBootAnimation } from "./useBootAnimation";

export type BootPhase = "booting" | "closing" | "ready";

export function useBootState(enabled: boolean, lineCount: number) {
  const [phase, setPhase] = useState<BootPhase>(enabled ? "booting" : "ready");
  const [bootFired, setBootFired] = useState(false);
  const finished = useRef(false);
  const fadeTimer = useRef(0);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setBootFired(true);
    setPhase("closing");
    fadeTimer.current = window.setTimeout(() => setPhase("ready"), bootFadeMs);
  }, []);

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  const revealed = useBootAnimation(lineCount, enabled && phase === "booting", finish);

  return { phase, revealed, bootFired };
}

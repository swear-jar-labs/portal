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

  // The boot belongs to the home route only: off home the shell is ready at
  // once (a member opening the site lands on FORUM). Adjusted during render
  // (React pattern): no timers, so a remount can never strand the phase
  // mid-transition. bootFired stays false here: no boot ran, no CRT
  // switch-on either.
  if (!enabled && phase !== "ready") setPhase("ready");

  const revealed = useBootAnimation(lineCount, enabled && phase === "booting", finish);

  return { phase, revealed, bootFired };
}

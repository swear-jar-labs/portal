"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CommandId, KeyDef } from "@/content/commands";
import { shouldSkipEvent } from "./keyboard";

export function useFunctionKeys(
  keyDefs: readonly KeyDef[],
  run: (command: CommandId) => void,
  enabled: boolean,
) {
  const runRef = useRef(run);
  const byKey = useMemo(() => new Map(keyDefs.map((def) => [def.key, def.command])), [keyDefs]);

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldSkipEvent(event)) return;
      const command = byKey.get(event.key);
      if (!command) return;
      // Swallow F-keys even while disabled so the browser does not act on them (e.g. F5 reload).
      event.preventDefault();
      if (!enabled || event.repeat) return;
      runRef.current(command);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [byKey, enabled]);
}

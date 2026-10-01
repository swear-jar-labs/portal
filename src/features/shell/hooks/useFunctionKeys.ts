"use client";

import { useEffect, useMemo, useRef } from "react";
import { hasCommandModifier, shouldSkipEvent } from "@swearjar/dos";
import type { CommandId, KeyDef } from "@/content/commands";

export function useFunctionKeys(
  keyDefs: readonly KeyDef[],
  run: (command: CommandId) => void,
  enabled: boolean,
) {
  const runRef = useRef(run);
  const byKey = useMemo(
    () => new Map<string, KeyDef>(keyDefs.map((def) => [def.key, def])),
    [keyDefs],
  );

  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldSkipEvent(event) || hasCommandModifier(event)) return;
      const definition = byKey.get(event.key);
      if (!definition) return;
      // Swallow F-keys even while disabled so the browser does not act on them (e.g. F5 reload).
      event.preventDefault();
      if (!enabled || definition.disabled || event.repeat) return;
      runRef.current(definition.command);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [byKey, enabled]);
}

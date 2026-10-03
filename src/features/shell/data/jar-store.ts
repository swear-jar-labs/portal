"use client";

import { useSyncExternalStore } from "react";
import type { JarEvent } from "../model/jar";

// The jar's session memory: bad-command events with client timestamps. The
// dialog counts the sliding 24h window over them; everything dies with the
// page reload, the server snapshot is always empty. Phase 5 replaces this
// with jar_events and the same signatures.

let events: readonly JarEvent[] = [];
const listeners = new Set<() => void>();
const EMPTY_JAR_EVENTS: readonly JarEvent[] = [];

function emit(): void {
  for (const listener of listeners) listener();
}

/** A miss feeds the jar: the raw line as typed, timestamped on arrival. */
export function recordBadCommand(raw: string, at: number = Date.now()): void {
  events = [...events, { at, raw }];
  emit();
}

export function subscribeJar(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function jarSnapshot(): readonly JarEvent[] {
  return events;
}

export function jarServerSnapshot(): readonly JarEvent[] {
  return EMPTY_JAR_EVENTS;
}

/** Test isolation for the module-level session memory. */
export function resetJarForTests(): void {
  events = [];
  emit();
}

/** The session's bad-command events, oldest first. */
export function useJarEvents(): readonly JarEvent[] {
  return useSyncExternalStore(subscribeJar, jarSnapshot, jarServerSnapshot);
}

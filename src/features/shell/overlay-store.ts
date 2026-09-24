// The universal overlay chain: one entry per intercepted route, in push
// order. The key is the pathname (query-only navigations upsert in place),
// the panels are the layer's bodies (a manage form is a second panel of the
// same entry). Section stacks render these entries as the top layers of their
// PanelStack; pages without a stack render them in the fallback OverlayHost.
//
// Retention: feed → project → member reads [project, member] — the base page
// stays mounted under the intercept, so the chain mirrors the visible stack.
// Returning to an existing key truncates everything above it and replaces its
// panels (browser back re-registers as it walks). A repeated push of the same
// pathname therefore drops the entries between — an accepted trade-off, back
// restores them by re-registration. Held (non-top) entries go stale until
// revisited: they are inert and only their title bar shows.
//
// unregister is a no-op by design: React runs the unmounting layer's cleanup
// before the new layer's effects, so deleting on cleanup would drop the
// parent (project under member) on every push. The chain is cleaned only
// explicitly: default → clear, revisit → truncate.

"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

export type OverlayPanel = { title: string; body: ReactNode };
export type OverlayLayer = {
  key: string;
  panels: readonly OverlayPanel[];
  // The route's tab title (soft navigations skip the slot's metadata).
  documentTitle?: string;
};

export type OverlayStore = {
  /** Push a layer, or truncate above and replace the panels of the same pathname. */
  register: (key: string, panels: readonly OverlayPanel[], documentTitle?: string) => void;
  /** Drop the whole chain: the slot's default renders on routes without an interceptor. */
  clear: () => void;
  /**
   * No-op by design (see the module header): the outlet's cleanup must not
   * delete the entry, or the parent layer vanishes under every push.
   */
  unregister: () => void;
  /** A section stack claims the host role while mounted; returns the release. */
  claimHost: () => () => void;
  layers: () => readonly OverlayLayer[];
  hosts: () => number;
  subscribe: (listener: () => void) => () => void;
  resetForTests: () => void;
};

export function createOverlayStore(): OverlayStore {
  let layers: OverlayLayer[] = [];
  let hosts = 0;
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of listeners) listener();
  }

  return {
    register(key, panels, documentTitle) {
      const index = layers.findIndex((entry) => entry.key === key);
      if (index === -1) {
        layers = [...layers, { key, panels, documentTitle }];
      } else {
        layers = [...layers.slice(0, index), { key, panels, documentTitle }];
      }
      emit();
    },
    clear() {
      if (layers.length === 0) return;
      layers = [];
      emit();
    },
    unregister() {
      // Intentionally empty.
    },
    claimHost() {
      hosts += 1;
      emit();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        hosts = Math.max(0, hosts - 1);
        emit();
      };
    },
    layers: () => layers,
    hosts: () => hosts,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    resetForTests() {
      layers = [];
      hosts = 0;
      emit();
    },
  };
}

const store = createOverlayStore();

/** Push a layer or replace the panels of the same pathname (query-only upsert). */
export function registerOverlay(
  key: string,
  panels: readonly OverlayPanel[],
  documentTitle?: string,
): void {
  store.register(key, panels, documentTitle);
}

/** Drop the whole chain: the slot's default renders on routes without an interceptor. */
export function clearOverlay(): void {
  store.clear();
}

/**
 * No-op by design (see the module header): the outlet's cleanup must not
 * delete the entry, or the parent layer vanishes under every push.
 */
export function unregisterOverlay(): void {
  store.unregister();
}

/** A section stack claims the host role while mounted (fallback host yields). */
export function claimOverlayHost(): () => void {
  return store.claimHost();
}

/** Test seam: reset the module state between cases. */
export function resetOverlayForTests(): void {
  store.resetForTests();
}

/** Whether the chain holds at least one layer (the outlet's direct guard). */
export function hasOverlayLayers(): boolean {
  return store.layers().length > 0;
}

const EMPTY_LAYERS: readonly OverlayLayer[] = [];

export function useOverlayLayers(): readonly OverlayLayer[] {
  return useSyncExternalStore(
    store.subscribe,
    () => store.layers(),
    () => EMPTY_LAYERS,
  );
}

/** Whether at least one section stack is mounted (the fallback host yields). */
export function useOverlayHostClaimed(): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.hosts() > 0,
    () => false,
  );
}

/** Claim the host role while the calling stack is mounted. */
export function useOverlayHostClaim(): void {
  // The claim is a mount effect: StrictMode mounts, unmounts (release runs),
  // and remounts (claim runs again) — balanced by the release closure.
  useEffect(() => store.claimHost(), []);
}

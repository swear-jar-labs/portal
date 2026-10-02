"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  hydrateModerationStore,
  moderationHydratedServerSnapshot,
  moderationHydratedSnapshot,
  moderationServerSnapshot,
  moderationSnapshot,
  subscribeModeration,
} from "./store";

export function useModeration() {
  useEffect(hydrateModerationStore, []);
  return useSyncExternalStore(subscribeModeration, moderationSnapshot, moderationServerSnapshot);
}

export function useModerationHydrated(): boolean {
  return useSyncExternalStore(
    subscribeModeration,
    moderationHydratedSnapshot,
    moderationHydratedServerSnapshot,
  );
}

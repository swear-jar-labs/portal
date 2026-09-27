"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  hydrateModerationStore,
  moderationServerSnapshot,
  moderationSnapshot,
  subscribeModeration,
} from "./store";

export function useModeration() {
  useEffect(hydrateModerationStore, []);
  return useSyncExternalStore(subscribeModeration, moderationSnapshot, moderationServerSnapshot);
}

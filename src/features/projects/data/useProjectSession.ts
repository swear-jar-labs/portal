"use client";

import { useSyncExternalStore } from "react";
import * as projectStore from "./project-store";

/** The store snapshot for the project islands: they subscribe to the same
 * module memory the tickets' dossier reads through the contract. */
export function useProjectPolicyState() {
  return useSyncExternalStore(
    projectStore.subscribeProjectStore,
    projectStore.projectStoreSnapshot,
    projectStore.projectStoreServerSnapshot,
  );
}

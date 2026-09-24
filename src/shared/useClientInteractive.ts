import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function clientInteractive() {
  return true;
}

function serverInteractive() {
  return false;
}

// Client interactivity for the mock forms: server-rendered markup ships with
// its fieldsets disabled, so an early click before hydration cannot turn a
// mock submit into a native GET with the draft in the URL. The snapshot is
// static, so hydration flips it exactly once.
export function useClientInteractive(): boolean {
  return useSyncExternalStore(subscribe, clientInteractive, serverInteractive);
}

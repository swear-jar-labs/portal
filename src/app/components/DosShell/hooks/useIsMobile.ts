"use client";

import { useSyncExternalStore } from "react";

// Mirrors the 720px breakpoint in base.css and component CSS modules (media queries cannot read CSS vars).
const MOBILE_QUERY = "(max-width: 720px)";
const mobileQuery = () => window.matchMedia(MOBILE_QUERY);

function subscribe(onChange: () => void) {
  const query = mobileQuery();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  return mobileQuery().matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

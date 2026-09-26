"use client";

import { useCallback, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { isPlainActivation } from "@/lib/activation";
import { stackMemory } from "../stack-memory";

type OverlayActivation = (event?: MouseEvent<HTMLElement>) => void;
type OverlayPush = (href: string, originId?: string | null) => OverlayActivation;

/**
 * The click handler factory for links that must open as an overlay layer: a
 * plain activation replaces the native navigation with a SPA push, records
 * the stable origin for the focus return, and lets the root slot intercept
 * the route above the current stack. Modified clicks keep the native tab
 * behavior. Consumers attach the result to the kit Link's onClick (or a
 * Card's onActivate).
 */
export function useOverlayPush(): OverlayPush {
  const router = useRouter();

  return useCallback<OverlayPush>(
    (href, originId = null) =>
      (event) => {
        if (!isPlainActivation(event)) return;
        event?.preventDefault();
        stackMemory.rememberOverlayPush(href, originId ?? null);
        router.push(href);
      },
    [router],
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChildrenPath } from "./children-path";
import {
  hasOverlayLayers,
  registerOverlay,
  unregisterOverlay,
  type OverlayPanel,
} from "./overlay-store";

export type OverlayOutletProps = {
  panels: readonly OverlayPanel[];
  // The route's tab title for the browser chrome: parallel-route metadata is
  // not applied on a soft navigation (the base page's title wins), so the
  // store carries the title and OverlayDocumentTitle syncs it.
  documentTitle?: string;
};

/**
 * A routed RSC body registers itself with the mounted section stack and
 * renders nowhere else. This removes the timing dependency between pathname
 * and the parallel slot's streamed payload (the MemberLayerOutlet pattern,
 * generalized to every overlay type).
 *
 * The key is the pathname: query-only navigations re-render the interceptor
 * with new searchParams and upsert the same entry. The cleanup is a no-op by
 * design — React runs it before the next layer's effects, so deleting here
 * would drop the parent layer under every push (see overlay-store).
 *
 * A query-only navigation on a direct page matches the interceptor too (Next
 * intercepts the route the slot already shows), while the children render the
 * page's own layer: registering there would duplicate the panel, so the
 * direct case (children show exactly this pathname) stays out of the store.
 */
export function OverlayOutlet({ panels, documentTitle }: OverlayOutletProps) {
  const key = usePathname();
  const childrenPath = useChildrenPath();
  // Query-only navigation on a direct page: the children show this very
  // pathname and no store layer is open, so the page's own layer must not be
  // duplicated. A cross-route push to the same path (a ticket's project link
  // over the direct project page) leaves the store non-empty and registers.
  const direct = childrenPath !== null && childrenPath === key && !hasOverlayLayers();

  useEffect(() => {
    if (direct) return;
    registerOverlay(key, panels, documentTitle);
    return unregisterOverlay;
  }, [direct, documentTitle, key, panels]);

  return null;
}

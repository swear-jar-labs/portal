"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MemberLayerContextValue = {
  layer: ReactNode;
  register: (layer: ReactNode) => void;
  unregister: () => void;
};

const MemberLayerContext = createContext<MemberLayerContextValue | null>(null);

function useMemberLayerContext(): MemberLayerContextValue {
  const context = useContext(MemberLayerContext);
  if (context === null) throw new Error("useMemberLayer must be used inside MemberLayerProvider");
  return context;
}

export function MemberLayerProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<ReactNode>(null);
  const register = useCallback((next: ReactNode) => setLayer(next), []);
  const unregister = useCallback(() => setLayer(null), []);
  const value = useMemo(() => ({ layer, register, unregister }), [layer, register, unregister]);

  return <MemberLayerContext value={value}>{children}</MemberLayerContext>;
}

export function useMemberLayer(): ReactNode {
  return useMemberLayerContext().layer;
}

/** A routed RSC body registers itself with the mounted BoardStack and renders
 * nowhere else. This removes the timing dependency between pathname and the
 * parallel slot's streamed payload. */
export function MemberLayerOutlet({ children }: { children: ReactNode }) {
  const { register, unregister } = useMemberLayerContext();

  useEffect(() => {
    register(children);
    return unregister;
  }, [children, register, unregister]);

  return null;
}

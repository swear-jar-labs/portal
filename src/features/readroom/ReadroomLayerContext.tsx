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

type ReadroomLayerContextValue = {
  layer: ReactNode;
  register: (layer: ReactNode) => void;
  unregister: () => void;
};

const ReadroomLayerContext = createContext<ReadroomLayerContextValue | null>(null);

function useReadroomLayerContext(): ReadroomLayerContextValue {
  const context = useContext(ReadroomLayerContext);
  if (context === null)
    throw new Error("useReadroomLayer must be used inside ReadroomLayerProvider");
  return context;
}

export function ReadroomLayerProvider({ children }: { children: ReactNode }) {
  const [layer, setLayer] = useState<ReactNode>(null);
  const register = useCallback((next: ReactNode) => setLayer(next), []);
  const unregister = useCallback(() => setLayer(null), []);
  const value = useMemo(() => ({ layer, register, unregister }), [layer, register, unregister]);

  return <ReadroomLayerContext value={value}>{children}</ReadroomLayerContext>;
}

export function useReadroomLayer(): ReactNode {
  return useReadroomLayerContext().layer;
}

/** A routed RSC body registers itself with the mounted ReadroomStack and renders
 * nowhere else. This removes the timing dependency between pathname and the
 * parallel slot's streamed payload. */
export function ReadroomLayerOutlet({ children }: { children: ReactNode }) {
  const { register, unregister } = useReadroomLayerContext();

  useEffect(() => {
    register(children);
    return unregister;
  }, [children, register, unregister]);

  return null;
}

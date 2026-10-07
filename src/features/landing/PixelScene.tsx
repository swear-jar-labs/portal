"use client";

import { useEffect, useRef } from "react";
import { paintPixelGrid, SCENE_GRIDS, type PixelSceneName } from "./scenes";
import styles from "./landing.module.css";

export type PixelSceneProps = {
  scene: PixelSceneName;
  label: string;
  className?: string;
};

// Paints the scene grid 1:1 with smoothing off, so pixels stay square at any
// scale (the CSS sizes the canvas up).
export function PixelScene({ scene, label, className }: PixelSceneProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) paintPixelGrid(ref.current, SCENE_GRIDS[scene]);
  }, [scene]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={className === undefined ? styles.scene : `${styles.scene} ${className}`}
    />
  );
}

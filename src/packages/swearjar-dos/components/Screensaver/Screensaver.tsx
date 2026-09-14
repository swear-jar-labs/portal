"use client";

import { useEffect, useRef } from "react";
import { cx } from "../tone";
import styles from "./Screensaver.module.css";

export type ScreensaverProps = {
  active?: boolean;
  title?: string;
  hint?: string;
  starCount?: number;
  className?: string;
};

type Star = {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
};

const FPS_INTERVAL = 42;

export function Screensaver({
  active = true,
  title = "STARFIELD.SCR",
  hint = "PRESS ANY KEY TO WAKE UP",
  starCount = 90,
  className,
}: ScreensaverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const stars: Star[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;

    const reset = (star: Star, anywhere: boolean) => {
      star.x = Math.random() * 2 - 1;
      star.y = Math.random() * 2 - 1;
      star.z = anywhere ? 0.25 + Math.random() * 0.75 : 1;
      star.px = Number.NaN;
      star.py = Number.NaN;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(80, Math.round(rect.width / 4));
      height = Math.max(60, Math.round(rect.height / 4));
      canvas.width = width;
      canvas.height = height;
      for (const star of stars) reset(star, true);
    };

    const draw = () => {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const focalX = width * 0.5;
      const focalY = height * 0.5;

      for (const star of stars) {
        star.z -= 0.02 + (1 - star.z) * 0.045;
        if (star.z <= 0.05) reset(star, false);

        const sx = centerX + (star.x / star.z) * focalX;
        const sy = centerY + (star.y / star.z) * focalY;

        const depth = 1 - star.z;
        const value = Math.round(70 + depth * 185);
        context.strokeStyle = `rgb(${value}, ${value}, ${value})`;
        context.lineWidth = 1;

        if (Number.isFinite(star.px) && Number.isFinite(star.py)) {
          context.beginPath();
          context.moveTo(star.px, star.py);
          context.lineTo(sx, sy);
          context.stroke();
        } else {
          context.fillStyle = `rgb(${value}, ${value}, ${value})`;
          context.fillRect(Math.round(sx), Math.round(sy), 1, 1);
        }

        star.px = sx;
        star.py = sy;
      }
    };

    const loop = (time: number) => {
      if (time - last >= FPS_INTERVAL) {
        draw();
        last = time;
      }
      frame = window.requestAnimationFrame(loop);
    };

    for (let index = 0; index < starCount; index += 1) {
      const star: Star = { x: 0, y: 0, z: 1, px: Number.NaN, py: Number.NaN };
      stars.push(star);
    }

    resize();
    if (reduceMotion) {
      draw();
    } else {
      frame = window.requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [active, starCount]);

  if (!active) return null;

  return (
    <div className={cx(styles.screensaver, className)}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Starfield screensaver"
      />
      <span className={styles.title}>{title}</span>
      <span className={styles.hint}>{hint}</span>
    </div>
  );
}

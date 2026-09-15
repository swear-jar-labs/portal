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

const FRAME_INTERVAL_MS = 42;
const DEFAULT_STAR_COUNT = 90;
const CANVAS_SCALE = 4;
const STAR_STEP_BASE = 0.02;
const STAR_STEP_DEPTH = 0.045;
const STAR_RESPAWN_Z = 0.25;
const STAR_MIN_Z = 0.05;
const STAR_MIN_BRIGHTNESS = 70;
const STAR_BRIGHTNESS_RANGE = 185;

export function Screensaver({
  active = false,
  title = "STARFIELD.SCR",
  hint = "PRESS ANY KEY TO WAKE UP",
  starCount = DEFAULT_STAR_COUNT,
  className,
}: ScreensaverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const background = getComputedStyle(canvas).getPropertyValue("--dos-black").trim() || "#000000";
    const stars: Star[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;

    const reset = (star: Star, anywhere: boolean) => {
      star.x = Math.random() * 2 - 1;
      star.y = Math.random() * 2 - 1;
      star.z = anywhere ? STAR_RESPAWN_Z + Math.random() * (1 - STAR_RESPAWN_Z) : 1;
      star.px = Number.NaN;
      star.py = Number.NaN;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(80, Math.round(rect.width / CANVAS_SCALE));
      height = Math.max(60, Math.round(rect.height / CANVAS_SCALE));
      canvas.width = width;
      canvas.height = height;
      for (const star of stars) reset(star, true);
    };

    const draw = () => {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const focalX = width * 0.5;
      const focalY = height * 0.5;

      for (const star of stars) {
        star.z -= STAR_STEP_BASE + (1 - star.z) * STAR_STEP_DEPTH;
        if (star.z <= STAR_MIN_Z) reset(star, false);

        const sx = centerX + (star.x / star.z) * focalX;
        const sy = centerY + (star.y / star.z) * focalY;

        const depth = 1 - star.z;
        const value = Math.round(STAR_MIN_BRIGHTNESS + depth * STAR_BRIGHTNESS_RANGE);
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
      if (time - last >= FRAME_INTERVAL_MS) {
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

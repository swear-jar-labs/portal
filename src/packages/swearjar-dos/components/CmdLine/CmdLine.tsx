"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Command } from "../../commands/types";
import { nextCompletion } from "../../commands/registry";
import { cx } from "../tone";
import styles from "./CmdLine.module.css";

export type CmdLineProps = {
  commands: Command[];
  onSubmit: (input: string) => void;
  onSubmitEmpty?: () => void;
  onNavigate?: (direction: "up" | "down") => void;
  captureDisabled?: boolean;
  prompt?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

export function CmdLine({
  commands,
  onSubmit,
  onSubmitEmpty,
  onNavigate,
  captureDisabled = false,
  prompt = "C:\\>",
  placeholder,
  ariaLabel = "Command line",
  className,
}: CmdLineProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mirror = mirrorRef.current;
    const input = inputRef.current;
    if (!mirror || !input) return;
    const sync = () => {
      input.style.width = `${mirror.getBoundingClientRect().width}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(mirror);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (captureDisabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1 || event.key === " ") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [role='menubar'], [role='menu'], [role='dialog']",
        )
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      setValue((current) => current + event.key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [captureDisabled]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const input = value.trim();
      setValue("");
      if (input) {
        onSubmit(input);
      } else {
        onSubmitEmpty?.();
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      const completion = nextCompletion(commands, value);
      if (completion) setValue(completion);
      return;
    }

    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && onNavigate) {
      event.preventDefault();
      onNavigate(event.key === "ArrowUp" ? "up" : "down");
      return;
    }

    if (event.key === "Escape") {
      setValue("");
    }
  }

  return (
    <div
      className={cx(styles.cmdLine, className)}
      onClick={(event) => {
        if (event.target === inputRef.current) return;
        inputRef.current?.focus();
      }}
    >
      <span className={styles.prompt} aria-hidden="true">
        {prompt}
      </span>
      <span ref={mirrorRef} className={styles.mirror} aria-hidden="true">
        {value || placeholder || ""}
      </span>
      <input
        ref={inputRef}
        className={styles.input}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label={ariaLabel}
      />
      <span className={styles.cursor} aria-hidden="true" />
    </div>
  );
}

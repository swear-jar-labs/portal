"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Command } from "../../commands/types";
import { nextCompletion } from "../../commands/registry";
import { DOS_ZONE_ATTR } from "../../attributes";
import { cx } from "../tone";
import styles from "./CmdLine.module.css";

export type CmdLineProps = {
  commands: readonly Command[];
  onSubmit: (input: string) => void;
  onSubmitEmpty?: () => void;
  onNavigate?: (direction: "up" | "down") => void;
  captureDisabled?: boolean;
  prompt?: string;
  placeholder?: string;
  ariaLabel?: string;
  // Keyboard zone of the line: Tab leaves through it to the consumer's
  // panel model (the shell routes it to the file list).
  zone?: string;
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
  zone,
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
          "input, textarea, select, [role='menubar'], [role='menu'], [role='dialog'], [role='combobox']",
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
    if (event.nativeEvent.isComposing) return;

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
      // Completion only while it changes the value; otherwise the Tab falls
      // through to the shell, which moves focus back to the file list.
      if (event.shiftKey || !value.trim()) return;
      const completion = nextCompletion(commands, value);
      if (!completion || completion === value) return;
      event.preventDefault();
      setValue(completion);
      return;
    }

    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && onNavigate) {
      event.preventDefault();
      onNavigate(event.key === "ArrowUp" ? "up" : "down");
      return;
    }

    if (event.key === "Escape") {
      if (value) {
        setValue("");
      } else {
        inputRef.current?.blur();
      }
    }
  }

  return (
    <div
      className={cx(styles.cmdLine, className)}
      {...(zone ? { [DOS_ZONE_ATTR]: zone } : undefined)}
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

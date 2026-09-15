"use client";

import { useEffect, useState } from "react";
import { Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";

const BREW_TICK_MS = 180;
const BREW_STEP_PERCENT = 8;
const BREW_DONE_PERCENT = 100;
const BAR_CELLS = 20;

export function CoffeeBody() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progress >= BREW_DONE_PERCENT) return;
    const timer = window.setTimeout(
      () => setProgress((value) => Math.min(BREW_DONE_PERCENT, value + BREW_STEP_PERCENT)),
      BREW_TICK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [progress]);

  const filled = Math.round((progress / BREW_DONE_PERCENT) * BAR_CELLS);

  return (
    <Stack gap={8}>
      <Text as="div">
        <Text as="span" tone="green">
          {"#".repeat(filled)}
        </Text>
        <Text as="span" tone="dim">
          {"-".repeat(BAR_CELLS - filled)}
        </Text>
        <Text as="span" tone="yellow">{` ${progress}%`}</Text>
      </Text>
      <Text as="div" tone="white">
        {progress >= BREW_DONE_PERCENT
          ? messages.shell.dialogs.coffee.done
          : messages.shell.dialogs.coffee.brewing}
      </Text>
    </Stack>
  );
}

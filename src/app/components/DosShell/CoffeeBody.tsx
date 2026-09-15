"use client";

import { useEffect, useState } from "react";
import { Stack, Text } from "@swearjar/dos";

export function CoffeeBody() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (progress >= 100) return;
    const timer = window.setTimeout(() => setProgress((value) => Math.min(100, value + 8)), 180);
    return () => window.clearTimeout(timer);
  }, [progress]);

  const filled = Math.round(progress / 5);

  return (
    <Stack gap={8}>
      <Text as="div">
        <Text as="span" tone="green">
          {"#".repeat(filled)}
        </Text>
        <Text as="span" tone="dim">
          {"-".repeat(20 - filled)}
        </Text>
        <Text as="span" tone="yellow">{` ${progress}%`}</Text>
      </Text>
      <Text as="div" tone="white">
        {progress >= 100 ? "The team is now 94% caffeinated." : "brewing by hand..."}
      </Text>
    </Stack>
  );
}

import { Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { useClock } from "./hooks/useClock";

const CLOCK_INTERVAL_MS = 10_000;

export function StatusClock() {
  const time = useClock(CLOCK_INTERVAL_MS);

  return <Text as="span">{time ?? messages.shell.statusBar.clockFallback}</Text>;
}

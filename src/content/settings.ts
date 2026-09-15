const MINUTE_MS = 60_000;

export type ScreensaverSettings = {
  enabled: boolean;
  delayMs: number;
};

export const screensaverDelayMinutes = [1, 5, 15, 30] as const;

export type ScreensaverDelayMinutes = (typeof screensaverDelayMinutes)[number];

export const defaultScreensaverMinutes: ScreensaverDelayMinutes = 5;

export function screensaverDelayMs(minutes: ScreensaverDelayMinutes): number {
  return minutes * MINUTE_MS;
}

export function isScreensaverDelayMinutes(value: number): value is ScreensaverDelayMinutes {
  return screensaverDelayMinutes.some((minutes) => minutes === value);
}

export const defaultScreensaver: ScreensaverSettings = {
  enabled: true,
  delayMs: screensaverDelayMs(defaultScreensaverMinutes),
};

// Mirrors --dos-boot-fade in tokens.css; update both together.
export const bootFadeMs = 450;

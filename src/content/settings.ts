const MINUTE_MS = 60_000;

export type ScreensaverSettings = {
  enabled: boolean;
  delayMs: number;
};

export const defaultScreensaver: ScreensaverSettings = {
  enabled: true,
  delayMs: 5 * MINUTE_MS,
};

// Mirrors --dos-boot-fade in tokens.css; update both together.
export const bootFadeMs = 450;

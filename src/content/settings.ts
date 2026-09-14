export type ScreensaverSettings = {
  enabled: boolean;
  delayMinutes: number;
};

export const defaultScreensaver: ScreensaverSettings = {
  enabled: true,
  delayMinutes: 5,
};

export const screensaverText = {
  title: "STARFIELD.SCR",
  hint: "PRESS ANY KEY TO WAKE UP",
};

export const BOOT_STEP_MS = 250;
export const BOOT_LONG_PAUSE_MS = 500;
export const BOOT_LONG_PAUSE_AFTER_INDEXES: readonly number[] = [2, 5];
export const BOOT_DONE_PADDING_MS = 700;
export const BOOT_REDUCED_DONE_MS = 1200;

export type BootStep = {
  at: number;
  revealed: number;
};

export type BootSchedule = {
  steps: BootStep[];
  doneAt: number;
};

export function buildBootSchedule(lineCount: number): BootSchedule {
  const steps: BootStep[] = [];
  let at = BOOT_STEP_MS;
  for (let index = 0; index <= lineCount; index += 1) {
    steps.push({ at, revealed: index + 1 });
    const pause = BOOT_LONG_PAUSE_AFTER_INDEXES.includes(index) ? BOOT_LONG_PAUSE_MS : BOOT_STEP_MS;
    at += pause;
  }
  return { steps, doneAt: at + BOOT_DONE_PADDING_MS };
}

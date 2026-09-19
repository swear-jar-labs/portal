// Relative ages for lists: one algorithm for the board and the readroom, the
// unit forms come from the calling feature. `in` is optional: only a surface
// that looks forward (a deadline) labels the future — without it a timestamp
// ahead of the clock reads as `now`, the safe fallback for clock skew.

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

export type AgeLabels = {
  now: string;
  ago: string;
  // The future prefix (`IN 4D`).
  in?: string;
  minute: string;
  hour: string;
  day: string;
  week: string;
};

function amountLabel(amount: number, labels: AgeLabels): string {
  if (amount < HOUR_MS) return `${Math.floor(amount / MINUTE_MS)}${labels.minute}`;
  if (amount < DAY_MS) return `${Math.floor(amount / HOUR_MS)}${labels.hour}`;
  if (amount < WEEK_MS) return `${Math.floor(amount / DAY_MS)}${labels.day}`;
  return `${Math.floor(amount / WEEK_MS)}${labels.week}`;
}

/** Compact relative age: `3D AGO`, `JUST NOW`, or `IN 4D` with an `in` label. */
export function formatAge(iso: string, nowIso: string, labels: AgeLabels): string {
  const ms = Date.parse(nowIso) - Date.parse(iso);
  if (!Number.isFinite(ms) || Math.abs(ms) < MINUTE_MS) return labels.now;
  if (ms < 0 && labels.in === undefined) return labels.now;
  const amount = amountLabel(Math.abs(ms), labels);
  return ms < 0 ? `${labels.in} ${amount}` : `${amount} ${labels.ago}`;
}

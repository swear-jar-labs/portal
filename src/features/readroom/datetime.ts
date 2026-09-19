import type { ReadroomAttachment, ReadroomTagId } from "./readrooms";

// `datetime-local` is the deadline's form control: it speaks the browser's
// local wall-clock (`YYYY-MM-DDTHH:mm`), while the slice stores and stamps
// exact UTC instants. These helpers are the only bridge between the two.

const DAY_MS = 86_400_000;
const DEFAULT_DEADLINE_DAYS = 7;
const LOCAL_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** The exact instant of a local input value; null when the value is not a
 * complete date and time. */
export function fromLocalInput(value: string): string | null {
  if (!LOCAL_INPUT_PATTERN.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** The local input value of an instant: the form's prefill. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The deadline a new task opens with: a week out, to the minute. */
export function defaultDeadlineLocal(nowMs: number): string {
  return toLocalInput(new Date(nowMs + DEFAULT_DEADLINE_DAYS * DAY_MS).toISOString());
}

/** The facts a new task opens with: the creation form's values with the
 * deadline already converted to an instant. */
export type ReadroomDraft = {
  title: string;
  tags: readonly ReadroomTagId[];
  description: string;
  sourceUrl?: string;
  ticket?: string;
  attachments: readonly ReadroomAttachment[];
  deadlineAt: string;
};

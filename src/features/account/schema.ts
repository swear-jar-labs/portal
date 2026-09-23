import { z } from "zod";

// UI-first slice: input schemas shared by the apply/logon forms and the mock
// session. When the backend lands (Phase 5) the function bodies change, the
// pages and signatures do not (TECH.md §5).

export const USER_PATTERN = /^[a-z0-9_-]{2,32}$/;
const USER_INPUT_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;
const MAX_TEXT_LENGTH = 2000;

export const userSchema = z
  .string()
  .trim()
  .regex(USER_INPUT_PATTERN)
  .transform((value) => value.toLowerCase());

// Lower-cased: mailbox comparison is case-insensitive, so the taken-check
// must not treat Quinn@x.io and quinn@x.io as two mailboxes.
export const emailSchema = z
  .string()
  .trim()
  .pipe(z.email())
  .transform((value) => value.toLowerCase());

// Email ownership proof at registration: a numeric one-time code of this
// length, valid for OTP_TTL_MS (see verification.ts, server-only).
export const OTP_LENGTH = 6;

export const weeklyHourIds = ["under-5", "5-10", "over-10"] as const;
export type WeeklyHoursId = (typeof weeklyHourIds)[number];

export const applySchema = z.object({
  experience: z.string().trim().max(MAX_TEXT_LENGTH),
  weeklyHours: z.enum(weeklyHourIds),
  motivation: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
});

export type ApplyInput = z.infer<typeof applySchema>;

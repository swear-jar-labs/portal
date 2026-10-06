import { z } from "zod";

// UI-first slice: input schemas shared by the apply/logon forms and the mock
// session. When the backend lands (Phase 5) the function bodies change, the
// pages and signatures do not (TECH.md §5).

// Handle bounds are named so the Better Auth username plugin can read the same
// canon (see src/auth.ts) instead of repeating the numbers.
export const USER_MIN_LENGTH = 2;
export const USER_MAX_LENGTH = 32;
export const USER_PATTERN = new RegExp(`^[a-z0-9_-]{${USER_MIN_LENGTH},${USER_MAX_LENGTH}}$`);
const USER_INPUT_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${USER_MIN_LENGTH},${USER_MAX_LENGTH}}$`);
const MAX_TEXT_LENGTH = 2000;

// The handle canon for the Better Auth username plugin (see src/auth.ts): the
// plugin validates the value the caller typed — case included — but stores and
// looks up the lower-cased form, so the predicate accepts any case and the
// normalization stays the single step that decides what is saved.
export function isUserHandle(candidate: string): boolean {
  return USER_PATTERN.test(candidate.toLowerCase());
}

export const userSchema = z
  .string()
  .trim()
  .regex(USER_INPUT_PATTERN)
  .transform((value) => value.toLowerCase());

export const PROFILE_BIO_MAX_LENGTH = 280;
export const PROFILE_AVATAR_MAX_BYTES = 128 * 1024;
export const profileSchema = z.object({
  username: userSchema,
  bio: z.string().trim().max(PROFILE_BIO_MAX_LENGTH),
  avatar: z
    .union([z.string().max(Math.ceil((PROFILE_AVATAR_MAX_BYTES * 4) / 3) + 32), z.null()])
    .optional(),
});

// Lower-cased: mailbox comparison is case-insensitive, so the taken-check
// must not treat Quinn@x.io and quinn@x.io as two mailboxes.
export const emailSchema = z
  .string()
  .trim()
  .pipe(z.email())
  .transform((value) => value.toLowerCase());

export const weeklyHourIds = ["under-5", "5-10", "over-10"] as const;
export type WeeklyHoursId = (typeof weeklyHourIds)[number];

export const applySchema = z.object({
  experience: z.string().trim().max(MAX_TEXT_LENGTH),
  weeklyHours: z.enum(weeklyHourIds),
  motivation: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
});

export type ApplyInput = z.infer<typeof applySchema>;

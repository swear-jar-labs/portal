import { z } from "zod";

// UI-first slice: types + fixtures. When the backend lands (Phase 5) the
// function bodies change, the pages and signatures do not (TECH.md §5).

export const USER_PATTERN = /^[a-z0-9_-]{2,32}$/;
const USER_INPUT_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;
const MAX_TEXT_LENGTH = 2000;

export const userSchema = z
  .string()
  .trim()
  .regex(USER_INPUT_PATTERN)
  .transform((value) => value.toLowerCase());

export const applyRoles = ["learner", "reviewer"] as const;
export type ApplyRole = (typeof applyRoles)[number];

export const weeklyHourIds = ["under-5", "5-10", "over-10"] as const;
export type WeeklyHoursId = (typeof weeklyHourIds)[number];

export const applySchema = z.object({
  role: z.enum(applyRoles),
  user: userSchema,
  email: z.string().trim().pipe(z.email()),
  experience: z.string().trim().max(MAX_TEXT_LENGTH),
  weeklyHours: z.enum(weeklyHourIds),
  motivation: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
});

export type ApplyInput = z.infer<typeof applySchema>;

export type MemberRole = "member";

export type MemberStat = {
  id: "merged" | "reviews" | "errata";
  value: number;
};

export type MemberProfile = {
  user: string;
  role: MemberRole;
  joined: string;
  bio: string;
  stats: readonly MemberStat[];
  activity: readonly string[];
};

export async function getOwnProfile(user: string): Promise<MemberProfile> {
  return {
    user,
    role: "member",
    joined: new Date().toISOString().slice(0, 10),
    bio: "Learning by hand, one broken build at a time. No AI co-author.",
    stats: [
      { id: "merged", value: 0 },
      { id: "reviews", value: 0 },
      { id: "errata", value: 0 },
    ],
    activity: [],
  };
}

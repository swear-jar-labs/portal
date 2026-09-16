"use client";

import { create } from "zustand";
import { z } from "zod";
import {
  defaultScreensaver,
  defaultScreensaverMinutes,
  isScreensaverDelayMinutes,
  screensaverDelayMs,
  type ScreensaverDelayMinutes,
} from "@/content/settings";

// Device-local preferences: stored in this browser until user_settings lands
// with auth (Phase 5). Only the delay is user-facing, so minutes are stored.

export const SCREENSAVER_PREFS_STORAGE_KEY = "swearjar.dos.screensaver";

export type ScreensaverPrefs = {
  enabled: boolean;
  delayMinutes: ScreensaverDelayMinutes;
};

export const defaultScreensaverPrefs: ScreensaverPrefs = {
  enabled: defaultScreensaver.enabled,
  delayMinutes: defaultScreensaverMinutes,
};

const prefsSchema = z.object({
  enabled: z.boolean(),
  delayMinutes: z.number().refine(isScreensaverDelayMinutes),
});

export function parseScreensaverPrefs(raw: string | null): ScreensaverPrefs {
  if (!raw) return defaultScreensaverPrefs;
  try {
    const parsed = prefsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultScreensaverPrefs;
  } catch {
    return defaultScreensaverPrefs;
  }
}

export function serializeScreensaverPrefs(prefs: ScreensaverPrefs): string {
  return JSON.stringify({ enabled: prefs.enabled, delayMinutes: prefs.delayMinutes });
}

export function screensaverDelayMsForPrefs(prefs: ScreensaverPrefs): number {
  return screensaverDelayMs(prefs.delayMinutes);
}

type ScreensaverPrefsStore = {
  prefs: ScreensaverPrefs;
  hydrated: boolean;
  hydrate: () => void;
  setPrefs: (prefs: ScreensaverPrefs) => void;
};

export const useScreensaverPrefs = create<ScreensaverPrefsStore>((set, get) => ({
  prefs: defaultScreensaverPrefs,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated || typeof window === "undefined") return;
    const prefs = parseScreensaverPrefs(window.localStorage.getItem(SCREENSAVER_PREFS_STORAGE_KEY));
    set({ prefs, hydrated: true });
  },
  setPrefs: (prefs) => {
    set({ prefs });
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SCREENSAVER_PREFS_STORAGE_KEY, serializeScreensaverPrefs(prefs));
  },
}));

import { describe, expect, it } from "vitest";
import {
  defaultScreensaverPrefs,
  parseScreensaverPrefs,
  screensaverDelayMsForPrefs,
  serializeScreensaverPrefs,
} from "@/app/components/Account/screensaver-prefs";
import { screensaverDelayMs } from "@/content/settings";

describe("parseScreensaverPrefs", () => {
  it("returns defaults for missing or broken storage", () => {
    expect(parseScreensaverPrefs(null)).toEqual(defaultScreensaverPrefs);
    expect(parseScreensaverPrefs("{")).toEqual(defaultScreensaverPrefs);
    expect(parseScreensaverPrefs('{"enabled":"yes"}')).toEqual(defaultScreensaverPrefs);
  });

  it("keeps a stored value", () => {
    expect(parseScreensaverPrefs('{"enabled":false,"delayMinutes":15}')).toEqual({
      enabled: false,
      delayMinutes: 15,
    });
  });

  it("falls back when the delay is not one of the options", () => {
    expect(parseScreensaverPrefs('{"enabled":false,"delayMinutes":2}')).toEqual(
      defaultScreensaverPrefs,
    );
    expect(parseScreensaverPrefs('{"enabled":false,"delayMinutes":-5}')).toEqual(
      defaultScreensaverPrefs,
    );
  });
});

describe("serializeScreensaverPrefs", () => {
  it("round-trips through the parser", () => {
    const prefs = { enabled: false, delayMinutes: 30 } as const;
    expect(parseScreensaverPrefs(serializeScreensaverPrefs(prefs))).toEqual(prefs);
  });
});

describe("screensaverDelayMsForPrefs", () => {
  it("converts minutes to milliseconds", () => {
    expect(screensaverDelayMsForPrefs({ enabled: true, delayMinutes: 1 })).toBe(
      screensaverDelayMs(1),
    );
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { fixturesEnabled, isSeededE2e } from "@/shared/mock";

// The two modes are separate contracts: fixtures gate demo stores and actions
// (off in production), the seeded e2e run gates the mock session only.
describe("fixturesEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is on outside production", () => {
    expect(fixturesEnabled()).toBe(true);
  });

  it("is off in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(fixturesEnabled()).toBe(false);
  });
});

describe("isSeededE2e", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off without the flag", () => {
    expect(isSeededE2e()).toBe(false);
  });

  it("is on with SWEARJAR_E2E=1", () => {
    vi.stubEnv("SWEARJAR_E2E", "1");
    expect(isSeededE2e()).toBe(true);
  });

  it("ignores a foreign value", () => {
    vi.stubEnv("SWEARJAR_E2E", "true");
    expect(isSeededE2e()).toBe(false);
  });
});

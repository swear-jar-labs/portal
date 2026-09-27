import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { Actor } from "@/features/account/contracts";
import { createProjectContentStore } from "@/features/projects/data/project-content-store";
import { projectTeams } from "@/features/projects/data/team-store";
import {
  projectContentSchema,
  validProjectImage,
  type ProjectContentInput,
} from "@/features/projects/model/project-content";
import { DEFAULT_CLAIM_POLICY, type Project } from "@/features/projects/model/projects";

const base: Project = {
  slug: "demo",
  name: "Demo project",
  description: "A shared space for testing project edits.",
  techs: ["typescript"],
  createdAt: "2026-09-27T00:00:00.000Z",
  status: "active",
  lead: { user: "ada" },
  maintainers: [{ user: "ada" }],
  claimPolicy: DEFAULT_CLAIM_POLICY,
};
const actor = (user: string, admin = false): Actor => ({
  user,
  username: user,
  bio: "",
  avatar: undefined,
  level: "member",
  admin,
  email: null,
});
const png = `data:image/png;base64,${readFileSync("tests/e2e/fixtures/pixel.png").toString("base64")}`;
const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const input: ProjectContentInput = {
  slug: base.slug,
  version: 1,
  name: "Edited demo",
  description: "The updated project description is visible.",
  techs: ["typescript", "rust"],
  contributors: "Looking for testers.",
  repoUrl: "https://github.com/example/demo",
  screenshots: [{ id: firstId, alt: "Demo home screen", dataUrl: png, width: 1, height: 1 }],
};

afterEach(() => projectTeams.reset());

describe("project content edits", () => {
  it("validates raster bytes, counts and unique technologies", () => {
    expect(validProjectImage(png)).toBe(true);
    expect(validProjectImage("data:image/png;base64,PGh0bWw+")).toBe(false);
    expect(validProjectImage("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(projectContentSchema.safeParse({ ...input, techs: ["rust", "rust"] }).success).toBe(
      false,
    );
    expect(
      projectContentSchema.safeParse({ ...input, screenshots: Array(5).fill(input.screenshots[0]) })
        .success,
    ).toBe(false);
    expect(
      projectContentSchema.safeParse({
        ...input,
        screenshots: [{ id: firstId, alt: "Missing size", dataUrl: png, width: 0, height: 1 }],
      }).success,
    ).toBe(false);
  });

  it("checks current role and version before publishing; keeps the base unchanged", () => {
    const store = createProjectContentStore();
    expect(store.update(base, actor("ken"), input)).toEqual({ ok: false, error: "forbidden" });
    expect(store.update(base, actor("ada"), { ...input, version: 2 })).toEqual({
      ok: false,
      error: "conflict",
    });
    const saved = store.update(base, actor("ada"), input);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(base.name).toBe("Demo project");
    expect(store.view(base).name).toBe("Edited demo");
    expect(store.view(base).contentVersion).toBe(2);
    expect(store.update(base, actor("ada"), input)).toEqual({ ok: false, error: "conflict" });
    expect(
      store.update(base, actor("admin", true), {
        ...input,
        version: 2,
        name: "Admin edit",
        screenshots: [{ id: firstId, alt: "Revised description" }],
      }).ok,
    ).toBe(true);
    expect(store.view(base).screenshots?.[0]?.alt).toBe("Revised description");
  });

  it("reorders and removes stored images without duplicating bytes", () => {
    const store = createProjectContentStore();
    const initial = {
      ...input,
      screenshots: [
        ...input.screenshots,
        { id: secondId, alt: "Demo details", dataUrl: png, width: 1, height: 1 },
      ],
    };
    expect(store.update(base, actor("ada"), initial).ok).toBe(true);
    const reordered = {
      ...input,
      version: 2,
      screenshots: [
        { id: secondId, alt: "Demo details" },
        { id: firstId, alt: "Demo home screen" },
      ],
    };
    expect(store.update(base, actor("ada"), reordered).ok).toBe(true);
    expect(store.view(base).screenshots?.map((image) => image.id)).toEqual([secondId, firstId]);
    expect(
      store.update(base, actor("ada"), {
        ...reordered,
        version: 3,
        screenshots: [{ id: firstId, alt: "Demo home screen" }],
      }).ok,
    ).toBe(true);
    expect(store.view(base).screenshots?.map((image) => image.id)).toEqual([firstId]);
    expect(
      store.update(base, actor("ada"), {
        ...reordered,
        version: 4,
        screenshots: [{ id: secondId, alt: "Restored" }],
      }),
    ).toEqual({ ok: false, error: "invalid" });
  });

  it("starts with fixture screenshots and can delete them without touching the fixture", () => {
    const store = createProjectContentStore();
    const seeded: Project = {
      ...base,
      screenshots: [
        {
          id: firstId,
          alt: "Original screen",
          src: "/projects/compiler-editor.svg",
          width: 960,
          height: 540,
        },
      ],
    };
    expect(store.view(seeded).screenshots?.[0]?.src).toBe("/projects/compiler-editor.svg");
    expect(store.update(seeded, actor("ada"), { ...input, screenshots: [] }).ok).toBe(true);
    expect(store.view(seeded).screenshots).toEqual([]);
    expect(seeded.screenshots).toHaveLength(1);
  });

  it("drops old repository counters when the URL changes or is removed", () => {
    const store = createProjectContentStore();
    const seeded: Project = {
      ...base,
      repoUrl: "https://github.com/example/old",
      forge: "github",
      stats: {
        openPrs: 4,
        merged30d: 2,
        commits7d: 8,
        lastActivityAt: "2026-09-27T00:00:00.000Z",
        syncedAt: "2026-09-27T01:00:00.000Z",
      },
    };
    expect(
      store.update(seeded, actor("ada"), {
        ...input,
        repoUrl: seeded.repoUrl ?? "",
        screenshots: [],
      }).ok,
    ).toBe(true);
    expect(store.view(seeded).stats).toEqual(seeded.stats);
    expect(
      store.update(seeded, actor("ada"), {
        ...input,
        version: 2,
        repoUrl: "https://gitlab.com/example/new",
        screenshots: [],
      }).ok,
    ).toBe(true);
    expect(store.view(seeded)).toMatchObject({
      repoUrl: "https://gitlab.com/example/new",
      forge: "gitlab",
    });
    expect(store.view(seeded).stats).toBeUndefined();
    expect(
      store.update(seeded, actor("ada"), {
        ...input,
        version: 3,
        repoUrl: "",
        screenshots: [],
      }).ok,
    ).toBe(true);
    expect(store.view(seeded).repoUrl).toBeUndefined();
    expect(store.view(seeded).forge).toBeUndefined();
    expect(store.view(seeded).stats).toBeUndefined();
  });
});

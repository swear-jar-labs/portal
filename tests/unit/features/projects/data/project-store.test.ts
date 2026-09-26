import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CLAIM_POLICY,
  MAX_POLICY_NEED,
  MIN_POLICY_NEED,
} from "@/features/projects/model/projects";
import * as store from "@/features/projects/data/project-store";
import { claimPolicySchema } from "@/features/projects/model/schema";

beforeEach(() => store.resetProjectStore());

describe("project claim policy", () => {
  it("bounds the rungs between an open ladder and ten deep", () => {
    expect(MIN_POLICY_NEED).toBe(0);
    expect(MAX_POLICY_NEED).toBe(10);
    expect(claimPolicySchema.safeParse(DEFAULT_CLAIM_POLICY).success).toBe(true);
    expect(claimPolicySchema.safeParse({ minSForM: -1, minMForL: 1 }).success).toBe(false);
    expect(claimPolicySchema.safeParse({ minSForM: 2, minMForL: 11 }).success).toBe(false);
    expect(claimPolicySchema.safeParse({ minSForM: 1.5, minMForL: 1 }).success).toBe(false);
  });

  it("reads the fixture base until a maintainer tunes the ladder", () => {
    const watched = store.projectStoreSnapshot();
    expect(store.policyForProject("tooling", DEFAULT_CLAIM_POLICY, watched)).toEqual(
      DEFAULT_CLAIM_POLICY,
    );

    store.setClaimPolicy("tooling", { minSForM: 3, minMForL: 1 });
    const tuned = store.projectStoreSnapshot();
    expect(store.policyForProject("tooling", DEFAULT_CLAIM_POLICY, tuned)).toEqual({
      minSForM: 3,
      minMForL: 1,
    });
    // Other projects keep their base; the base object is never mutated.
    expect(store.policyForProject("compiler", DEFAULT_CLAIM_POLICY, tuned)).toEqual(
      DEFAULT_CLAIM_POLICY,
    );
    expect(store.projectStoreServerSnapshot()).toEqual({ policies: {} });
  });

  it("merges every project's live ladder for the tickets' stack", () => {
    const bases = [
      { slug: "tooling", claimPolicy: DEFAULT_CLAIM_POLICY },
      { slug: "compiler", claimPolicy: DEFAULT_CLAIM_POLICY },
    ] as const;
    expect(store.livePoliciesByProject(bases, store.projectStoreSnapshot())).toEqual({
      tooling: DEFAULT_CLAIM_POLICY,
      compiler: DEFAULT_CLAIM_POLICY,
    });

    // The tuned ladder reaches the dossier without touching the tracker pages.
    store.setClaimPolicy("tooling", { minSForM: 3, minMForL: 1 });
    expect(store.livePoliciesByProject(bases, store.projectStoreSnapshot())).toEqual({
      tooling: { minSForM: 3, minMForL: 1 },
      compiler: DEFAULT_CLAIM_POLICY,
    });
  });
});

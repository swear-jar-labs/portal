import { describe, expect, it } from "vitest";
import { createAccountRegistry } from "@/features/account/model/actor";
import { createApplicationStore } from "@/features/account/model/applications";

const input = { experience: "A small compiler", weeklyHours: "5-10", motivation: "Fix parsers" };
const timestamp = "2026-09-23T12:00:00.000Z";

function fixture() {
  const accounts = createAccountRegistry([
    { user: "quinn", level: "participant" },
    { user: "riley", level: "participant" },
    { user: "admin", level: "member", admin: true },
  ]);
  const store = createApplicationStore((user) => accounts.setLevel(user, "member"));
  return { accounts, store, quinn: accounts.resolve("quinn"), admin: accounts.resolve("admin") };
}

describe("member application transitions", () => {
  it("keeps clarification in one application and promotes only on approval", () => {
    const { accounts, store, quinn, admin } = fixture();
    const submitted = store.submit(quinn, input, timestamp);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const id = submitted.application.id;
    expect(store.submit(quinn, input).ok).toBe(false);

    const requested = store.decide(
      admin,
      id,
      1,
      "clarification-requested",
      "Which parser?",
      timestamp,
    );
    expect(requested.ok).toBe(true);
    expect(store.respond(quinn, id, 1, "Old answer")).toEqual({ ok: false, error: "conflict" });
    const answered = store.respond(quinn, id, 2, "The expression parser", timestamp);
    expect(answered.ok).toBe(true);
    expect(store.decide(admin, id, 2, "approved", "")).toEqual({ ok: false, error: "conflict" });
    const approved = store.decide(admin, id, 3, "approved", "", timestamp);
    expect(approved.ok).toBe(true);
    expect(accounts.resolve("quinn")?.level).toBe("member");
    expect(accounts.resolve("quinn")?.admin).toBe(false);
    expect(store.forUser("quinn")[0]?.history.map((event) => event.kind)).toEqual([
      "submitted",
      "clarification-requested",
      "clarification-sent",
      "approved",
    ]);
    expect(store.decide(admin, id, 3, "approved", "")).toEqual({ ok: false, error: "conflict" });
  });

  it("preserves a rejection and starts a separate retry", () => {
    const { store, quinn, admin } = fixture();
    const first = store.submit(quinn, input);
    if (!first.ok) throw new Error("submit failed");
    expect(store.decide(admin, first.application.id, 1, "rejected", "Not enough detail").ok).toBe(
      true,
    );
    const retry = store.submit(quinn, { ...input, motivation: "More detail" });
    expect(retry.ok).toBe(true);
    expect(store.forUser("quinn")).toHaveLength(2);
    expect(store.forUser("quinn")[0]?.status).toBe("rejected");
    expect(store.forUser("quinn")[1]?.details.motivation).toBe("More detail");
  });

  it("enforces ownership, admin rights, reason and valid transitions in the store", () => {
    const { accounts, store, quinn, admin } = fixture();
    const first = store.submit(quinn, input);
    if (!first.ok) throw new Error("submit failed");
    const id = first.application.id;
    expect(store.submit(null, input)).toEqual({ ok: false, error: "forbidden" });
    expect(store.submit(admin, input)).toEqual({ ok: false, error: "forbidden" });
    expect(store.submit(quinn, { ...input, motivation: " " })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(store.decide(quinn, id, 1, "approved", "")).toEqual({ ok: false, error: "forbidden" });
    expect(store.decide(admin, id, 1, "rejected", " ")).toEqual({ ok: false, error: "invalid" });
    expect(store.decide(admin, id, 1, "clarification-requested", " ")).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(store.respond(accounts.resolve("riley"), id, 1, "Answer")).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(store.respond(quinn, id, 1, "Answer")).toEqual({ ok: false, error: "conflict" });
    expect(accounts.resolve("quinn")?.level).toBe("participant");
  });

  it("returns detached snapshots so a caller cannot change stored history", () => {
    const { store, quinn } = fixture();
    const first = store.submit(quinn, input);
    if (!first.ok) throw new Error("submit failed");
    first.application.details.motivation = "Tampered";
    const firstEvent = first.application.history[0];
    if (!firstEvent) throw new Error("missing submit event");
    firstEvent.note = "Tampered";
    expect(store.forUser("quinn")[0]?.details.motivation).toBe("Fix parsers");
    expect(store.forUser("quinn")[0]?.history[0]?.note).toBeNull();
  });
});

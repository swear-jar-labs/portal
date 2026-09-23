import { describe, expect, it } from "vitest";
import {
  confirmRegistration,
  ensureAccount,
  startRegistration,
} from "@/features/account/mock-accounts";

// The flow is a singleton over the server-process module state: every case
// works on a handle and a mailbox of its own.
let sequence = 0;
function freshHandle(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

function pendingFor(prefix: string, code = "123456") {
  const user = freshHandle(prefix);
  const email = `${user}@example.com`;
  const started = startRegistration(user, email, { code, now: 1000 });
  expect(started.ok).toBe(true);
  return { user, email };
}

describe("registration flow", () => {
  it("confirms a pending code into a Participant with the verified email", () => {
    const { user, email } = pendingFor("quinn");
    expect(confirmRegistration(user, "123456", 2000)).toEqual({
      result: "ok",
      actor: { user, level: "participant", admin: false, email },
    });
  });

  it("keeps a wrong code retryable through the flow", () => {
    const { user } = pendingFor("lin");
    expect(confirmRegistration(user, "000000", 2000)).toEqual({ result: "mismatch", actor: null });
    expect(confirmRegistration(user, "123456", 2000).result).toBe("ok");
  });

  it("rejects a handle that already exists", () => {
    const user = freshHandle("ken");
    ensureAccount(user);
    expect(startRegistration(user, `${user}@example.com`)).toEqual({ ok: false, error: "taken" });
  });

  it("rejects a mailbox that another pending code already claimed", () => {
    const { email } = pendingFor("ada");
    expect(startRegistration(freshHandle("grace"), email)).toEqual({
      ok: false,
      error: "email-taken",
    });
  });

  it("rejects a mailbox that belongs to a confirmed account", () => {
    const { user, email } = pendingFor("lin");
    expect(confirmRegistration(user, "123456", 2000).result).toBe("ok");
    expect(startRegistration(freshHandle("new"), email)).toEqual({
      ok: false,
      error: "email-taken",
    });
  });

  it("refuses a handle claimed while the code waited without burning the code", () => {
    const { user } = pendingFor("quinn");
    // A demo logon provisions the same handle mid-registration.
    ensureAccount(user);
    expect(confirmRegistration(user, "123456", 2000)).toEqual({ result: "taken", actor: null });
    // Still pending: the conflict is not a failed check.
    expect(confirmRegistration(user, "123456", 2000)).toEqual({ result: "taken", actor: null });
  });

  it("reports a missing pending code as missing", () => {
    expect(confirmRegistration(freshHandle("ghost"), "123456", 2000)).toEqual({
      result: "missing",
      actor: null,
    });
  });
});

import { describe, expect, it } from "vitest";
import { OTP_LENGTH } from "@/features/account/model/schema";
import {
  checkVerification,
  createVerificationStore,
  generateOtpCode,
  OTP_TTL_MS,
} from "@/features/account/model/verification";

describe("otp codes", () => {
  it("generates numeric codes of the expected length", () => {
    for (let index = 0; index < 10; index += 1) {
      const code = generateOtpCode();
      expect(code).toHaveLength(OTP_LENGTH);
      expect(code).toMatch(/^[0-9]+$/);
    }
  });

  it("accepts the code inside the window and rejects it after", () => {
    const pending = { user: "quinn", email: "quinn@example.com", code: "123456", issuedAt: 1000 };
    expect(checkVerification(pending, "123456", 1000 + OTP_TTL_MS)).toBe("ok");
    expect(checkVerification(pending, "123456", 1000 + OTP_TTL_MS + 1)).toBe("expired");
    expect(checkVerification(pending, "654321", 1000)).toBe("mismatch");
  });
});

describe("verification store", () => {
  it("confirms a matching code once and forgets it", () => {
    const store = createVerificationStore();
    store.start("quinn", "quinn@example.com", { code: "123456", now: 1000 });
    expect(store.confirm("quinn", "123456", 2000)).toBe("ok");
    expect(store.confirm("quinn", "123456", 2000)).toBe("missing");
  });

  it("keeps a mismatched code retryable and drops expired ones", () => {
    const store = createVerificationStore();
    store.start("quinn", "quinn@example.com", { code: "123456", now: 1000 });
    expect(store.confirm("quinn", "000000", 2000)).toBe("mismatch");
    expect(store.pendingFor("quinn")?.code).toBe("123456");
    expect(store.confirm("quinn", "123456", 1000 + OTP_TTL_MS + 1)).toBe("expired");
    expect(store.pendingFor("quinn")).toBeUndefined();
  });

  it("claims the mailbox of a pending code until it is confirmed or dropped", () => {
    const store = createVerificationStore();
    store.start("quinn", "quinn@example.com", { code: "123456", now: 1000 });
    expect(store.hasPendingEmail("quinn@example.com")).toBe(true);
    expect(store.hasPendingEmail("quinn@example.com", "quinn")).toBe(false);
    expect(store.hasPendingEmail("quinn@example.com", "other")).toBe(true);
    expect(store.hasPendingEmail("other@example.com")).toBe(false);
    expect(store.confirm("quinn", "000000", 2000)).toBe("mismatch");
    expect(store.hasPendingEmail("quinn@example.com")).toBe(true);
    expect(store.confirm("quinn", "123456", 2000)).toBe("ok");
    expect(store.hasPendingEmail("quinn@example.com")).toBe(false);
  });

  it("releases the mailbox when the pending code expires", () => {
    const store = createVerificationStore();
    store.start("quinn", "quinn@example.com", { code: "123456", now: 1000 });
    expect(store.confirm("quinn", "123456", 1000 + OTP_TTL_MS + 1)).toBe("expired");
    expect(store.hasPendingEmail("quinn@example.com")).toBe(false);
  });

  it("reports unknown handles as missing", () => {
    expect(createVerificationStore().confirm("quinn", "123456", 1000)).toBe("missing");
  });

  it("restarts the code when registration starts over", () => {
    const store = createVerificationStore();
    store.start("quinn", "quinn@example.com", { code: "111111", now: 1000 });
    store.start("quinn", "quinn@example.com", { code: "222222", now: 2000 });
    expect(store.confirm("quinn", "111111", 3000)).toBe("mismatch");
    expect(store.confirm("quinn", "222222", 3000)).toBe("ok");
  });
});

import { randomInt } from "node:crypto";
import { OTP_LENGTH } from "./schema";

// Email ownership proof for mock registration: the server issues a one-time
// code per handle and the form asks for it back. Mock-only — production sends
// real mail through the backend (Phase 5). The demo shows the code on screen,
// so no mailbox is needed to walk the flow. Server-only (node:crypto): the
// client never imports this module, only the issued code from the action.

export const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_ALPHABET = "0123456789";

export function generateOtpCode(): string {
  let code = "";
  for (let index = 0; index < OTP_LENGTH; index += 1) {
    code += OTP_ALPHABET[randomInt(OTP_ALPHABET.length)];
  }
  return code;
}

export type PendingVerification = {
  user: string;
  email: string;
  code: string;
  issuedAt: number;
};

export type VerificationCheck = "ok" | "mismatch" | "expired";

export function checkVerification(
  pending: PendingVerification,
  input: string,
  now: number,
): VerificationCheck {
  if (now - pending.issuedAt > OTP_TTL_MS) return "expired";
  return input === pending.code ? "ok" : "mismatch";
}

export type VerificationStart = {
  now?: number;
  code?: string;
};

// Pending codes live in module state next to the account registry: a server
// restart drops them, same as dynamic registrations. Tests build their own
// store; the slice keeps one singleton (see mock-accounts.ts).
export function createVerificationStore() {
  const pending = new Map<string, PendingVerification>();

  return {
    start(user: string, email: string, start: VerificationStart = {}): PendingVerification {
      const entry: PendingVerification = {
        user,
        email,
        code: start.code ?? generateOtpCode(),
        issuedAt: start.now ?? Date.now(),
      };
      pending.set(user, entry);
      return entry;
    },
    confirm(user: string, input: string, now: number = Date.now()): VerificationCheck | "missing" {
      const entry = pending.get(user);
      if (!entry) return "missing";
      const result = checkVerification(entry, input, now);
      if (result === "ok" || result === "expired") pending.delete(user);
      return result;
    },
    pendingFor(user: string): PendingVerification | undefined {
      return pending.get(user);
    },
  };
}

export type VerificationStore = ReturnType<typeof createVerificationStore>;

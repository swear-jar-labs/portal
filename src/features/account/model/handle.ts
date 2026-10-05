import { USER_MAX_LENGTH, USER_MIN_LENGTH } from "./schema";

// Handles for accounts created without one: OAuth callbacks get name/email/
// image from the provider, never a username, and the shell keys its whole
// prop-model on the handle. Better Auth's create hook (src/auth.ts) calls
// pickFreeHandle to fill the gap at insert time — the same canon as the form
// (USER_PATTERN), so the plugin accepts what we generate.
const HANDLE_FALLBACK = "user";
const HANDLE_ATTEMPTS = 50;

// The base stays short enough for every suffix to fit the canon: 24 + "-50" is
// well inside USER_MAX_LENGTH.
const HANDLE_BASE_MAX_LENGTH = 24;

export function sanitizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+/, "")
    .replace(/[-_]+$/, "")
    .slice(0, HANDLE_BASE_MAX_LENGTH);
}

// The mailbox is the one identifier every provider gives us: ada@lab.io and
// ada.smith+news@lab.io become ada and ada-smith-news.
export function handleBaseFromEmail(email: string): string {
  const at = email.indexOf("@");
  const local = at === -1 ? email : email.slice(0, at);
  const base = sanitizeHandle(local);
  return base.length >= USER_MIN_LENGTH ? base : HANDLE_FALLBACK;
}

// Candidates in the order they are tried: the bare base first, then numbered
// ones. Deterministic, so two accounts created from the same mailbox land on
// the same first free slot.
export function handleCandidates(base: string): string[] {
  return [base, ...Array.from({ length: HANDLE_ATTEMPTS }, (_, index) => `${base}-${index + 2}`)];
}

// Walks the candidates and returns the first one nobody holds. The caller does
// the lookup (Better Auth adapter on create), so this stays free of IO; null
// means every candidate was taken and the caller keeps the account handle-less.
export async function pickFreeHandle(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string | null> {
  for (const candidate of handleCandidates(base)) {
    if (candidate.length > USER_MAX_LENGTH) continue;
    if (!(await isTaken(candidate))) return candidate;
  }
  return null;
}

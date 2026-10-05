import { describe, expect, it } from "vitest";
import { APIError } from "better-auth/api";

import {
  PASSWORD_MAX_LENGTH,
  signInSchema,
  signUpSchema,
} from "@/features/account/model/credentials";
import { mapSignInError, mapSignUpError } from "@/features/account/model/auth-errors";

function apiError(code: string): APIError {
  return APIError.from("BAD_REQUEST", { code, message: code });
}

describe("auth input contracts", () => {
  it("accepts a handle or a mailbox on logon", () => {
    expect(signInSchema.safeParse({ user: "ada", password: "secret" }).success).toBe(true);
    expect(signInSchema.safeParse({ user: "ada@lab.io", password: "secret" }).success).toBe(true);
    expect(signInSchema.safeParse({ user: "ada", password: "" }).success).toBe(false);
  });

  it("lower-cases handles and mailboxes on registration", () => {
    const parsed = signUpSchema.safeParse({
      user: "Ada",
      email: "Ada@Lab.IO",
      password: "s3cret00",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.user).toBe("ada");
      expect(parsed.data.email).toBe("ada@lab.io");
    }
  });

  it("refuses short passwords on registration", () => {
    expect(
      signUpSchema.safeParse({ user: "ada", email: "ada@lab.io", password: "short" }).success,
    ).toBe(false);
  });

  it("refuses passwords past the length ceiling", () => {
    const long = "x".repeat(PASSWORD_MAX_LENGTH + 1);
    const parsed = signUpSchema.safeParse({ user: "ada", email: "ada@lab.io", password: long });
    expect(parsed.success).toBe(false);
    expect(
      signUpSchema.safeParse({
        user: "ada",
        email: "ada@lab.io",
        password: "x".repeat(PASSWORD_MAX_LENGTH),
      }).success,
    ).toBe(true);
  });
});

describe("auth error mapping", () => {
  it("names the taken handle and the taken mailbox", () => {
    expect(mapSignUpError(apiError("USERNAME_IS_ALREADY_TAKEN"))).toBe("taken");
    expect(mapSignUpError(apiError("USER_ALREADY_EXISTS"))).toBe("email-taken");
    expect(mapSignUpError(apiError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"))).toBe("email-taken");
  });

  it("reports wrong credentials as invalid", () => {
    expect(mapSignInError(apiError("INVALID_EMAIL_OR_PASSWORD"))).toBe("invalid");
    expect(mapSignInError(apiError("INVALID_USERNAME_OR_PASSWORD"))).toBe("invalid");
    expect(mapSignUpError(apiError("WEAK_PASSWORD"))).toBe("invalid");
  });

  it("reports transport failures as unavailable", () => {
    expect(mapSignUpError(new Error("fetch failed"))).toBe("unavailable");
    expect(mapSignInError(new Error("fetch failed"))).toBe("unavailable");
  });
});

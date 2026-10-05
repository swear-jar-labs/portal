"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Form, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, signUpSchema } from "../model/credentials";
import type { SessionActionError, SocialAuthMode } from "../model/credentials";
import type { SocialProvider } from "../data/mock-session";
import { mockSocialRegister } from "../data/mock-session-actions";
import { signUp } from "../data/session-actions";
import styles from "./LogonForm.module.css";

type RegisterErrors = {
  user?: string;
  email?: string;
  password?: string;
  form?: string;
};

export type RegisterFormProps = {
  // SSO buttons render only for providers with credentials configured.
  providers: readonly SocialProvider[];
  // Seeded e2e keeps the deterministic mock social signup; everywhere else
  // the buttons start a real OAuth roundtrip.
  social: SocialAuthMode;
};

const copy = messages.account.register;

// The bound a typed password breaks, in form words — the schema knows the
// numbers, this only picks the message.
function passwordError(value: string): string {
  if (value.length === 0) return copy.errors.password;
  if (value.length < PASSWORD_MIN_LENGTH) return copy.errors.passwordShort;
  if (value.length > PASSWORD_MAX_LENGTH) return copy.errors.passwordLong;
  return copy.errors.form;
}

// One row per failure the registration action can report: the compiler demands
// a row when SessionActionError grows, so a new code cannot silently fall into
// the generic message. `field` picks the control the message belongs to.
const REGISTER_ERROR_FIELDS = {
  taken: { field: "user", message: copy.errors.taken },
  "email-taken": { field: "email", message: copy.errors.emailTaken },
  unavailable: { field: "form", message: copy.errors.unavailable },
  invalid: { field: "form", message: copy.errors.form },
} as const satisfies Record<SessionActionError, { field: keyof RegisterErrors; message: string }>;

export function RegisterForm({ providers, social }: RegisterFormProps) {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const parsed = signUpSchema.safeParse({ user, email, password });
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.some((issue) => issue.path[0] === "password");
      setErrors({
        user: parsed.error.issues.some((issue) => issue.path[0] === "user")
          ? copy.errors.user
          : undefined,
        email: parsed.error.issues.some((issue) => issue.path[0] === "email")
          ? copy.errors.email
          : undefined,
        password: passwordIssue ? passwordError(password) : undefined,
      });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await signUp(parsed.data);
      if (result.ok) {
        router.push("/profile");
        router.refresh();
        return;
      }
      const { field, message } = REGISTER_ERROR_FIELDS[result.error];
      setErrors({ [field]: message });
    });
  }

  function handleProvider(provider: SocialProvider) {
    setErrors({});
    startTransition(async () => {
      if (social === "mock") {
        const result = await mockSocialRegister({ provider });
        if (result.ok) {
          router.push("/profile");
          router.refresh();
          return;
        }
        setErrors({ form: copy.errors.unavailable });
        return;
      }
      const result = await authClient.signIn.social({ provider, callbackURL: "/profile" });
      if (result.error) setErrors({ form: copy.errors.unavailable });
    });
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={copy.heading}>
      <Stack gap={10}>
        <Heading level={1}>{copy.heading}</Heading>
        <Text>{copy.intro}</Text>

        <Field
          label={copy.fields.email}
          name="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
          error={errors.email}
        />
        <Field
          label={copy.fields.user}
          name="user"
          value={user}
          onChange={setUser}
          autoComplete="username"
          required
          error={errors.user}
        />
        <Field
          label={copy.fields.password}
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          error={errors.password}
        />

        {errors.form ? <Text role="danger">{errors.form}</Text> : null}

        <Text role="hint">{copy.hint}</Text>
        <Text role="hint">{copy.passwordHint.replace("{min}", String(PASSWORD_MIN_LENGTH))}</Text>

        <Stack direction="row" gap={10}>
          <Button type="submit" variant="primary" disabled={pending}>
            {copy.submit}
          </Button>
        </Stack>

        {providers.length > 0 ? (
          <>
            <Text role="hint" className={styles.divider}>
              {copy.sso.label}
            </Text>
            <Stack direction="row" gap={10} wrap>
              {providers.map((provider) => (
                <Button key={provider} onClick={() => handleProvider(provider)} disabled={pending}>
                  {copy.sso.providers[provider]}
                </Button>
              ))}
            </Stack>
          </>
        ) : null}
      </Stack>
    </Form>
  );
}

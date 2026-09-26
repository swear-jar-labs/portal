"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Form, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { mockRegisterConfirmSchema, mockRegisterStartSchema } from "../data/mock-session";
import type { SocialProvider } from "../data/mock-session";
import {
  mockConfirmRegistration,
  mockSocialRegister,
  mockStartRegistration,
} from "../data/mock-session-actions";
import styles from "./LogonForm.module.css";

type RegisterErrors = {
  user?: string;
  email?: string;
  password?: string;
  code?: string;
  form?: string;
};

type RegisterStep = { name: "details" } | { name: "code"; user: string; demoCode: string };

const copy = messages.account.register;

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>({ name: "details" });
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [pending, startTransition] = useTransition();

  function handleDetails() {
    const parsed = mockRegisterStartSchema.safeParse({ user, email, password });
    if (!parsed.success) {
      setErrors({
        user: parsed.error.issues.some((issue) => issue.path[0] === "user")
          ? copy.errors.user
          : undefined,
        email: parsed.error.issues.some((issue) => issue.path[0] === "email")
          ? copy.errors.email
          : undefined,
        password: parsed.error.issues.some((issue) => issue.path[0] === "password")
          ? copy.errors.password
          : undefined,
      });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await mockStartRegistration(parsed.data);
      if (result.ok) {
        setCode("");
        setStep({ name: "code", user: result.user, demoCode: result.demoCode });
        return;
      }
      if (result.error === "taken") {
        setErrors({ user: copy.errors.taken });
        return;
      }
      if (result.error === "email-taken") {
        setErrors({ email: copy.errors.emailTaken });
        return;
      }
      setErrors({ form: copy.errors.form });
    });
  }

  function handleCode() {
    if (step.name !== "code") return;
    const parsed = mockRegisterConfirmSchema.safeParse({ user: step.user, code });
    if (!parsed.success) {
      setErrors({ code: copy.code.errors.invalid });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await mockConfirmRegistration(parsed.data);
      if (result.ok) {
        router.push("/profile");
        return;
      }
      if (result.error === "invalid") {
        setErrors({ code: copy.code.errors.invalid });
        return;
      }
      // The handle was claimed while the code waited: back to the details,
      // where another one can be picked (the code is not burned).
      if (result.error === "taken") {
        setStep({ name: "details" });
        setErrors({ user: copy.errors.taken });
        return;
      }
      if (result.error === "expired") {
        setStep({ name: "details" });
        setErrors({ form: copy.code.errors.expired });
        return;
      }
      if (result.error === "missing") {
        setStep({ name: "details" });
        setErrors({ form: copy.code.errors.missing });
        return;
      }
      setErrors({ form: copy.code.errors.mismatch });
    });
  }

  function handleProvider(provider: SocialProvider) {
    setErrors({});
    startTransition(async () => {
      const result = await mockSocialRegister({ provider });
      if (result.ok) {
        router.push("/profile");
        return;
      }
      setErrors({ form: messages.account.login.errors.unavailable });
    });
  }

  return (
    <Form onSubmit={step.name === "details" ? handleDetails : handleCode} ariaLabel={copy.heading}>
      <Stack gap={10}>
        <Heading level={1}>{copy.heading}</Heading>
        {step.name === "details" ? (
          <>
            <Text>{copy.intro}</Text>
            <Text role="hint">{copy.demoHint}</Text>

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

            <Stack direction="row" gap={10}>
              <Button type="submit" variant="primary" disabled={pending}>
                {copy.submit}
              </Button>
            </Stack>

            <Text role="hint" className={styles.divider}>
              {copy.sso.label}
            </Text>
            <Stack direction="row" gap={10} wrap>
              <Button onClick={() => handleProvider("google")} disabled={pending}>
                {copy.sso.providers.google}
              </Button>
              <Button onClick={() => handleProvider("github")} disabled={pending}>
                {copy.sso.providers.github}
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Heading level={2}>{copy.code.heading}</Heading>
            <Text>{copy.code.text}</Text>
            <Text role="hint">
              {copy.code.demoCode} {step.demoCode}
            </Text>

            <Field
              label={copy.code.label}
              name="code"
              value={code}
              onChange={setCode}
              autoComplete="one-time-code"
              autoFocus
              required
              error={errors.code}
            />

            {errors.form ? <Text role="danger">{errors.form}</Text> : null}

            <Stack direction="row" gap={10}>
              <Button
                onClick={() => {
                  setErrors({});
                  setStep({ name: "details" });
                }}
                disabled={pending}
              >
                {copy.code.back}
              </Button>
              <Button type="submit" variant="primary" disabled={pending}>
                {copy.code.submit}
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Form>
  );
}

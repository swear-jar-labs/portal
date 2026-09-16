"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Form, Heading, Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { mockLogonSchema, socialProviders, type SocialProvider } from "./mock-session";
import { mockLogon, mockSocialLogon } from "./mock-session-actions";
import styles from "./LogonForm.module.css";

type LogonErrors = {
  user?: string;
  password?: string;
  form?: string;
};

const PROFILE_PATH = "/profile";

function errorText(error: "invalid" | "unavailable"): string {
  return error === "unavailable"
    ? messages.account.login.errors.unavailable
    : messages.account.login.errors.invalid;
}

export function LogonForm() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LogonErrors>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    const parsed = mockLogonSchema.safeParse({ user, password });
    if (!parsed.success) {
      setErrors({
        user: parsed.error.issues.some((issue) => issue.path[0] === "user")
          ? messages.account.login.errors.user
          : undefined,
        password: parsed.error.issues.some((issue) => issue.path[0] === "password")
          ? messages.account.login.errors.password
          : undefined,
      });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await mockLogon(parsed.data);
      if (result.ok) {
        router.push(PROFILE_PATH);
        return;
      }
      setErrors({ form: errorText(result.error) });
    });
  }

  function handleProvider(provider: SocialProvider) {
    setErrors({});
    startTransition(async () => {
      const result = await mockSocialLogon({ provider });
      if (result.ok) {
        router.push(PROFILE_PATH);
        return;
      }
      setErrors({ form: errorText(result.error) });
    });
  }

  return (
    <Form onSubmit={handleSubmit} ariaLabel={messages.account.login.heading}>
      <Stack gap={10}>
        <Heading level={1} tone="yellow">
          {messages.account.login.heading}
        </Heading>

        <Field
          label={messages.account.login.fields.user}
          name="user"
          value={user}
          onChange={setUser}
          autoComplete="username"
          required
          error={errors.user}
        />
        <Field
          label={messages.account.login.fields.password}
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
          error={errors.password}
        />

        {errors.form ? (
          <Text tone="red" weight="bold">
            {errors.form}
          </Text>
        ) : null}

        <Text tone="dim">{messages.account.login.hint}</Text>

        <Stack direction="row" gap={10}>
          <Button type="submit" variant="primary" disabled={pending}>
            {messages.account.login.submit}
          </Button>
        </Stack>

        <Text tone="dim" className={styles.divider}>
          {messages.account.login.sso.label}
        </Text>
        <Stack direction="row" gap={10} wrap>
          {socialProviders.map((provider) => (
            <Button key={provider} onClick={() => handleProvider(provider)} disabled={pending}>
              {messages.account.login.sso.providers[provider]}
            </Button>
          ))}
        </Stack>

        <Text>
          {messages.account.login.applyPrompt}{" "}
          <Link href="/apply" underline>
            {messages.account.login.applyLink}
          </Link>
        </Text>
      </Stack>
    </Form>
  );
}

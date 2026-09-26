"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ComboBox,
  Field,
  Form,
  Heading,
  Link,
  SegmentedControl,
  Stack,
  Tag,
  Text,
  Textarea,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import { techIds, type TechId } from "@/content/techs";
import { useClientInteractive } from "@/shared/useClientInteractive";
import { mockRespondToProject, mockSubmitProject } from "../data/mock-submission-actions";
import { projectPath } from "../model/projects";
import {
  MAX_PROJECT_STACK_TECHS,
  projectSubmissionSchema,
  type ProjectSubmission,
  type ProjectSubmissionInput,
} from "../data/submissions";
import styles from "./proposal.module.css";

const copy = messages.projects.proposal;
const FIELD_ROWS = 4;
type ProposalTab = "new" | "mine";
const TAB_IDS = {
  new: "proposal-tab-new",
  mine: "proposal-tab-mine",
} as const;
const PANEL_IDS = {
  new: "proposal-panel-new",
  mine: "proposal-panel-mine",
} as const;
const initial: ProjectSubmissionInput = {
  name: "",
  slug: "",
  goal: "",
  repoUrl: "",
  stack: [],
  contributors: "",
};

export function ProjectProposalForm({
  level,
  submissions,
}: {
  level: "guest" | "participant" | "member";
  submissions: ProjectSubmission[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectSubmissionInput>(initial);
  const [stackQuery, setStackQuery] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<ProposalTab>("new");
  const [submitError, setSubmitError] = useState("");
  const [replyError, setReplyError] = useState("");
  const [pending, startTransition] = useTransition();
  const interactive = useClientInteractive();
  // Newest proposal first, one per slug: reversing before the Map dedupe keeps
  // the latest record of a re-submitted slug and its position by freshness.
  const latestBySlug = [
    ...new Map([...submissions].reverse().map((item) => [item.details.slug, item])).values(),
  ];
  const previousForSlug = submissions
    .filter((item) => item.details.slug === values.slug.trim())
    .at(-1);
  const stackOptions =
    values.stack.length >= MAX_PROJECT_STACK_TECHS
      ? []
      : techIds
          .filter((tech) => !values.stack.includes(tech))
          .map((tech) => ({ value: tech, label: messages.readroom.tags[tech] }));

  function update<K extends keyof ProjectSubmissionInput>(
    key: K,
    value: ProjectSubmissionInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const parsed = projectSubmissionSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitError(copy.errors.invalid);
      return;
    }
    setSubmitError("");
    startTransition(async () => {
      const result = await mockSubmitProject(parsed.data);
      if (!result.ok) {
        setSubmitError(copy.errors[result.error]);
        return;
      }
      setValues(initial);
      setStackQuery("");
      setActiveTab("mine");
      router.refresh();
    });
  }

  function addTech(tech: TechId) {
    if (values.stack.includes(tech) || values.stack.length >= MAX_PROJECT_STACK_TECHS) return;
    update("stack", [...values.stack, tech]);
    setStackQuery("");
  }

  function removeTech(tech: TechId) {
    update(
      "stack",
      values.stack.filter((item) => item !== tech),
    );
  }

  function reply(submission: ProjectSubmission) {
    const note = notes[submission.id] ?? "";
    if (!note.trim()) {
      setReplyError(copy.errors.invalid);
      return;
    }
    setReplyError("");
    startTransition(async () => {
      const result = await mockRespondToProject({
        id: submission.id,
        version: submission.version,
        note,
      });
      if (!result.ok) {
        setReplyError(copy.errors[result.error]);
        return;
      }
      setNotes((current) => ({ ...current, [submission.id]: "" }));
      router.refresh();
    });
  }

  const tabs = (["new", "mine"] as const).map((tab) => ({
    value: tab,
    label: copy.tabs[tab],
    id: TAB_IDS[tab],
    panelId: PANEL_IDS[tab],
  }));

  return (
    <Stack gap={8}>
      <Heading level={1}>{copy.heading}</Heading>
      <Text>{copy.intro}</Text>
      {level === "guest" ? (
        <Stack gap={4}>
          <Text role="hint">{copy.guest}</Text>
          <Link href="/register">{messages.projects.cta.register}</Link>
          <Link href="/forum">{copy.forum}</Link>
        </Stack>
      ) : level === "participant" ? (
        <Stack gap={4}>
          <Text role="hint">{copy.participant}</Text>
          <Link href="/apply">{copy.apply}</Link>
          <Link href="/forum">{copy.forum}</Link>
        </Stack>
      ) : (
        <Stack gap={8}>
          <SegmentedControl
            mode="tabs"
            label={copy.tabsLabel}
            options={tabs}
            value={activeTab}
            onChange={setActiveTab}
          />
          <div
            id={PANEL_IDS.new}
            role="tabpanel"
            aria-labelledby={TAB_IDS.new}
            hidden={activeTab !== "new"}
          >
            <Form onSubmit={submit} ariaLabel={copy.heading}>
              <fieldset className={styles.fields} disabled={!interactive || pending}>
                <Stack gap={8}>
                  <Field
                    label={copy.fields.name}
                    name="name"
                    value={values.name}
                    onChange={(value) => update("name", value)}
                    required
                  />
                  <Field
                    label={copy.fields.slug}
                    name="slug"
                    value={values.slug}
                    onChange={(value) => update("slug", value)}
                    required
                  />
                  <Textarea
                    label={copy.fields.goal}
                    name="goal"
                    value={values.goal}
                    onChange={(value) => update("goal", value)}
                    rows={FIELD_ROWS}
                    required
                  />
                  <Field
                    label={copy.fields.repoUrl}
                    name="repoUrl"
                    value={values.repoUrl}
                    onChange={(value) => update("repoUrl", value)}
                  />
                  <Stack gap={4}>
                    <Text role="hint">{copy.stackHint}</Text>
                    <ComboBox
                      label={copy.fields.stack}
                      name="stack-search"
                      value={stackQuery}
                      onChange={setStackQuery}
                      options={stackOptions}
                      onPick={(option) => addTech(option.value)}
                      emptyText={
                        values.stack.length >= MAX_PROJECT_STACK_TECHS
                          ? copy.stackLimit
                          : copy.stackEmpty
                      }
                      advanceOnPick={false}
                      submitOnNoMatch={false}
                    />
                    {values.stack.length > 0 ? (
                      <Stack direction="row" gap={4} wrap navRow>
                        {values.stack.map((tech) => (
                          <Tag
                            key={tech}
                            active
                            ariaLabel={`${copy.removeTech} ${messages.readroom.tags[tech]}`}
                            onClick={() => removeTech(tech)}
                          >
                            {messages.readroom.tags[tech]}
                          </Tag>
                        ))}
                      </Stack>
                    ) : null}
                  </Stack>
                  <Textarea
                    label={copy.fields.contributors}
                    name="contributors"
                    value={values.contributors}
                    onChange={(value) => update("contributors", value)}
                    rows={FIELD_ROWS}
                    required
                  />
                  <Button type="submit" variant="primary" className={styles.submitButton}>
                    {previousForSlug?.status === "rejected" ? copy.again : copy.submit}
                  </Button>
                </Stack>
              </fieldset>
            </Form>
            {submitError ? <Text role="danger">{submitError}</Text> : null}
          </div>
          <div
            id={PANEL_IDS.mine}
            role="tabpanel"
            aria-labelledby={TAB_IDS.mine}
            hidden={activeTab !== "mine"}
          >
            {latestBySlug.length === 0 ? (
              <Text role="hint">{copy.mineEmpty}</Text>
            ) : (
              <Stack gap={8}>
                {latestBySlug.map((submission) => (
                  <section
                    key={submission.id}
                    aria-label={`${submission.details.name} ${copy.states[submission.status]}`}
                  >
                    <Stack gap={4}>
                      <Text role="accent">
                        {submission.details.name} · {copy.states[submission.status]}
                      </Text>
                      {submission.status === "approved" ? (
                        <Link href={projectPath(submission.details.slug)}>
                          {projectPath(submission.details.slug)}
                        </Link>
                      ) : null}
                      {submission.history.at(-1)?.note ? (
                        <Text>{submission.history.at(-1)?.note}</Text>
                      ) : null}
                      {submission.status === "needs-info" ? (
                        <Form
                          onSubmit={() => reply(submission)}
                          ariaLabel={`${copy.fields.answer}: ${submission.details.name}`}
                        >
                          <fieldset className={styles.fields} disabled={!interactive || pending}>
                            <Stack gap={6}>
                              <Textarea
                                label={copy.fields.answer}
                                name={`answer-${submission.id}`}
                                value={notes[submission.id] ?? ""}
                                onChange={(value) =>
                                  setNotes((current) => ({ ...current, [submission.id]: value }))
                                }
                                rows={FIELD_ROWS}
                                required
                              />
                              <Button
                                type="submit"
                                variant="primary"
                                className={styles.submitButton}
                              >
                                {copy.reply}
                              </Button>
                            </Stack>
                          </fieldset>
                        </Form>
                      ) : null}
                    </Stack>
                  </section>
                ))}
              </Stack>
            )}
            {replyError ? <Text role="danger">{replyError}</Text> : null}
          </div>
        </Stack>
      )}
    </Stack>
  );
}

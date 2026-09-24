"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Heading, Link, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { stackMemory, useShellSession } from "@/features/shell";
import { mockProjectTeamAction } from "./mock-team-actions";
import {
  PROJECTS_PATH,
  PROJECT_TEAM_MANAGE_BUTTON_ID,
  projectTeamManagePath,
  type Project,
} from "./projects";
import type { ProjectTeam } from "./team-store";

type Props = { project: Project; team: ProjectTeam };
const copy = messages.projects.team;

export function ProjectTeamSection({ project, team }: Props) {
  const router = useRouter();
  const session = useShellSession();
  const [error, setError] = useState<keyof typeof copy.errors | null>(null);
  const [pending, startTransition] = useTransition();
  const isMember = session?.level === "member";
  const joined = team.members.some((person) => person.user === session?.user);
  // Joining closes with the archive, but leaving never does: the store
  // lets any subscriber out, so the button stays for members who joined.
  const canJoin = isMember && !joined && project.status !== "archived";
  const canLeave = isMember && joined;
  const maintainer = team.maintainers.some((person) => person.user === session?.user);
  const canManage =
    session !== null && (session.admin || maintainer || project.lead?.user === session.user);

  function act(action: "join" | "leave") {
    setError(null);
    startTransition(async () => {
      const result = await mockProjectTeamAction({ slug: project.slug, action });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Stack gap={6}>
      <Stack direction="row" gap={8} align="center" wrap navRow>
        <Heading level={2}>{copy.heading}</Heading>
        {canManage ? (
          <Button
            id={PROJECT_TEAM_MANAGE_BUTTON_ID}
            onClick={() => {
              const route = projectTeamManagePath(project.slug);
              stackMemory.rememberPush(route);
              router.push(route);
            }}
          >
            {copy.manage}
          </Button>
        ) : null}
      </Stack>
      {project.status === "archived" ? <Text role="hint">{copy.archived}</Text> : null}
      <Stack direction="row" gap={6} align="center" wrap navRow>
        <Text as="span" role="hint">
          {messages.projects.about.lead}
        </Text>
        {project.lead ? (
          <MemberLink person={project.lead} sectionPath={PROJECTS_PATH} />
        ) : (
          <Text as="span" role="danger">
            {copy.leadVacant}
          </Text>
        )}
      </Stack>
      <Stack direction="row" gap={6} align="center" wrap navRow>
        <Text as="span" role="hint">
          {messages.projects.about.maintainers}
        </Text>
        {team.maintainers.map((person) => (
          <MemberLink key={person.user} person={person} sectionPath={PROJECTS_PATH} />
        ))}
      </Stack>
      {team.maintainers.length === 0 ? <Text role="danger">{copy.noMaintainer}</Text> : null}
      <Stack direction="row" gap={6} align="center" wrap navRow>
        <Text as="span" role="hint">
          {copy.members}
        </Text>
        {team.members.length === 0 ? (
          <Text as="span" role="hint">
            {copy.empty}
          </Text>
        ) : (
          team.members.map((person) => (
            <MemberLink key={person.user} person={person} sectionPath={PROJECTS_PATH} />
          ))
        )}
      </Stack>
      <Stack direction="row" gap={6} align="center" wrap navRow>
        <Text as="span" role="hint">
          {copy.reviewers}
        </Text>
        {team.reviewers.length === 0 ? (
          <Text as="span" role="hint">
            {copy.noReviewers}
          </Text>
        ) : (
          team.reviewers.map((person) => (
            <MemberLink key={person.user} person={person} sectionPath={PROJECTS_PATH} />
          ))
        )}
      </Stack>
      {canJoin || canLeave ? (
        <Stack direction="row" gap={6} wrap navRow>
          <Button onClick={() => act(canLeave ? "leave" : "join")} disabled={pending}>
            {canLeave ? copy.leave : copy.join}
          </Button>
        </Stack>
      ) : null}
      {session?.level === "participant" ? (
        <Stack gap={4} navRow>
          <Text role="hint">{copy.participant}</Text>
          <Link href="/apply">{copy.apply}</Link>
        </Stack>
      ) : null}
      {error ? <Text role="danger">{copy.errors[error]}</Text> : null}
      <Text role="hint">{copy.hint}</Text>
    </Stack>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ComboBox, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import { MemberLink } from "@/features/members/contracts";
import { useShellSession } from "@/features/shell";
import { useMemberIdentities } from "@/shared/MemberIdentity";
import { mockProjectTeamAction } from "../data/mock-team-actions";
import type { Project } from "../model/projects";
import type { ProjectTeam, ProjectTeamActionId } from "../data/team-store";

type Props = { project: Project; team: ProjectTeam; memberUsers: readonly string[] };
const copy = messages.projects.team;

// Template tokens live with the sentence in messages.ts, so a locale can
// reorder the accessible name; the user and role are data, not UI text.
const USER_TOKEN = "{user}";
const ROLE_TOKEN = "{role}";

function unassignLabel(user: string, role: string): string {
  return copy.unassignLabel.replace(USER_TOKEN, user).replace(ROLE_TOKEN, role);
}

export function ProjectTeamManage({ project, team, memberUsers }: Props) {
  const router = useRouter();
  const session = useShellSession();
  const identities = useMemberIdentities();
  const displayUser = (user: string) => identities[user]?.username ?? user;
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [error, setError] = useState<keyof typeof copy.errors | null>(null);
  const [pending, startTransition] = useTransition();
  const isMaintainer = team.maintainers.some((person) => person.user === session?.user);
  const isLead = project.lead?.user === session?.user;
  const isAdmin = session?.admin ?? false;
  const canManage = session !== null && (isMaintainer || isLead || isAdmin);
  const canEditReviewers = (isMaintainer || isLead || isAdmin) && project.status !== "archived";
  const canAssignMaintainers = (isLead || isAdmin) && project.status !== "archived";
  const chosen =
    selectedMember !== null && memberUsers.includes(selectedMember) ? selectedMember : null;
  const alreadyReviewer = team.reviewers.some((person) => person.user === chosen);
  const alreadyMaintainer = team.maintainers.some((person) => person.user === chosen);

  function act(action: ProjectTeamActionId, target?: string) {
    setError(null);
    startTransition(async () => {
      const result = await mockProjectTeamAction({ slug: project.slug, action, target });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!canManage) return <Text role="danger">{copy.manageDenied}</Text>;

  return (
    <Stack gap={10}>
      <Heading level={1}>{copy.manageHeading}</Heading>
      <Text role="hint">{project.name}</Text>
      {team.leadDecisionRequired ? (
        <Text role="danger">{copy.leadVacant}</Text>
      ) : project.lead ? (
        <Stack direction="row" gap={6} align="center" navRow>
          <Text as="span" role="hint">
            {messages.projects.about.lead}
          </Text>
          <MemberLink person={project.lead} />
        </Stack>
      ) : null}
      {team.maintainers.length === 0 ? <Text role="danger">{copy.noMaintainer}</Text> : null}
      <Stack direction="row" gap={6} align="center" wrap navRow>
        <Text as="span" role="hint">
          {messages.projects.about.maintainers}
        </Text>
        {team.maintainers.map((person) => (
          <Stack key={person.user} direction="row" gap={4} align="center" navRow>
            <MemberLink person={person} />
            {(isLead || isAdmin || person.user === session?.user) &&
            project.status !== "archived" ? (
              <Button
                ariaLabel={unassignLabel(
                  displayUser(person.user),
                  messages.projects.about.maintainers,
                )}
                onClick={() => act("maintainer-remove", person.user)}
                disabled={pending || (!isAdmin && team.maintainers.length === 1)}
              >
                {copy.unassign}
              </Button>
            ) : null}
          </Stack>
        ))}
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
            <Stack key={person.user} direction="row" gap={4} align="center" navRow>
              <MemberLink person={person} />
              {canEditReviewers ? (
                <Button
                  ariaLabel={unassignLabel(displayUser(person.user), copy.reviewers)}
                  onClick={() => act("reviewer-remove", person.user)}
                  disabled={pending}
                >
                  {copy.unassign}
                </Button>
              ) : null}
            </Stack>
          ))
        )}
      </Stack>
      {project.status !== "archived" && memberUsers.length > 0 ? (
        <Stack gap={4}>
          <ComboBox
            label={copy.candidate}
            name={`member-${project.slug}`}
            value={memberQuery}
            onChange={(value) => {
              setMemberQuery(value);
              setSelectedMember(null);
            }}
            options={memberUsers.map((user) => ({ value: user, label: displayUser(user) }))}
            onPick={(option) => {
              setMemberQuery(option.label);
              setSelectedMember(option.value);
            }}
            committedValue={chosen ?? undefined}
            emptyText={copy.noMatchingMembers}
            submitOnNoMatch={false}
          />
          <Stack direction="row" gap={6} align="center" wrap navRow>
            <Text as="span" role="hint">
              {copy.assignTo}
            </Text>
            <Button
              onClick={() => {
                if (chosen !== null) act("reviewer-add", chosen);
              }}
              disabled={pending || !canEditReviewers || chosen === null || alreadyReviewer}
            >
              {copy.assignReviewers}
            </Button>
            <Button
              onClick={() => {
                if (chosen !== null) act("appoint-maintainer", chosen);
              }}
              disabled={pending || !canAssignMaintainers || chosen === null || alreadyMaintainer}
            >
              {copy.assignMaintainers}
            </Button>
          </Stack>
          {isAdmin && team.leadDecisionRequired ? (
            <Button
              onClick={() => {
                if (chosen !== null) act("resolve-lead", chosen);
              }}
              disabled={pending || chosen === null}
            >
              {copy.adminSetLead}
            </Button>
          ) : null}
        </Stack>
      ) : null}
      {isMaintainer && team.maintainers.length === 1 && project.status !== "archived" ? (
        <Text role="hint">{copy.lastMaintainer}</Text>
      ) : null}
      {error ? <Text role="danger">{copy.errors[error]}</Text> : null}
      <Text role="hint">{copy.hint}</Text>
    </Stack>
  );
}

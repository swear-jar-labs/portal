"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Form,
  Heading,
  Select,
  Stack,
  Tag,
  Text,
  type SelectOption,
  type Tone,
} from "@swearjar/dos";
import { messages, pluralForms } from "@/content/messages";
import { plural } from "@/lib/plural";
import { useShellSession } from "@/features/shell";
import {
  MAX_POLICY_NEED,
  MIN_POLICY_NEED,
  type ClaimPolicy,
  type ProjectSlug,
} from "../model/projects";
import * as projectStore from "../data/project-store";
import { claimPolicySchema } from "../model/schema";
import { useProjectPolicyState } from "../data/useProjectSession";

// The rung bounds the maintainer picks from: the kit's Select carries strings,
// the schema lands the numbers.
const NEED_OPTIONS: readonly SelectOption<string>[] = Array.from(
  { length: MAX_POLICY_NEED - MIN_POLICY_NEED + 1 },
  (_, index) => {
    const need = String(MIN_POLICY_NEED + index);
    return { value: need, label: need };
  },
);

export type ProjectClaimSectionProps = {
  slug: ProjectSlug;
  base: ClaimPolicy;
  // The project's maintainers: only they tune the ladder.
  maintainers: readonly string[];
};

// The trigger the keyboard returns to when the draft closes ( Esc runs the
// same cancel as the button): focus by known id, like the stack's card focus.
const CLAIM_EDIT_ID = "project-claim-edit";

type RungSize = "S" | "M" | "L";

// Mirrors ticketSizeTones in tickets (a direct import would cycle projects →
// tickets → projects): the pin test keeps the two in sync.
export const RUNG_TONES: Record<RungSize, Tone> = { S: "green", M: "yellow", L: "cyan" };

// One rung as a chip-led row: the size chip replaces the size word, N DONE
// and EVERYONE read in magenta. A zero need opens the rung to everyone.
function RungRow({ size, need, needSize }: { size: RungSize; need: number; needSize: RungSize }) {
  const claim = messages.projects.about.claim;
  return (
    <Stack direction="row" gap={6} align="center" wrap navRow>
      <Tag tone={RUNG_TONES[size]}>{size}</Tag>
      {need === MIN_POLICY_NEED ? (
        <>
          <Text as="span">{`${pluralForms.task.other} ${claim.available}`}</Text>
          <Text as="span" tone="magenta">
            {claim.everyone}
          </Text>
        </>
      ) : (
        <>
          <Text as="span">{`${pluralForms.task.other} ${claim.needs}`}</Text>
          <Text as="span" tone="magenta">{`${need} ${claim.done}`}</Text>
          <Tag tone={RUNG_TONES[needSize]}>{needSize}</Tag>
          <Text as="span">{plural(need, pluralForms.task)}</Text>
        </>
      )}
    </Stack>
  );
}

/** The claim ladder in TEAM: a chip-led row per rung
 * for everyone, an inline form for the maintainers. The tune lives in the
 * session store, so the tickets' dossier gates on it without a round trip. */
export function ProjectClaimSection({ slug, base, maintainers }: ProjectClaimSectionProps) {
  const session = useShellSession();
  const state = useProjectPolicyState();
  const live = projectStore.policyForProject(slug, base, state);
  const [draft, setDraft] = useState<ClaimPolicy | null>(null);

  const isMaintainer = session !== null && maintainers.includes(session.user);
  const visibleDraft = isMaintainer ? draft : null;
  const claim = messages.projects.about.claim;
  const dirty =
    visibleDraft !== null &&
    (visibleDraft.minSForM !== live.minSForM || visibleDraft.minMForL !== live.minMForL);
  // The closed draft hands the keyboard back to its trigger (both the button
  // and the kit's Esc dismissal land here); the opening mount is not a close.
  const wasDraft = useRef(false);
  useEffect(() => {
    if (wasDraft.current && draft === null) document.getElementById(CLAIM_EDIT_ID)?.focus();
    wasDraft.current = draft !== null;
  }, [draft]);

  function handleSave() {
    if (visibleDraft === null || !dirty) return;
    const parsed = claimPolicySchema.safeParse(visibleDraft);
    if (!parsed.success) return;
    projectStore.setClaimPolicy(slug, parsed.data);
    setDraft(null);
  }

  function handleCancel() {
    setDraft(null);
  }

  return (
    <Stack gap={4}>
      <Stack direction="row" gap={8} align="center" wrap navRow>
        <Heading level={2}>{claim.heading}</Heading>
        {isMaintainer && visibleDraft === null ? (
          <Button id={CLAIM_EDIT_ID} onClick={() => setDraft({ ...live })}>
            {claim.edit}
          </Button>
        ) : null}
      </Stack>
      <Text role="hint">{claim.explainer}</Text>
      <RungRow size="S" need={MIN_POLICY_NEED} needSize="S" />
      <RungRow size="M" need={live.minSForM} needSize="S" />
      <RungRow size="L" need={live.minMForL} needSize="M" />
      {visibleDraft !== null ? (
        <Form onSubmit={handleSave} onCancel={handleCancel} ariaLabel={claim.heading}>
          <Stack gap={6}>
            <Stack direction="row" gap={6} align="center" wrap navRow>
              <Select
                label={claim.mNeeds}
                name="minSForM"
                value={String(visibleDraft.minSForM)}
                onChange={(need) => setDraft({ ...visibleDraft, minSForM: Number(need) })}
                options={NEED_OPTIONS}
                autoFocus
              />
              <Select
                label={claim.lNeeds}
                name="minMForL"
                value={String(visibleDraft.minMForL)}
                onChange={(need) => setDraft({ ...visibleDraft, minMForL: Number(need) })}
                options={NEED_OPTIONS}
              />
            </Stack>
            <Stack direction="row" gap={6} align="center" wrap navRow>
              <Button type="submit" variant="primary" disabled={!dirty}>
                {claim.save}
              </Button>
              <Button onClick={handleCancel}>{claim.cancel}</Button>
            </Stack>
          </Stack>
        </Form>
      ) : null}
      {visibleDraft !== null ? <Text role="hint">{claim.hint}</Text> : null}
    </Stack>
  );
}

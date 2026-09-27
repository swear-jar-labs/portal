"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Button,
  ComboBox,
  Field,
  FileButton,
  Form,
  Heading,
  Stack,
  Tag,
  Text,
  Textarea,
} from "@swearjar/dos";
import { messages } from "@/content/messages";
import { techIds, type TechId } from "@/content/techs";
import { useShellSession } from "@/features/shell";
import { useClientInteractive } from "@/shared/useClientInteractive";
import { mockSaveProjectContent } from "../data/mock-project-content-actions";
import { useProjectManageClose } from "../data/project-manage-request";
import { projectContentSchema, type ProjectContentInput } from "../model/project-content";
import {
  isProjectImageError,
  prepareProjectImage,
  projectScreenshotAlt,
} from "../model/project-image";
import { MAX_PROJECT_SCREENSHOTS, PROJECT_IMAGE_TYPES, type Project } from "../model/projects";
import styles from "./project-media.module.css";

const copy = messages.projects.edit;
const ROWS = 4;
const DRAFT_IMAGE_MAX_WIDTH = 360;
const DRAFT_IMAGE_MAX_HEIGHT = 220;
type DraftImage = ProjectContentInput["screenshots"][number] & {
  preview: string;
  width: number;
  height: number;
};

function initialDraft(project: Project) {
  const screenshots: DraftImage[] = (project.screenshots ?? []).map((item) => ({
    id: item.id,
    alt: item.alt,
    preview: item.src,
    width: item.width,
    height: item.height,
  }));
  return {
    name: project.name,
    description: project.description,
    techs: [...project.techs],
    contributors: project.contributors ?? "",
    repoUrl: project.repoUrl ?? "",
    screenshots,
  };
}

export function ProjectEditForm({ project }: { project: Project }) {
  const router = useRouter();
  const closeManage = useProjectManageClose();
  const session = useShellSession();
  const interactive = useClientInteractive();
  const [draft, setDraft] = useState(initialDraft(project));
  const [techQuery, setTechQuery] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [pending, startTransition] = useTransition();
  const closing = useRef(false);
  const canEdit =
    session !== null &&
    (session.admin ||
      project.lead?.user === session.user ||
      project.maintainers.some((person) => person.user === session.user));
  const busy = processing || pending;
  const options = techIds
    .filter((tech) => !draft.techs.includes(tech))
    .map((tech) => ({ value: tech, label: messages.readroom.tags[tech] }));

  function update<K extends keyof ReturnType<typeof initialDraft>>(
    key: K,
    value: ReturnType<typeof initialDraft>[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.screenshots.length) return;
    const next = [...draft.screenshots];
    const item = next[index];
    const other = next[target];
    if (!item || !other) return;
    next[index] = other;
    next[target] = item;
    update("screenshots", next);
  }

  async function addImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (draft.screenshots.length >= MAX_PROJECT_SCREENSHOTS) {
      setError(copy.errors.count);
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const { dataUrl, width, height } = await prepareProjectImage(file);
      const image: DraftImage = {
        id: crypto.randomUUID(),
        alt: projectScreenshotAlt(draft.name, file.name, draft.screenshots.length + 1),
        dataUrl,
        preview: dataUrl,
        width,
        height,
      };
      setDraft((current) => ({ ...current, screenshots: [...current.screenshots, image] }));
    } catch (cause) {
      const key =
        cause instanceof Error && isProjectImageError(cause.message) ? cause.message : "decode";
      setError(copy.errors[key]);
    } finally {
      setProcessing(false);
    }
  }

  function save() {
    const input = {
      slug: project.slug,
      version: project.contentVersion ?? 1,
      ...draft,
      screenshots: draft.screenshots.map(({ id, alt, dataUrl, width, height }) => ({
        id,
        alt,
        ...(dataUrl ? { dataUrl, width, height } : {}),
      })),
    } satisfies ProjectContentInput;
    const parsed = projectContentSchema.safeParse(input);
    if (!parsed.success) {
      setError(copy.errors.invalid);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await mockSaveProjectContent(parsed.data);
      if (!result.ok) {
        setError(copy.errors[result.error]);
        return;
      }
      router.refresh();
    });
  }

  function cancel() {
    if (closing.current) return;
    closing.current = true;
    if (closeManage) closeManage();
    else router.back();
  }

  if (!canEdit) return <Text role="danger">{copy.errors.forbidden}</Text>;

  return (
    <Stack gap={8}>
      <Heading level={1}>{copy.heading}</Heading>
      <Text role="hint">{copy.hint}</Text>
      <Form onSubmit={save} ariaLabel={copy.heading}>
        <fieldset disabled={!interactive || busy} className={styles.fields}>
          <Stack gap={8}>
            <Field
              label={copy.name}
              name="name"
              value={draft.name}
              onChange={(value) => update("name", value)}
              autoFocus
              required
            />
            <Textarea
              label={copy.description}
              name="description"
              value={draft.description}
              onChange={(value) => update("description", value)}
              rows={ROWS}
              required
            />
            <ComboBox
              label={copy.stack}
              name="stack"
              value={techQuery}
              onChange={setTechQuery}
              options={options}
              onPick={(option) => {
                if (draft.techs.length < 10)
                  update("techs", [...draft.techs, option.value as TechId]);
                setTechQuery("");
              }}
              emptyText={copy.stackEmpty}
              submitOnNoMatch={false}
            />
            <Stack direction="row" gap={4} wrap navRow>
              {draft.techs.map((tech) => (
                <Tag
                  key={tech}
                  active
                  ariaLabel={`${copy.removeTech} ${messages.readroom.tags[tech]}`}
                  onClick={() =>
                    update(
                      "techs",
                      draft.techs.filter((item) => item !== tech),
                    )
                  }
                >
                  {messages.readroom.tags[tech]}
                </Tag>
              ))}
            </Stack>
            <Textarea
              label={copy.contributors}
              name="contributors"
              value={draft.contributors}
              onChange={(value) => update("contributors", value)}
              rows={ROWS}
            />
            <Field
              label={copy.repoUrl}
              name="repoUrl"
              value={draft.repoUrl}
              onChange={(value) => update("repoUrl", value)}
            />
            <Stack gap={6}>
              <Heading level={2}>{copy.screenshots}</Heading>
              <Text role="hint">{copy.imageHint}</Text>
              {draft.screenshots.map((item, index) => (
                <div className={styles.draftItem} key={item.id}>
                  <Stack gap={4}>
                    <Image
                      src={item.preview}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      unoptimized
                      className={styles.draftImage}
                      style={{
                        width: Math.min(
                          DRAFT_IMAGE_MAX_WIDTH,
                          (item.width / item.height) * DRAFT_IMAGE_MAX_HEIGHT,
                        ),
                      }}
                    />
                    <Stack direction="row" gap={4} wrap navRow>
                      <Button
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        ariaLabel={`${copy.moveUp} ${index + 1}`}
                      >
                        {copy.moveUp}
                      </Button>
                      <Button
                        onClick={() => move(index, 1)}
                        disabled={index === draft.screenshots.length - 1}
                        ariaLabel={`${copy.moveDown} ${index + 1}`}
                      >
                        {copy.moveDown}
                      </Button>
                      <Button
                        onClick={() =>
                          update(
                            "screenshots",
                            draft.screenshots.filter((entry) => entry.id !== item.id),
                          )
                        }
                        ariaLabel={`${copy.removeImage} ${index + 1}`}
                      >
                        {copy.removeImage}
                      </Button>
                    </Stack>
                  </Stack>
                </div>
              ))}
              {draft.screenshots.length < MAX_PROJECT_SCREENSHOTS ? (
                <Stack direction="row" navRow>
                  <FileButton accept={PROJECT_IMAGE_TYPES.join(",")} onChange={addImage}>
                    {copy.addImage}
                  </FileButton>
                </Stack>
              ) : null}
            </Stack>
            {error ? <Text role="danger">{error}</Text> : null}
            <Stack direction="row" gap={6} wrap navRow>
              <Button type="submit" variant="primary">
                {copy.save}
              </Button>
              <Button onClick={cancel}>{copy.cancel}</Button>
            </Stack>
          </Stack>
        </fieldset>
      </Form>
    </Stack>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Button, Dialog, Heading, Stack, Text } from "@swearjar/dos";
import { messages } from "@/content/messages";
import type { ProjectScreenshot } from "../model/projects";
import styles from "./project-media.module.css";

const GALLERY_ROW_HEIGHT = 160;
const SCREENSHOT_TILE_MAX_HEIGHT = 400;

export function ProjectScreenshotTiles({
  screenshots,
  compact = false,
  eagerFirst = false,
}: {
  screenshots: readonly ProjectScreenshot[];
  compact?: boolean;
  eagerFirst?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = screenshots.find((item) => item.id === selectedId) ?? null;

  function closeViewer() {
    const focusId = selectedId;
    setSelectedId(null);
    if (focusId)
      requestAnimationFrame(() =>
        document
          .getElementById(`project-screenshot-${compact ? "card" : "detail"}-${focusId}`)
          ?.focus(),
      );
  }

  return (
    <>
      <div className={compact ? styles.cardGallery : styles.galleryGrid}>
        {screenshots.map((item, index) => (
          <div
            key={item.id}
            className={styles.galleryFigure}
            style={{
              flexGrow: item.width / item.height,
              flexBasis: compact
                ? undefined
                : Math.round((item.width / item.height) * GALLERY_ROW_HEIGHT),
              maxWidth: (item.width / item.height) * SCREENSHOT_TILE_MAX_HEIGHT,
            }}
          >
            <Button
              id={`project-screenshot-${compact ? "card" : "detail"}-${item.id}`}
              variant="ghost"
              className={styles.galleryTrigger}
              ariaLabel={messages.projects.media.open.replace("{alt}", item.alt)}
              onClick={() => setSelectedId(item.id)}
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                loading={eagerFirst && index === 0 ? "eager" : "lazy"}
                unoptimized
                className={compact ? styles.cardPreview : styles.galleryImage}
              />
            </Button>
          </div>
        ))}
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) closeViewer();
        }}
        title={
          selected
            ? `${messages.projects.media.heading}: ${selected.alt}`
            : messages.projects.media.heading
        }
        closeLabel={messages.shell.window.closeLabel}
        surface="paper"
        className={styles.viewer}
      >
        {selected ? (
          <Image
            src={selected.src}
            alt={selected.alt}
            width={selected.width}
            height={selected.height}
            unoptimized
            className={styles.viewerImage}
          />
        ) : null}
      </Dialog>
    </>
  );
}

export function ProjectScreenshots({
  screenshots,
  eagerFirst = false,
}: {
  screenshots: readonly ProjectScreenshot[];
  eagerFirst?: boolean;
}) {
  return (
    <Stack gap={6} className={styles.gallerySection}>
      <Heading level={2}>{messages.projects.media.heading}</Heading>
      {screenshots.length === 0 ? (
        <Text role="hint">{messages.projects.media.empty}</Text>
      ) : (
        <ProjectScreenshotTiles screenshots={screenshots} eagerFirst={eagerFirst} />
      )}
    </Stack>
  );
}

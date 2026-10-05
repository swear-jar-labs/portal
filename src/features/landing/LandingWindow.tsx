"use client";

import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { CloseButton, DOS_SURFACE_ATTR, DOS_WINDOW_BODY_ATTR } from "@swearjar/dos";
import { useCloseLanding } from "@/features/shell";
import { landing } from "@/content/landing";
import { messages } from "@/content/messages";
import { ArtSection } from "./ArtSection";
import { HeroSection } from "./HeroSection";
import { LandingFooter } from "./LandingFooter";
import { PlacesSection } from "./PlacesSection";
import { PositionSection } from "./PositionSection";
import styles from "./landing.module.css";

const BOX_SECTION_ID = "landing-box";

// The fullscreen landing window on `/`: it replaces the old welcome dialog
// for guests and closes into the shell. The shell decides when it shows;
// the slice owns the chrome and the content.
export function LandingWindow() {
  const close = useCloseLanding();
  const bodyRef = useRef<HTMLDivElement>(null);

  // Like the HELP window body, the scroll region takes focus on open: the
  // controls keep their own rings.
  useEffect(() => {
    bodyRef.current?.focus({ preventScroll: true });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") close();
  };

  // An in-page jump: the window body is the scroller, so scrolling the
  // section into view stays inside the window. Smooth unless the user
  // asked to reduce motion.
  const scrollToBox = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(BOX_SECTION_ID)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={landing.title}
      className={styles.window}
      onKeyDown={onKeyDown}
    >
      <div className={styles.windowTitle}>
        <span className={styles.windowName}>{landing.title}</span>
        <CloseButton onClose={close} label={messages.shell.window.closeLabel} />
      </div>
      <div
        ref={bodyRef}
        tabIndex={0}
        {...{ [DOS_WINDOW_BODY_ATTR]: "" }}
        {...{ [DOS_SURFACE_ATTR]: "paper" }}
        className={styles.windowBody}
      >
        <div className={styles.landing}>
          <HeroSection onHowItWorks={scrollToBox} />
          <div className={styles.pageSections}>
            <PositionSection />
            <PlacesSection />
            <ArtSection />
          </div>
          <LandingFooter />
        </div>
      </div>
    </section>
  );
}

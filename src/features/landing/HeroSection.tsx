import type { MouseEvent } from "react";
import { Button } from "@swearjar/dos";
import { FORUM_PATH, REGISTER_PATH } from "@/content/commands";
import { landing } from "@/content/landing";
import { messages } from "@/content/messages";
import { PixelScene } from "./PixelScene";
import styles from "./landing.module.css";

export function HeroSection({
  onHowItWorks,
}: {
  onHowItWorks: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <header className={styles.heroBand}>
      <div className={styles.heroInner}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 className={styles.slogan}>
              {landing.slogan[0]}
              <br />
              {landing.slogan[1]}
              <br />
              {landing.slogan[2]}
            </h1>
            <p className={styles.hook}>{landing.hook}</p>
            {landing.lead.map((paragraph) => (
              <p key={paragraph} className={styles.lead}>
                {paragraph}
              </p>
            ))}
            <div className={styles.ctaRow}>
              <Button variant="primary" href={FORUM_PATH}>
                {landing.joinTeam}
              </Button>
              <Button href="#landing-box" onClick={onHowItWorks}>
                {landing.howItWorks}
              </Button>
            </div>
          </div>
          <div className={styles.heroArt}>
            <PixelScene
              scene="hero"
              label="Pixel-art scene: a CRT terminal with code on the screen, a swear jar with coins, and 3.5-inch diskettes"
              className={styles.sceneHero}
            />
            <div className={styles.diskBox}>
              <PixelScene
                scene="box"
                label={`Pixel-art software box: SWEARJAR.DOS ${messages.shell.brand.version}`}
                className={styles.sceneBox}
              />
              <div className={styles.boxCaption}>
                <p className={styles.boxTitle}>
                  {landing.diskBox.title} <b>{messages.shell.brand.version}</b>
                </p>
                <p className={`${styles.boxSub} ${styles.boxSubDim}`}>
                  {`${landing.diskBox.caption} `}
                  <a href={REGISTER_PATH}>{landing.diskBox.joinOnline}</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

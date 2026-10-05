import Image from "next/image";
import { Button } from "@swearjar/dos";
import { ERRATA_HREF, FORUM_PATH, READROOM_PATH } from "@/content/commands";
import { landing, type LandingPlaceId } from "@/content/landing";
import styles from "./landing.module.css";

// Route + screenshot per place; names, lines and alts live in
// content/landing.ts, identifiers stay in code. The Record pins all four
// places at compile time.
const PLACE_TARGETS: Record<LandingPlaceId, { href: string; image: string }> = {
  forum: { href: FORUM_PATH, image: "/landing/forum.webp" },
  errata: { href: ERRATA_HREF, image: "/landing/errata.webp" },
  readroom: { href: READROOM_PATH, image: "/landing/readroom.webp" },
  projects: { href: "/projects", image: "/landing/projects.webp" },
};

export function PlacesSection() {
  return (
    <section className={styles.sec} id="landing-box" aria-label={landing.places.title}>
      <h2 className={styles.secTitle}>{landing.places.title}</h2>
      <p className={styles.secLead}>{landing.places.intro}</p>
      <div className={styles.places}>
        {landing.places.entries.map((place) => {
          const target = PLACE_TARGETS[place.id];
          return (
            <article key={place.id} className={styles.place}>
              <div className={styles.crtFrame}>
                <div className={styles.crtScreen}>
                  <Image src={target.image} alt={place.alt} width={1238} height={905} />
                </div>
              </div>
              <h3 className={styles.placeName}>{place.name}</h3>
              <p className={styles.placeFirst}>{place.first}</p>
              <p className={styles.placeSecond}>{place.second}</p>
              <p className={styles.placeGo}>
                <Button href={target.href}>{`${landing.places.open} ${place.name}`}</Button>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

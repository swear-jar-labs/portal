import { landing } from "@/content/landing";
import styles from "./landing.module.css";

export function ArtSection() {
  return (
    <section className={styles.sec} aria-label={landing.art.title}>
      <h2 className={styles.secTitle}>{landing.art.title}</h2>
      <p className={styles.secLead}>{landing.art.text}</p>
    </section>
  );
}

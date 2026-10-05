import { Button } from "@swearjar/dos";
import { landing } from "@/content/landing";
import styles from "./landing.module.css";

export function PositionSection() {
  return (
    <section className={styles.sec} aria-label={landing.position.title}>
      <h2 className={styles.secTitle}>{landing.position.title}</h2>
      <p className={styles.secLead}>{landing.position.text}</p>
      <div className={styles.ctaRow}>
        <Button href="/manifesto">{landing.position.manifesto}</Button>
      </div>
    </section>
  );
}

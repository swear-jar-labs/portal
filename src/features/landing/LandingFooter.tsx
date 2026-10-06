import { landing } from "@/content/landing";
import styles from "./landing.module.css";

export function LandingFooter() {
  return (
    <footer className={styles.footerBand}>
      <div className={styles.footerInner}>
        <p className={styles.footerLine}>{landing.footer.line}</p>
        <p className={styles.footerBrand}>
          {`${landing.footer.brand} · `}
          <a href={`mailto:${landing.footer.email}`}>{landing.footer.email}</a>
        </p>
      </div>
    </footer>
  );
}

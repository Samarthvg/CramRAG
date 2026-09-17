import Link from "next/link";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        CramRAG
      </Link>
      <nav className={styles.nav} aria-label="Primary">
        <Link href="/">Home</Link>
        <Link href="/dev/status">API status</Link>
      </nav>
    </header>
  );
}

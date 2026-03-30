import styles from "./StatusBadge.module.css";

/**
 * Reusable status badge used across Bookings, Dashboard, and any future module.
 * Replaces the inline renderStatusBadge() function and hardcoded inline styles.
 *
 * @param {string} status - "Confirmed" | "Pending" | "Cancelled" | any string
 * @param {"sm"|"md"} size - optional size variant (default "md")
 */
export default function StatusBadge({ status, size = "md" }) {
  const key = (status || "").toLowerCase();
  const cls = [
    styles.badge,
    styles[key] || styles.default,
    size === "sm" ? styles.sm : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={cls}>{status}</span>;
}

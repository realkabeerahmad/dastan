import styles from "./MetaBadge.module.css";

/**
 * Small metadata chip used for platform tags, property types, nights, etc.
 * Replaces the dozens of inline style objects scattered across BookingsClient
 * and ManagePropertiesClient.
 *
 * @param {"indigo"|"green"|"amber"|"default"} variant
 * @param {React.ReactNode} children
 * @param {React.ReactNode} icon - optional leading icon element
 */
export default function MetaBadge({ variant = "default", icon, children }) {
  return (
    <span className={`${styles.badge} ${styles[variant] || styles.default}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}

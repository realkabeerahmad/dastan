"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building, Calendar, Settings, Wallet } from "lucide-react";
import styles from "./sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Properties", href: "/properties", icon: Building },
    { name: "Bookings", href: "/bookings", icon: Calendar },
    { name: "Finance", href: "/finance", icon: Wallet },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>Dastan</h2>
      </div>
      <nav className={styles.nav}>
        {links.map(link => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} className={`${styles.link} ${isActive ? styles.active : ''}`}>
              <link.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

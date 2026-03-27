"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building, Calendar, Settings, Wallet, Users, List, LogOut, UserCog } from "lucide-react";
import { useTransition } from "react";
import { logoutUser } from "@/actions/auth-actions";
import styles from "./sidebar.module.css";

export default function Sidebar({ session }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Properties", href: "/properties", icon: Building },
    { name: "Bookings", href: "/bookings", icon: Calendar },
    { name: "Finance", href: "/finance", icon: Wallet },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Transactions", href: "/transactions", icon: List },
    { name: "Team", href: "/users", icon: UserCog },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  function handleLogout() {
    startTransition(async () => { await logoutUser(); });
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        {/* <div className={styles.logoBadge}>BMS</div> */}
        <div>
          <div className={styles.logoName}>Mulk</div>
          <div className={styles.logoSlogan}>Manage renting portfolios</div>
        </div>
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

      {session && (
        <div className={styles.userArea}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{session.name?.[0]?.toUpperCase() || "U"}</div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{session.name}</div>
              <div className={styles.userRole}>{session.role}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} disabled={isPending} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      )}
    </aside>
  );
}

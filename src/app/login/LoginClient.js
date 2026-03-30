"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginUser } from "@/actions/auth-actions";
import styles from "./auth.module.css";
import { Loader2 } from "lucide-react";

export default function LoginClient() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.target);
    startTransition(async () => {
      const res = await loginUser(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <Link href="/">
            <div>
              {/* FIX: was <h1 className={styles.appName}> — an <h1> inside an auth card is wrong
                  heading hierarchy (the page <h2> "Welcome back" would then be subordinate to it).
                  Changed to a styled <span> — visual appearance is identical via CSS. */}
              <span className={styles.appName}>Mulk</span>
              <div className={styles.appSlogan}>Manage renting portfolios</div>
            </div>
          </Link>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your business account to continue.</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            {/* FIX: added htmlFor/id pairing — labels were not associated with their inputs */}
            <label htmlFor="login-email" className={styles.label}>Email Address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              className={styles.input}
              placeholder="you@business.com"
              autoComplete="email"
              required
            />
          </div>
          <div className={styles.group}>
            <label htmlFor="login-password" className={styles.label}>Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              className={styles.input}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className={styles.btn} disabled={isPending}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Sign In
          </button>
        </form>

        <p className={styles.footer}>
          No account yet?{" "}
          <Link href="/register" className={styles.link}>
            Create a business
          </Link>
        </p>
      </div>
    </div>
  );
}

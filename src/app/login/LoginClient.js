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
          <Link href='/'>
            <div>
              <h1 className={styles.appName}>Mulk</h1>
              <div className={styles.appSlogan}>Manage renting portfolios</div>
            </div>
          </Link>
        </div>
        <h2 className={styles.heading}>Welcome back</h2>
        <p className={styles.sub}>Sign in to your business account to continue.</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            <label className={styles.label}>Email Address</label>
            <input name="email" type="email" className={styles.input} placeholder="you@business.com" autoComplete="email" required />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" className={styles.input} placeholder="Your password" autoComplete="current-password" required />
          </div>
          <button type="submit" className={styles.btn} disabled={isPending}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Sign In
          </button>
        </form>

        <p className={styles.footer}>
          No account yet? <Link href="/register" className={styles.link}>Create a business</Link>
        </p>
      </div>
    </div>
  );
}

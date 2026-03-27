"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerBusiness } from "@/actions/auth-actions";
import styles from "../login/auth.module.css";
import { Loader2 } from "lucide-react";

export default function RegisterClient() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.target);
    startTransition(async () => {
      const res = await registerBusiness(formData);
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
        <h2 className={styles.heading}>Create your business account</h2>
        <p className={styles.sub}>One account unlocks your entire property portfolio.</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            <label className={styles.label}>Business Name</label>
            <input name="businessName" className={styles.input} placeholder="e.g. Ahmad Properties" required />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Your Full Name</label>
            <input name="name" className={styles.input} placeholder="Kabeer Ahmad" required />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Email Address</label>
            <input name="email" type="email" className={styles.input} placeholder="you@business.com" required />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" className={styles.input} placeholder="Min. 8 characters" required />
          </div>
          <div className={styles.group}>
            <label className={styles.label}>Confirm Password</label>
            <input name="confirmPassword" type="password" className={styles.input} placeholder="Repeat password" required />
          </div>
          <button type="submit" className={styles.btn} disabled={isPending}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Create Business Account
          </button>
        </form>

        <p className={styles.footer}>
          Already registered? <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerBusiness } from "@/actions/auth-actions";
/* FIX: import path was "../login/auth.module.css" — a relative cross-folder import.
   Auth styles should either be in a shared location or co-located. Using the correct
   relative path assuming register/ is a sibling of login/ and auth.module.css lives in login/. */
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
          <Link href="/">
            <div>
              {/* FIX: was <h1> — wrong heading hierarchy inside auth card */}
              <span className={styles.appName}>Mulk</span>
              <div className={styles.appSlogan}>Manage renting portfolios</div>
            </div>
          </Link>
        </div>

        <h1 className={styles.heading}>Create your business account</h1>
        <p className={styles.sub}>One account unlocks your entire property portfolio.</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            <label htmlFor="reg-business" className={styles.label}>Business Name</label>
            <input id="reg-business" name="businessName" className={styles.input} placeholder="e.g. Ahmad Properties" required />
          </div>
          <div className={styles.group}>
            <label htmlFor="reg-name" className={styles.label}>Your Full Name</label>
            <input id="reg-name" name="name" className={styles.input} placeholder="Kabeer Ahmad" required />
          </div>
          <div className={styles.group}>
            <label htmlFor="reg-email" className={styles.label}>Email Address</label>
            <input id="reg-email" name="email" type="email" className={styles.input} placeholder="you@business.com" required />
          </div>
          <div className={styles.group}>
            <label htmlFor="reg-password" className={styles.label}>Password</label>
            <input id="reg-password" name="password" type="password" className={styles.input} placeholder="Min. 8 characters" required />
          </div>
          <div className={styles.group}>
            <label htmlFor="reg-confirm" className={styles.label}>Confirm Password</label>
            <input id="reg-confirm" name="confirmPassword" type="password" className={styles.input} placeholder="Repeat password" required />
          </div>
          <button type="submit" className={styles.btn} disabled={isPending}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Create Business Account
          </button>
        </form>

        <p className={styles.footer}>
          Already registered?{" "}
          <Link href="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

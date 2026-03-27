"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, deleteUser } from "@/actions/auth-actions";
import { UserPlus, Trash2, Shield, User, Loader2 } from "lucide-react";
import styles from "./users.module.css";

export default function UsersClient({ users: initialUsers, currentUserId, businessName }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.target);
    startTransition(async () => {
      const res = await createUser(formData);
      if (res?.error) { setError(res.error); return; }
      setShowForm(false);
      e.target.reset();
      router.refresh();
    });
  }

  function handleDelete(userId) {
    if (!confirm("Remove this user from the business?")) return;
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (res?.error) { setError(res.error); return; }
      setUsers(u => u.filter(x => x.user_id !== userId));
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Team</h1>
          <p className={styles.sub}>Managing users under <strong>{businessName}</strong></p>
        </div>
        <button className={styles.addBtn} onClick={() => { setShowForm(s => !s); setError(""); }}>
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>Invite New User</h3>
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.group}>
                <label className={styles.label}>Full Name</label>
                <input name="name" className={styles.input} placeholder="John Smith" required />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Email</label>
                <input name="email" type="email" className={styles.input} placeholder="john@business.com" required />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Password</label>
                <input name="password" type="password" className={styles.input} placeholder="Min. 8 characters" required />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Role</label>
                <select name="role" className={styles.input}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowForm(false)} className={styles.cancelBtn}>Cancel</button>
              <button type="submit" className={styles.saveBtn} disabled={isPending}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Name & Email</span>
          <span>Role</span>
          <span>Joined</span>
          <span></span>
        </div>
        {users.map(u => (
          <div key={u.user_id} className={`${styles.tableRow} ${u.user_id === currentUserId ? styles.selfRow : ""}`}>
            <div className={styles.userCell}>
              <div className={`${styles.avatar} ${u.role === "admin" ? styles.avatarAdmin : ""}`}>
                {u.role === "admin" ? <Shield size={14} /> : <User size={14} />}
              </div>
              <div>
                <div className={styles.userName}>{u.name} {u.user_id === currentUserId && <span className={styles.youBadge}>you</span>}</div>
                <div className={styles.userEmail}>{u.email}</div>
              </div>
            </div>
            <span className={`${styles.roleBadge} ${u.role === "admin" ? styles.roleAdmin : styles.roleMember}`}>
              {u.role}
            </span>
            <span className={styles.date}>{new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {u.user_id !== currentUserId && (
                <button className={styles.deleteBtn} onClick={() => handleDelete(u.user_id)} disabled={isPending}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import styles from "./customers.module.css";
import { Users, Mail, Phone, Hash, Loader2, Edit2, Check, X } from "lucide-react";
import { updateCustomer } from "@/actions/customer-actions";
import { useRouter } from "next/navigation";

export default function CustomersClient({ initialCustomers }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpdate = (e, customerId) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.target);
    
    startTransition(async () => {
      const res = await updateCustomer(customerId, formData);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Guest Profiles</h1>
        <p className={styles.subtitle}>View implicitly linked booking guests and manually redefine their PII details.</p>
      </header>

      {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

      {initialCustomers.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={40} className={styles.emptyIcon} strokeWidth={1.5} />
          <h3 className={styles.emptyText}>No Customers Found</h3>
          <p className={styles.emptySubText}>Customers are intrinsically spawned when you natively confirm a Booking.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {initialCustomers.map((cust) => (
            <div key={cust.customer_id} className={styles.card}>
              {editingId === cust.customer_id ? (
                <form onSubmit={(e) => handleUpdate(e, cust.customer_id)} className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input name="name" defaultValue={cust.name} className={styles.input} required />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email Address</label>
                    <input name="email" type="email" defaultValue={cust.email} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input name="phone" defaultValue={cust.phone} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Identification (SSN/CNIC/Passport)</label>
                    <input name="identificationNumber" defaultValue={cust.identification_number} className={styles.input} />
                  </div>
                  <div className={styles.formActions}>
                    <button type="button" onClick={() => { setEditingId(null); setErrorMsg(""); }} className={styles.buttonSecondary}>
                      <X size={14} /> Cancel
                    </button>
                    <button type="submit" disabled={isPending} className={styles.buttonPrimary}>
                      {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.customerName}>{cust.name}</h3>
                    <button onClick={() => setEditingId(cust.customer_id)} className={styles.editBtn}>
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <div className={styles.infoGrid}>
                    <div className={styles.infoRow}>
                      <Mail size={14} className={styles.icon} />
                      <span>{cust.email || "No email"}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <Phone size={14} className={styles.icon} />
                      <span>{cust.phone || "No phone"}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <Hash size={14} className={styles.icon} />
                      <span>{cust.identification_number || "No Document ID"}</span>
                    </div>
                  </div>

                  <div className={styles.metricsBox}>
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Total Bookings</span>
                      <span className={styles.metricValue}>{cust.total_bookings}</span>
                    </div>
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Total Lifetime Value</span>
                      <span className={styles.metricValue}>${Number(cust.total_spent || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

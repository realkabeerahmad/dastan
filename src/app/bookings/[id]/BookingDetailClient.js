"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, User, Building, Calendar, Phone, Mail, Hash, CheckCircle2, Edit2, Check, X } from "lucide-react";
import styles from "./booking-detail.module.css";
import { updateBookingStatus, updateBookingDates } from "@/actions/booking-actions";
import DatePicker from "@/components/ui/DatePicker";

export default function BookingDetailClient({ booking }) {
  const [status, setStatus] = useState(booking.booking_status || "Confirmed");
  const [isPending, startTransition] = useTransition();

  // Date editing state
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [startDate, setStartDate] = useState(booking.start_date || "");
  const [endDate, setEndDate] = useState(booking.end_date || "");
  const [dateError, setDateError] = useState("");

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    
    startTransition(async () => {
      const res = await updateBookingStatus(booking.booking_id, newStatus);
      if (res?.error) {
        alert(res.error);
        setStatus(booking.booking_status); // Revert UI
      }
    });
  };

  const saveDates = () => {
    setDateError("");
    if (!startDate || !endDate) return setDateError("Please select both dates.");
    
    startTransition(async () => {
      const res = await updateBookingDates(booking.booking_id, startDate, endDate);
      if (res?.error) {
        setDateError(res.error);
      } else {
        setIsEditingDates(false);
      }
    });
  };

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", { 
      day: "2-digit", month: "short", year: "numeric", 
      hour: "2-digit", minute: "2-digit" 
    });
  }

  return (
    <div className={styles.container}>
      <Link href="/bookings" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Bookings
      </Link>

      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 className={styles.title}>Booking Overview</h1>
            {booking.platform && <span className={styles.badge}>{booking.platform}</span>}
          </div>
          <div className={styles.amount}>
            {booking.currency_code} {Number(booking.amount).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#a1a1aa", marginTop: "0.25rem" }}>
            ID: {booking.booking_id}
          </div>
        </div>

        <div className={styles.statusWrapper}>
          <span className={styles.statusLabel}>Current Status</span>
          <select 
            className={styles.statusSelect} 
            value={status} 
            onChange={handleStatusChange} 
            disabled={isPending || booking.booking_status === "Cancelled"}
            style={{ 
              borderColor: status === "Confirmed" ? "#10b981" : status === "Cancelled" ? "#ef4444" : "#e4e4e7",
              color: status === "Confirmed" ? "#065f46" : status === "Cancelled" ? "#991b1b" : "#09090b",
              backgroundColor: status === "Confirmed" ? "#ecfdf5" : status === "Cancelled" ? "#fef2f2" : "#fafafa",
              opacity: booking.booking_status === "Cancelled" ? 0.7 : 1,
              cursor: booking.booking_status === "Cancelled" ? "not-allowed" : "pointer"
            }}
          >
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          {isPending && <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Saving...</div>}
        </div>
      </header>

      <div className={styles.grid}>
        {/* Customer Details */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <User size={18} color="#71717a" strokeWidth={2.5}/> Customer Information
          </h2>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>Full Name</span>
            <span className={styles.dataValue}>{booking.customer_name}</span>
          </div>
          {booking.customer_phone && (
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Phone</span>
              <span className={styles.dataValue} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Phone size={14} color="#a1a1aa" /> {booking.customer_phone}
              </span>
            </div>
          )}
          {booking.customer_email && (
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Email</span>
              <span className={styles.dataValue} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} color="#a1a1aa" /> {booking.customer_email}
              </span>
            </div>
          )}
          {booking.customer_id_num && (
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Doc ID</span>
              <span className={styles.dataValue} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Hash size={14} color="#a1a1aa" /> {booking.customer_id_num}
              </span>
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Building size={18} color="#71717a" strokeWidth={2.5} /> Stay Information
          </h2>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>Property</span>
            <span className={styles.dataValue} style={{ fontWeight: 600 }}>{booking.property_name || "Unknown"}</span>
          </div>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>Location</span>
            <span className={styles.dataValue}>{booking.city}, {booking.country}</span>
          </div>
          {booking.property_address && (
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Address</span>
              <span className={styles.dataValue} style={{ color: "#71717a", fontSize: "0.8125rem" }}>{booking.property_address}</span>
            </div>
          )}
          
          <div style={{ marginTop: "1.5rem", borderTop: "1px dashed #e4e4e7", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Schedule</span>
              {status === "Pending" && !isEditingDates && (
                <button 
                  onClick={() => setIsEditingDates(true)} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#71717a', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                >
                  <Edit2 size={12} /> Edit Dates
                </button>
              )}
            </div>

            {isEditingDates ? (
              <div style={{ background: '#f4f4f5', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className={styles.dataLabel} style={{ marginBottom: "0.25rem", display: "block" }}>Check-in</label>
                  <DatePicker value={startDate} onChange={setStartDate} />
                </div>
                <div>
                  <label className={styles.dataLabel} style={{ marginBottom: "0.25rem", display: "block" }}>Check-out</label>
                  <DatePicker value={endDate} onChange={setEndDate} />
                </div>
                {dateError && <div style={{ color: '#ef4444', fontSize: '0.75rem' }}>{dateError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setIsEditingDates(false)} style={{ padding: '0.3rem 0.6rem', border: '1px solid #e4e4e7', background: '#fff', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveDates} disabled={isPending} style={{ padding: '0.3rem 0.6rem', border: 'none', background: '#18181b', color: '#fff', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Check size={12} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.dataRow}>
                  <span className={styles.dataLabel}>Check-in</span>
                  <span className={styles.dataValue} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} color="#10b981" /> {formatDate(booking.start_date)}
                  </span>
                </div>
                <div className={styles.dataRow}>
                  <span className={styles.dataLabel}>Check-out</span>
                  <span className={styles.dataValue} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} color="#ef4444" /> {formatDate(booking.end_date)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Ledger */}
        <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
           <h2 className={styles.cardTitle}>
            <CheckCircle2 size={18} color="#71717a" strokeWidth={2.5}/> Transaction Ledger Note
          </h2>
          {booking.booking_status === "Cancelled" ? (
            <p style={{ fontSize: "0.875rem", color: "#991b1b", lineHeight: 1.5, margin: 0 }}>
              This booking was <b>Cancelled</b>. The fiscal income and profit have been automatically reversed from both the Property Account and the global {booking.currency_code} Main Account, and a Cancellation Transaction was appended to the accounting ledger. The booking is now locked and cannot be un-cancelled.
            </p>
          ) : booking.booking_status === "Pending" ? (
            <p style={{ fontSize: "0.875rem", color: "#52525b", lineHeight: 1.5, margin: 0 }}>
              This booking is currently <b>Pending</b>. No financial transactions have been committed to the accounts yet. You may freely modify the booking dates. Changing the status to <b>Confirmed</b> will securely lock in the financial ledger deposits.
            </p>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "#52525b", lineHeight: 1.5, margin: 0 }}>
              This booking generated dual-transactions increasing income & profit for properties and the main <b>{booking.currency_code}</b> global ledger. Changing status to <b>Pending</b> or <b>Cancelled</b> will automatically trigger a complete financial reversion on all associated ledgers explicitly logging the deduction.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

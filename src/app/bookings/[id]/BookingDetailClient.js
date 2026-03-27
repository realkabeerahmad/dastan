"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, User, Building, Calendar, Phone, Mail, Hash,
  CheckCircle2, Edit2, Check, X, Trash2, PlusCircle
} from "lucide-react";
import styles from "./booking-detail.module.css";
import { updateBookingStatus, updateBookingSegments } from "@/actions/booking-actions";

function fmtDate(d) {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function segNights(seg) {
  if (!seg.start_date || !seg.end_date) return 0;
  const s = new Date(seg.start_date + "T00:00:00Z");
  const e = new Date(seg.end_date + "T00:00:00Z");
  return Math.max(0, Math.floor((e - s) / 86400000) + 1);
}

function toDateInput(d) {
  // d may be a Date object or ISO string
  if (!d) return "";
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.slice(0, 10);
}

export default function BookingDetailClient({ booking, initialSegments }) {
  const [status, setStatus] = useState(booking.booking_status || "Confirmed");
  const [isPending, startTransition] = useTransition();

  // ── Segment editing state ───────────────────────────────────────────────────
  const defaultSegments = initialSegments?.length
    ? initialSegments.map(s => ({
        start_date: toDateInput(s.start_date),
        end_date:   toDateInput(s.end_date)
      }))
    : [{ start_date: toDateInput(booking.start_date), end_date: toDateInput(booking.end_date) }];

  const [isEditingDates, setIsEditingDates] = useState(false);
  const [segments, setSegments] = useState(defaultSegments);
  const [dateError, setDateError] = useState("");

  const totalNights = segments.reduce((acc, seg) => acc + segNights(seg), 0);
  const dailyRatePreview = totalNights > 0
    ? (Number(booking.amount) / totalNights).toFixed(2)
    : null;

  function addSegment() { setSegments(s => [...s, { start_date: "", end_date: "" }]); }
  function removeSegment(i) { setSegments(s => s.filter((_, idx) => idx !== i)); }
  function updateSeg(i, field, val) {
    setSegments(s => s.map((seg, idx) => idx === i ? { ...seg, [field]: val } : seg));
  }

  function cancelEdit() {
    setSegments(defaultSegments);
    setDateError("");
    setIsEditingDates(false);
  }

  // ── Status change ───────────────────────────────────────────────────────────
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    startTransition(async () => {
      const res = await updateBookingStatus(booking.booking_id, newStatus);
      if (res?.error) {
        alert(res.error);
        setStatus(booking.booking_status);
      }
    });
  };

  // ── Save segments ───────────────────────────────────────────────────────────
  const saveSegments = () => {
    setDateError("");
    if (segments.some(s => !s.start_date || !s.end_date))
      return setDateError("All segments need both a start and end date.");
    if (totalNights === 0)
      return setDateError("Segments produce zero nights — check your dates.");

    startTransition(async () => {
      const res = await updateBookingSegments(booking.booking_id, segments);
      if (res?.error) {
        setDateError(res.error);
      } else {
        setIsEditingDates(false);
      }
    });
  };

  const isCancelled = booking.booking_status === "Cancelled";

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
            {booking.total_nights && (
              <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#71717a", marginLeft: "0.5rem" }}>
                · {booking.total_nights}N @ {booking.currency_code} {Number(booking.daily_rate || 0).toLocaleString()}/night
              </span>
            )}
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
            disabled={isPending || isCancelled}
            style={{
              borderColor: status === "Confirmed" ? "#10b981" : status === "Cancelled" ? "#ef4444" : "#e4e4e7",
              color: status === "Confirmed" ? "#065f46" : status === "Cancelled" ? "#991b1b" : "#09090b",
              backgroundColor: status === "Confirmed" ? "#ecfdf5" : status === "Cancelled" ? "#fef2f2" : "#fafafa",
              opacity: isCancelled ? 0.7 : 1,
              cursor: isCancelled ? "not-allowed" : "pointer"
            }}
          >
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          {isPending && <div style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>Saving...</div>}
        </div>
      </header>

      <div className={styles.grid}>
        {/* Customer Details */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <User size={18} color="#71717a" strokeWidth={2.5} /> Customer Information
          </h2>
          <div className={styles.dataRow}>
            <span className={styles.dataLabel}>Full Name</span>
            <span className={styles.dataValue}>{booking.customer_name}</span>
          </div>
          {booking.customer_phone && (
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Phone</span>
              <span className={styles.dataValue} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Phone size={14} color="#a1a1aa" /> {booking.customer_phone}
              </span>
            </div>
          )}
          {booking.customer_email && (
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Email</span>
              <span className={styles.dataValue} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Mail size={14} color="#a1a1aa" /> {booking.customer_email}
              </span>
            </div>
          )}
          {booking.customer_id_num && (
            <div className={styles.dataRow}>
              <span className={styles.dataLabel}>Doc ID</span>
              <span className={styles.dataValue} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Hash size={14} color="#a1a1aa" /> {booking.customer_id_num}
              </span>
            </div>
          )}
        </div>

        {/* Stay / Schedule */}
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

          {/* ── Schedule section ── */}
          <div style={{ marginTop: "1.5rem", borderTop: "1px dashed #e4e4e7", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Schedule
                {!isEditingDates && totalNights > 0 && (
                  <span style={{ fontWeight: 400, color: "#71717a", marginLeft: "0.5rem", fontSize: "0.8125rem" }}>
                    {totalNights}N
                  </span>
                )}
              </span>
              {!isCancelled && !isEditingDates && (
                <button
                  onClick={() => setIsEditingDates(true)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#71717a",
                    display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem" }}
                >
                  <Edit2 size={12} /> Edit Dates
                </button>
              )}
            </div>

            {isEditingDates ? (
              <div style={{ background: "#f9f9f9", padding: "1rem", borderRadius: "8px",
                border: "1px solid #e4e4e7", display: "flex", flexDirection: "column", gap: "0.75rem" }}>

                {/* Night + rate pill */}
                {totalNights > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, background: "#f0fdf4",
                      color: "#166534", border: "1px solid #bbf7d0", borderRadius: "99px",
                      padding: "0.15rem 0.6rem" }}>
                      {totalNights}N{dailyRatePreview ? ` · ${booking.currency_code} ${dailyRatePreview}/night` : ""}
                    </span>
                    {status === "Confirmed" && (
                      <span style={{ fontSize: "0.7rem", color: "#b45309", background: "#fef3c7",
                        border: "1px solid #fde68a", borderRadius: "6px", padding: "0.1rem 0.4rem" }}>
                        Will rebuild all {booking.total_nights || "?"} daily transactions
                      </span>
                    )}
                  </div>
                )}

                {/* Segment rows */}
                {segments.map((seg, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500,
                        color: "#52525b", marginBottom: "0.25rem" }}>
                        Check-in{segments.length > 1 ? ` #${i + 1}` : ""}
                      </label>
                      <input type="date" value={seg.start_date}
                        onChange={e => updateSeg(i, "start_date", e.target.value)}
                        max={seg.end_date || undefined}
                        style={{ width: "100%", border: "1px solid #e4e4e7", borderRadius: "6px",
                          padding: "0.5rem 0.625rem", fontSize: "0.8125rem", fontFamily: "inherit",
                          background: "#fff", outline: "none" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500,
                        color: "#52525b", marginBottom: "0.25rem" }}>
                        Check-out{segments.length > 1 ? ` #${i + 1}` : ""}
                      </label>
                      <input type="date" value={seg.end_date}
                        onChange={e => updateSeg(i, "end_date", e.target.value)}
                        min={seg.start_date || undefined}
                        style={{ width: "100%", border: "1px solid #e4e4e7", borderRadius: "6px",
                          padding: "0.5rem 0.625rem", fontSize: "0.8125rem", fontFamily: "inherit",
                          background: "#fff", outline: "none" }} />
                    </div>
                    {segNights(seg) > 0 && (
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#166534",
                        background: "#f0fdf4", borderRadius: "5px", padding: "0.3rem 0.4rem",
                        flexShrink: 0, marginBottom: "0.1rem" }}>
                        {segNights(seg)}n
                      </span>
                    )}
                    {segments.length > 1 && (
                      <button onClick={() => removeSegment(i)}
                        title="Remove segment"
                        style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer",
                          padding: "0.3rem", borderRadius: "5px", marginBottom: "0.1rem",
                          display: "flex", alignItems: "center", flexShrink: 0 }}
                        onMouseOver={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fef2f2"; }}
                        onMouseOut={e => { e.currentTarget.style.color = "#a1a1aa"; e.currentTarget.style.background = "none"; }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add segment */}
                <button onClick={addSegment}
                  style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "0.35rem",
                    background: "none", border: "1px dashed #d4d4d8", borderRadius: "6px", color: "#71717a",
                    fontSize: "0.75rem", padding: "0.35rem 0.65rem", cursor: "pointer", fontFamily: "inherit" }}>
                  <PlusCircle size={12} /> Add date block
                </button>

                {dateError && (
                  <div style={{ color: "#ef4444", fontSize: "0.75rem", padding: "0.5rem 0.75rem",
                    background: "#fef2f2", borderRadius: "6px", border: "1px solid #fca5a5" }}>
                    {dateError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.25rem" }}>
                  <button onClick={cancelEdit} disabled={isPending}
                    style={{ padding: "0.35rem 0.75rem", border: "1px solid #e4e4e7", background: "#fff",
                      borderRadius: "6px", fontSize: "0.8125rem", cursor: "pointer", display: "flex",
                      alignItems: "center", gap: "0.25rem" }}>
                    <X size={13} /> Cancel
                  </button>
                  <button onClick={saveSegments} disabled={isPending}
                    style={{ padding: "0.35rem 0.75rem", border: "none", background: "#18181b",
                      color: "#fff", borderRadius: "6px", fontSize: "0.8125rem", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "0.25rem",
                      opacity: isPending ? 0.7 : 1 }}>
                    <Check size={13} /> {isPending ? "Saving..." : "Save Dates"}
                  </button>
                </div>
              </div>
            ) : (
              /* Read-only view */
              defaultSegments.length > 1 ? (
                /* Multi-segment display */
                <div>
                  {defaultSegments.map((seg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between",
                      padding: "0.5rem 0", borderBottom: i < defaultSegments.length - 1 ? "1px dashed #f4f4f5" : "none" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem",
                        fontSize: "0.8125rem", color: "#52525b" }}>
                        <Calendar size={13} color="#10b981" />
                        {fmtDate(seg.start_date)}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#a1a1aa" }}>→</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.35rem",
                        fontSize: "0.8125rem", color: "#52525b" }}>
                        <Calendar size={13} color="#ef4444" />
                        {fmtDate(seg.end_date)}
                      </span>
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#166534",
                        background: "#f0fdf4", borderRadius: "4px", padding: "0.1rem 0.35rem" }}>
                        {segNights(seg)}N
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single segment display */
                <>
                  <div className={styles.dataRow}>
                    <span className={styles.dataLabel}>Check-in</span>
                    <span className={styles.dataValue} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Calendar size={14} color="#10b981" /> {fmtDate(booking.start_date)}
                    </span>
                  </div>
                  <div className={styles.dataRow}>
                    <span className={styles.dataLabel}>Check-out</span>
                    <span className={styles.dataValue} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Calendar size={14} color="#ef4444" /> {fmtDate(booking.end_date)}
                    </span>
                  </div>
                </>
              )
            )}
          </div>
        </div>

        {/* Ledger note */}
        <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
          <h2 className={styles.cardTitle}>
            <CheckCircle2 size={18} color="#71717a" strokeWidth={2.5} /> Transaction Ledger
          </h2>
          {isCancelled ? (
            <p style={{ fontSize: "0.875rem", color: "#991b1b", lineHeight: 1.5, margin: 0 }}>
              This booking was <b>Cancelled</b>. All per-day income transactions have been individually reversed
              from both the Property Account and the global {booking.currency_code} Main Account.
              The booking is locked and cannot be un-cancelled.
            </p>
          ) : status === "Pending" ? (
            <p style={{ fontSize: "0.875rem", color: "#52525b", lineHeight: 1.5, margin: 0 }}>
              This booking is <b>Pending</b>. No financial transactions have been committed yet.
              You may freely edit the dates and segments. Confirming will post one <b>BookingDailyCharge</b> transaction
              per night to the accounting ledger.
            </p>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "#52525b", lineHeight: 1.5, margin: 0 }}>
              This booking has <b>{booking.total_nights || "?"} daily charge transactions</b> posted at{" "}
              <b>{booking.currency_code} {Number(booking.daily_rate || 0).toLocaleString()}/night</b>.
              Editing dates will atomically reverse all existing transactions and rebuild them from the new schedule.
              Cancelling will individually reverse every daily transaction.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

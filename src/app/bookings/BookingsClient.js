"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Calendar, Loader2, ArrowLeft, User, Building, Trash2, PlusCircle } from "lucide-react";
import styles from "./bookings.module.css";
import { createBooking } from "@/actions/booking-actions";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function BookingsClient({ initialBookings, properties }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [amount, setAmount] = useState("");

  // Multi-segment state
  const [segments, setSegments] = useState([{ start_date: "", end_date: "" }]);

  const propertyOptions = properties.map(p => ({ id: p.property_id, name: p.property_name }));

  // Total nights inclusive (end - start + 1 per segment)
  const totalNights = segments.reduce((acc, seg) => {
    if (!seg.start_date || !seg.end_date) return acc;
    const s = new Date(seg.start_date + "T00:00:00Z");
    const e = new Date(seg.end_date + "T00:00:00Z");
    if (e < s) return acc;
    return acc + Math.floor((e - s) / 86400000) + 1;
  }, 0);

  const dailyRate = amount && totalNights > 0
    ? (parseFloat(amount) / totalNights).toFixed(2)
    : null;

  function addSegment() { setSegments(s => [...s, { start_date: "", end_date: "" }]); }
  function removeSegment(i) { setSegments(s => s.filter((_, idx) => idx !== i)); }
  function updateSegment(i, field, val) {
    setSegments(s => s.map((seg, idx) => idx === i ? { ...seg, [field]: val } : seg));
  }

  function resetForm() {
    setIsAdding(false);
    setSelectedProperty(null);
    setSegments([{ start_date: "", end_date: "" }]);
    setAmount("");
    setErrorMsg("");
  }

  async function handleCreate(formData) {
    setErrorMsg("");
    if (segments.some(s => !s.start_date || !s.end_date))
      return setErrorMsg("All date segments must have a start and end date.");
    if (totalNights === 0)
      return setErrorMsg("Date segments produce zero nights — check your dates.");
    formData.set("segments", JSON.stringify(segments));
    startTransition(async () => {
      const res = await createBooking(formData);
      if (res.error) setErrorMsg(res.error);
      else resetForm();
    });
  }

  function renderStatusBadge(status) {
    let color = "#18181b", bg = "#f4f4f5";
    if (status === "Confirmed") { color = "#166534"; bg = "#dcfce7"; }
    else if (status === "Pending") { color = "#b45309"; bg = "#fef3c7"; }
    else if (status === "Cancelled") { color = "#991b1b"; bg = "#fee2e2"; }
    return (
      <span style={{ fontSize: "0.75rem", fontWeight: 500, color, background: bg,
        padding: "0.25rem 0.5rem", borderRadius: "12px" }}>
        {status}
      </span>
    );
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function segNights(seg) {
    if (!seg.start_date || !seg.end_date) return 0;
    const s = new Date(seg.start_date + "T00:00:00Z");
    const e = new Date(seg.end_date + "T00:00:00Z");
    return Math.max(0, Math.floor((e - s) / 86400000) + 1);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Manage Bookings</h1>
          <p className={styles.subtitle}>
            {isAdding ? "Create a new booking." : "Track your guest bookings and transactions."}
          </p>
        </div>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className={styles.buttonPrimary}>
            <Plus size={16} strokeWidth={2.5} /> Add Booking
          </button>
        )}
      </header>

      {isAdding ? (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <button onClick={resetForm} className={styles.buttonSecondary}
              style={{ padding: "0.25rem 0.5rem", marginBottom: "1rem" }}>
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className={styles.title} style={{ fontSize: "1.25rem" }}>New Booking</h2>
          </div>

          <form action={handleCreate}>
            {/* Customer */}
            <h3 className={styles.formSectionTitle}>Customer Details</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input name="name" className={styles.input} placeholder="John Doe" required />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>SSN / CNIC / Passport</label>
                <input name="identificationNumber" className={styles.input} placeholder="Document ID" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Phone Number</label>
                <input name="phone" className={styles.input} placeholder="+1 ..." />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input name="email" type="email" className={styles.input} placeholder="john@example.com" />
            </div>

            {/* Booking */}
            <h3 className={styles.formSectionTitle}>Booking Details</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Property</label>
              <SearchableSelect name="propertyId" options={propertyOptions}
                value={selectedProperty?.name || ""}
                onChange={opt => setSelectedProperty(opt)}
                placeholder="Search Property" submitId={true} required />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Total Booking Amount</label>
                <input name="amount" type="number" step="0.01" min="0" className={styles.input}
                  placeholder="0.00" value={amount}
                  onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Currency</label>
                <select name="currencyCode" className={styles.select} required>
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
            </div>

            {/* Stay segments */}
            <div className={styles.segmentHeader}>
              <h3 className={styles.formSectionTitle} style={{ margin: 0 }}>Stay Dates</h3>
              {totalNights > 0 && (
                <div className={styles.nightPill}>
                  {totalNights} night{totalNights !== 1 ? "s" : ""}
                  {dailyRate ? ` · ${dailyRate}/night` : ""}
                </div>
              )}
            </div>

            {segments.map((seg, i) => (
              <div key={i} className={styles.segmentRow}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>
                    Check-in{segments.length > 1 ? ` #${i + 1}` : ""}
                  </label>
                  <input type="date" className={styles.input}
                    value={seg.start_date}
                    onChange={e => updateSegment(i, "start_date", e.target.value)}
                    max={seg.end_date || undefined} />
                </div>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>
                    Check-out{segments.length > 1 ? ` #${i + 1}` : ""}
                  </label>
                  <input type="date" className={styles.input}
                    value={seg.end_date}
                    onChange={e => updateSegment(i, "end_date", e.target.value)}
                    min={seg.start_date || undefined} />
                </div>
                {segNights(seg) > 0 && (
                  <div className={styles.segmentNights}>{segNights(seg)}n</div>
                )}
                {segments.length > 1 && (
                  <button type="button" className={styles.removeSegBtn}
                    onClick={() => removeSegment(i)} title="Remove segment">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            <button type="button" className={styles.addSegBtn} onClick={addSegment}>
              <PlusCircle size={14} /> Add another date block
            </button>

            <div className={styles.formRow} style={{ marginTop: "1.25rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <select name="bookingStatus" className={styles.select}>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Booking Platform</label>
                <select name="platform" className={styles.select}>
                  <option value="Offline">Offline / Direct</option>
                  <option value="Airbnb">Airbnb</option>
                  <option value="BookMe">BookMe</option>
                  <option value="Agoda">Agoda</option>
                  <option value="Booking.com">Booking.com</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "1rem",
                padding: "0.75rem", background: "#fef2f2", borderRadius: "8px",
                border: "1px solid #fca5a5" }}>
                {errorMsg}
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" onClick={resetForm} className={styles.buttonSecondary}>Cancel</button>
              <button type="submit" className={styles.buttonPrimary} disabled={isPending}>
                {isPending ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {initialBookings.length === 0 ? (
            <div className={styles.emptyState}>
              <Calendar size={48} className={styles.emptyIcon} strokeWidth={1.5} />
              <h3 className={styles.emptyText}>No bookings yet</h3>
              <p className={styles.emptySubText}>Create your first booking to start generating revenue.</p>
              <button onClick={() => setIsAdding(true)} className={styles.buttonPrimary} style={{ marginTop: "1.5rem" }}>
                <Plus size={16} /> Add Booking
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {initialBookings.map((b) => (
                <Link href={`/bookings/${b.booking_id}`} key={b.booking_id} style={{ textDecoration: "none" }}>
                  <div className={styles.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#18181b", margin: 0 }}>
                        {b.currency_code} {Number(b.amount).toLocaleString()}
                      </h3>
                      {renderStatusBadge(b.booking_status)}
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                      {b.platform && (
                        <span style={{ fontSize: "0.7rem", background: "#e0e7ff", color: "#3730a3",
                          padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 500 }}>
                          {b.platform}
                        </span>
                      )}
                      {b.total_nights && (
                        <span style={{ fontSize: "0.7rem", background: "#f0fdf4", color: "#166534",
                          padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 500 }}>
                          {b.total_nights}N
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start",
                      marginBottom: "0.5rem", fontSize: "0.8125rem", color: "#71717a" }}>
                      <Building size={14} style={{ marginTop: "0.1rem", flexShrink: 0 }} />
                      <span>{b.property_name || "Unknown Property"}</span>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start",
                      marginBottom: "1rem", fontSize: "0.8125rem", color: "#71717a" }}>
                      <User size={14} style={{ marginTop: "0.1rem", flexShrink: 0 }} />
                      <span>{b.customer_name}</span>
                    </div>

                    <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: "0.75rem",
                      display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#a1a1aa" }}>
                      <div>
                        <div style={{ marginBottom: "0.25rem" }}>In: {formatDate(b.start_date)}</div>
                        <div>Out: {formatDate(b.end_date)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {b.daily_rate && (
                          <div>{Number(b.daily_rate).toLocaleString()}/night</div>
                        )}
                        <div>{formatDate(b.created_at)}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

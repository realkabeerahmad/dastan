"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Calendar, Loader2, ArrowLeft, User, Building, MapPin } from "lucide-react";
import styles from "./bookings.module.css";
import { createBooking } from "@/actions/booking-actions";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DatePicker from "@/components/ui/DatePicker";

export default function BookingsClient({ initialBookings, properties }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Derive options for SearchableSelect
  const propertyOptions = properties.map(p => ({ id: p.property_id, name: p.property_name }));

  async function handleCreate(formData) {
    setErrorMsg("");
    startTransition(async () => {
      const res = await createBooking(formData);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setIsAdding(false);
        setSelectedProperty(null);
        setStartDate("");
        setEndDate("");
      }
    });
  }

  function renderStatusBadge(status) {
    let color = "#18181b";
    let bg = "#f4f4f5";
    if (status === "Confirmed") { color = "#166534"; bg = "#dcfce7"; }
    return (
      <span style={{ fontSize: "0.75rem", fontWeight: 500, color, background: bg, padding: "0.25rem 0.5rem", borderRadius: "12px" }}>
        {status}
      </span>
    );
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Manage Bookings</h1>
          <p className={styles.subtitle}>
            {isAdding ? "Create a new booking/transaction." : "Track your guest bookings and transactions."}
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
            <button
              onClick={() => setIsAdding(false)}
              className={styles.buttonSecondary}
              style={{ padding: "0.25rem 0.5rem", marginBottom: "1rem" }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className={styles.title} style={{ fontSize: "1.25rem" }}>
              New Booking
            </h2>
          </div>
          
          <form action={handleCreate}>
            
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

            <h3 className={styles.formSectionTitle}>Booking Details</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Property</label>
              <SearchableSelect 
                name="propertyId" 
                options={propertyOptions}
                value={selectedProperty?.name || ""}
                onChange={(opt) => setSelectedProperty(opt)}
                placeholder="Search Property"
                submitId={true}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Booking Amount</label>
                <input name="amount" type="number" step="0.01" min="0" className={styles.input} placeholder="0.00" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Currency</label>
                <select name="currencyCode" className={styles.select} required>
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Check-in Date</label>
                <DatePicker 
                  name="startDate" 
                  value={startDate} 
                  onChange={setStartDate} 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Check-out Date</label>
                <DatePicker 
                  name="endDate" 
                  value={endDate} 
                  onChange={setEndDate} 
                  required 
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <select name="bookingStatus" className={styles.select}>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
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
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "1rem", padding: "0.75rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                {errorMsg}
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" onClick={() => setIsAdding(false)} className={styles.buttonSecondary}>
                Cancel
              </button>
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
                <Link href={`/bookings/${b.booking_id}`} key={b.booking_id} style={{ textDecoration: 'none' }}>
                  <div className={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#18181b', margin: 0 }}>
                        {b.currency_code} {Number(b.amount).toLocaleString()}
                      </h3>
                      {renderStatusBadge(b.booking_status)}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {b.platform && (
                        <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 500 }}>
                          {b.platform}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.5rem", fontSize: "0.8125rem", color: "#71717a" }}>
                      <Building size={14} style={{ marginTop: "0.1rem", flexShrink: 0 }} />
                      <span>{b.property_name || 'Unknown Property'}</span>
                    </div>
                    
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "1rem", fontSize: "0.8125rem", color: "#71717a" }}>
                      <User size={14} style={{ marginTop: "0.1rem", flexShrink: 0 }} />
                      <span>{b.customer_name}</span>
                    </div>

                    <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: "0.75rem", display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#a1a1aa' }}>
                      <div>
                        <div style={{ marginBottom: "0.25rem" }}>In: {formatDate(b.start_date)}</div>
                        <div>Out: {formatDate(b.end_date)}</div>
                      </div>
                      <div>
                        {formatDate(b.created_at)}
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

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Calendar, Loader2, ArrowLeft, User, Building, Trash2, PlusCircle } from "lucide-react";
import styles from "./bookings.module.css";
import { createBooking } from "@/actions/booking-actions";
import SearchableSelect from "@/components/ui/SearchableSelect";
import StatusBadge from "@/components/ui/StatusBadge";
import MetaBadge from "@/components/ui/MetaBadge";
import { formatDate } from "@/lib/dateUtils";

export default function BookingsClient({ initialBookings, properties, customers = [] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [amount, setAmount] = useState("");

  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerIdNum, setCustomerIdNum] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const customerOptions = customers.map((c) => ({
    id: c.customer_id,
    name: `${c.name} (${c.email || "No Email"} — ${c.phone || "No Phone"})`,
    original: c,
  }));

  function handleCustomerSelect(opt) {
    if (!opt) return;
    const c = opt.original;
    setCustomerName(c.name || "");
    setCustomerIdNum(c.identification_number || "");
    setCustomerPhone(c.phone || "");
    setCustomerEmail(c.email || "");
  }

  const [segments, setSegments] = useState([{ start_date: "", end_date: "" }]);
  const propertyOptions = properties.map((p) => ({ id: p.property_id, name: p.property_name }));

  const totalNights = segments.reduce((acc, seg) => {
    if (!seg.start_date || !seg.end_date) return acc;
    const s = new Date(seg.start_date + "T00:00:00Z");
    const e = new Date(seg.end_date + "T00:00:00Z");
    if (e < s) return acc;
    return acc + Math.floor((e - s) / 86400000) + 1;
  }, 0);

  const dailyRate =
    amount && totalNights > 0
      ? (parseFloat(amount) / totalNights).toFixed(2)
      : null;

  function addSegment() { setSegments((s) => [...s, { start_date: "", end_date: "" }]); }
  function removeSegment(i) { setSegments((s) => s.filter((_, idx) => idx !== i)); }
  function updateSegment(i, field, val) {
    setSegments((s) => s.map((seg, idx) => (idx === i ? { ...seg, [field]: val } : seg)));
  }

  function segNights(seg) {
    if (!seg.start_date || !seg.end_date) return 0;
    const s = new Date(seg.start_date + "T00:00:00Z");
    const e = new Date(seg.end_date + "T00:00:00Z");
    return Math.max(0, Math.floor((e - s) / 86400000) + 1);
  }

  function resetForm() {
    setIsAdding(false);
    setSelectedProperty(null);
    setSegments([{ start_date: "", end_date: "" }]);
    setAmount("");
    setCustomerName("");
    setCustomerIdNum("");
    setCustomerPhone("");
    setCustomerEmail("");
    setIsNewCustomer(true);
    setErrorMsg("");
  }

  async function handleCreate(formData) {
    setErrorMsg("");
    if (segments.some((s) => !s.start_date || !s.end_date))
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Manage Bookings</h1>
          <p className={styles.subtitle}>
            {isAdding
              ? "Create a new booking."
              : "Track your guest bookings and transactions."}
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
            {/* FIX: removed inline style={{ padding, marginBottom }} — use CSS class modifier instead */}
            <button onClick={resetForm} className={`${styles.buttonSecondary} ${styles.backBtn}`}>
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className={styles.formTitle}>New Booking</h2>
          </div>

          <form action={handleCreate}>
            {/* ── Customer section ── */}
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.formSectionTitle}>Customer Details</h3>
              {customers.length > 0 && (
                /* FIX: was inline style={{ fontSize, background, border, color, cursor, fontWeight }}
                   Now uses a CSS class */
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(!isNewCustomer)}
                  className={styles.toggleCustomerBtn}
                >
                  {isNewCustomer ? "Search Existing Customer" : "Enter Manually"}
                </button>
              )}
            </div>

            {!isNewCustomer && customers.length > 0 && (
              /* FIX: was inline style with background:"#f0f9ff", border:"1px dashed #bae6fd", color:"#0369a1"
                 — light blue panel visible on dark form. Now uses CSS class. */
              <div className={`${styles.formGroup} ${styles.customerSearchPanel}`}>
                <label className={styles.label}>Find Customer</label>
                <SearchableSelect
                  options={customerOptions}
                  value={customerName ? `Selected: ${customerName}` : ""}
                  onChange={handleCustomerSelect}
                  placeholder="Type name, email, or phone..."
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Full Name</label>
              <input
                name="name"
                className={styles.input}
                placeholder="John Doe"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>SSN / CNIC / Passport</label>
                <input
                  name="identificationNumber"
                  className={styles.input}
                  placeholder="Document ID"
                  value={customerIdNum}
                  onChange={(e) => setCustomerIdNum(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Phone Number</label>
                <input
                  name="phone"
                  className={styles.input}
                  placeholder="+1 ..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                name="email"
                type="email"
                className={styles.input}
                placeholder="john@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>

            {/* ── Booking details ── */}
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
                <label className={styles.label}>Total Booking Amount</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.input}
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Currency</label>
                <select name="currencyCode" className={styles.select} required>
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
            </div>

            {/* ── Stay segments ── */}
            <div className={styles.segmentHeader}>
              <h3 className={`${styles.formSectionTitle} ${styles.noMargin}`}>Stay Dates</h3>
              {totalNights > 0 && (
                <div className={styles.nightPill}>
                  {totalNights} night{totalNights !== 1 ? "s" : ""}
                  {dailyRate ? ` · ${dailyRate}/night` : ""}
                </div>
              )}
            </div>

            {segments.map((seg, i) => (
              <div key={i} className={styles.segmentRow}>
                <div className={`${styles.formGroup} ${styles.segmentField}`}>
                  <label className={styles.label}>
                    Check-in{segments.length > 1 ? ` #${i + 1}` : ""}
                  </label>
                  <input
                    type="date"
                    className={styles.input}
                    value={seg.start_date}
                    onChange={(e) => updateSegment(i, "start_date", e.target.value)}
                    max={seg.end_date || undefined}
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.segmentField}`}>
                  <label className={styles.label}>
                    Check-out{segments.length > 1 ? ` #${i + 1}` : ""}
                  </label>
                  <input
                    type="date"
                    className={styles.input}
                    value={seg.end_date}
                    onChange={(e) => updateSegment(i, "end_date", e.target.value)}
                    min={seg.start_date || undefined}
                  />
                </div>
                {segNights(seg) > 0 && (
                  <div className={styles.segmentNights}>{segNights(seg)}n</div>
                )}
                {segments.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeSegBtn}
                    onClick={() => removeSegment(i)}
                    title="Remove segment"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            <button type="button" className={styles.addSegBtn} onClick={addSegment}>
              <PlusCircle size={14} /> Add another date block
            </button>

            <div className={`${styles.formRow} ${styles.formRowSpacedTop}`}>
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

            {/* FIX: was inline style with background:"#fef2f2", border:"1px solid #fca5a5" — light red on dark */}
            {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

            <div className={styles.formActions}>
              <button type="button" onClick={resetForm} className={styles.buttonSecondary}>
                Cancel
              </button>
              <button type="submit" className={styles.buttonPrimary} disabled={isPending}>
                {isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  "Confirm Booking"
                )}
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
              <p className={styles.emptySubText}>
                Create your first booking to start generating revenue.
              </p>
              {/* FIX: removed inline style={{ marginTop: "1.5rem" }} — use CSS class */}
              <button onClick={() => setIsAdding(true)} className={`${styles.buttonPrimary} ${styles.emptyAction}`}>
                <Plus size={16} /> Add Booking
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {initialBookings.map((b) => (
                <Link href={`/bookings/${b.booking_id}`} key={b.booking_id} className={styles.cardLink}>
                  <div className={styles.card}>
                    {/* FIX: card header was full inline style — now CSS classes */}
                    <div className={styles.cardTop}>
                      {/* FIX: was color:"#18181b" — dark text invisible on dark card */}
                      <h3 className={styles.cardAmount}>
                        {b.currency_code} {Number(b.amount).toLocaleString()}
                      </h3>
                      {/* FIX: replaced renderStatusBadge() inline function with reusable StatusBadge component */}
                      <StatusBadge status={b.booking_status} />
                    </div>

                    {/* FIX: platform/nights badges were hardcoded inline light styles — now MetaBadge component */}
                    <div className={styles.cardTags}>
                      {b.platform && (
                        <MetaBadge variant="indigo">{b.platform}</MetaBadge>
                      )}
                      {b.total_nights && (
                        <MetaBadge variant="green">{b.total_nights}N</MetaBadge>
                      )}
                    </div>

                    {/* FIX: was inline style color:"#71717a" — now CSS class */}
                    <div className={styles.cardMeta}>
                      <Building size={14} className={styles.cardMetaIcon} />
                      <span>{b.property_name || "Unknown Property"}</span>
                    </div>

                    <div className={styles.cardMeta}>
                      <User size={14} className={styles.cardMetaIcon} />
                      <span>{b.customer_name}</span>
                    </div>

                    {/* FIX: was inline style borderTop:"1px solid #f4f4f5" — light border on dark card */}
                    <div className={styles.cardFooter}>
                      <div>
                        <div className={styles.cardFooterRow}>In: {formatDate(b.start_date)}</div>
                        <div className={styles.cardFooterRow}>Out: {formatDate(b.end_date)}</div>
                      </div>
                      <div className={styles.cardFooterRight}>
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

"use server";

import { query, transaction } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Helper: expand segments into an array of calendar dates (inclusive) ──────
function expandDates(segments) {
  const dates = [];
  for (const seg of segments) {
    const cur = new Date(seg.start_date + "T00:00:00Z");
    const end = new Date(seg.end_date + "T00:00:00Z");
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return dates;
}

// ── Helper: insert daily transactions for a confirmed booking ─────────────────
async function postDailyTransactions(client, {
  bookingId, propertyAccountSrno, mainAccountSrno,
  currencyCode, dailyRate, dates, businessId, customerName
}) {
  for (const date of dates) {
    await client.query(
      `INSERT INTO transactions
         (currency_code, account_srno, primary_account_srno, amount, transaction_type,
          remarks, reference_id, trans_date, business_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        currencyCode, propertyAccountSrno, mainAccountSrno,
        dailyRate, "BookingDailyCharge",
        `Nightly charge — ${date} — ${customerName}`,
        bookingId, date, businessId
      ]
    );
  }
}

// ── Helper: reverse all daily transactions for a booking ──────────────────────
async function reverseDailyTransactions(client, {
  bookingId, propertyAccountSrno, mainAccountSrno,
  currencyCode, txType, businessId
}) {
  // Fetch all un-reversed daily charges for this booking
  const originals = await client.query(
    `SELECT trans_id, amount, trans_date FROM transactions
     WHERE reference_id = $1
       AND transaction_type = 'BookingDailyCharge'
       AND amount > 0`,
    [bookingId]
  );

  for (const orig of originals.rows) {
    await client.query(
      `INSERT INTO transactions
         (currency_code, account_srno, primary_account_srno, amount, transaction_type,
          remarks, reference_id, linked_transaction_id, trans_date, business_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        currencyCode, propertyAccountSrno, mainAccountSrno,
        -orig.amount, txType,
        `${txType} — reversal for ${orig.trans_date}`,
        bookingId, orig.trans_id, orig.trans_date, businessId
      ]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export async function createBooking(formData) {
  const session = await requireSession();

  // Customer details
  const name   = formData.get("name");
  const identificationNumber = formData.get("identificationNumber") || null;
  const phone  = formData.get("phone") || null;
  const email  = formData.get("email") || null;

  // Booking details
  const propertyId     = formData.get("propertyId");
  const currencyCode   = formData.get("currencyCode");
  const amountStr      = formData.get("amount");
  const bookingStatus  = formData.get("bookingStatus") || "Confirmed";
  const platform       = formData.get("platform") || "Offline";

  // Segments JSON: [{ start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD" }]
  let segments;
  try {
    segments = JSON.parse(formData.get("segments") || "[]");
  } catch {
    return { error: "Invalid date segments format." };
  }

  // Fall back to legacy single-segment (start_date / end_date fields)
  if (!segments.length) {
    const startDate = formData.get("startDate");
    const endDate   = formData.get("endDate");
    if (!startDate || !endDate) return { error: "At least one date segment is required." };
    segments = [{ start_date: startDate, end_date: endDate }];
  }

  if (!name || !propertyId || !currencyCode || !amountStr)
    return { error: "Please provide all required fields." };

  const totalAmount = parseFloat(amountStr);
  if (isNaN(totalAmount) || totalAmount <= 0)
    return { error: "Amount must be a positive number." };

  // Compute dates and daily rate
  const allDates   = expandDates(segments);
  const totalNights = allDates.length;
  if (totalNights === 0) return { error: "Segments produce zero days — check your dates." };

  const dailyRate  = Math.round((totalAmount / totalNights) * 100) / 100;

  // Overall envelope dates for display
  const envelopeStart = allDates[0];
  const envelopeEnd   = allDates[allDates.length - 1];

  try {
    const bookingId = await transaction(async (client) => {
      // 1. Find or create customer (scoped to business)
      let customerId;
      if (email || identificationNumber) {
        const custRes = await client.query(
          `SELECT customer_id FROM customers
           WHERE business_id = $1 AND (email = $2 OR identification_number = $3) LIMIT 1`,
          [session.businessId, email, identificationNumber]
        );
        if (custRes.rows.length > 0) customerId = custRes.rows[0].customer_id;
      }
      if (!customerId) {
        const insertCust = await client.query(
          `INSERT INTO customers (name, identification_number, phone, email, business_id)
           VALUES ($1,$2,$3,$4,$5) RETURNING customer_id`,
          [name, identificationNumber, phone, email, session.businessId]
        );
        customerId = insertCust.rows[0].customer_id;
      }

      // 2. Fetch accounts
      const propAccRes = await client.query(
        `SELECT srno FROM accounts WHERE property_id = $1 AND currency_code = $2 LIMIT 1`,
        [propertyId, currencyCode]
      );
      if (propAccRes.rows.length === 0)
        throw new Error(`Property has no ${currencyCode} account configured.`);
      const propertyAccountSrno = propAccRes.rows[0].srno;

      const mainAccRes = await client.query(
        `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1
         AND (business_id = $2 OR business_id IS NULL) LIMIT 1`,
        [currencyCode, session.businessId]
      );
      if (mainAccRes.rows.length === 0)
        throw new Error(`No Main account for ${currencyCode} found.`);
      const mainAccountSrno = mainAccRes.rows[0].srno;

      // 3. Create booking
      const bookingRes = await client.query(
        `INSERT INTO bookings
           (property_id, customer_id, currency_code, amount, start_date, end_date,
            booking_status, platform, business_id, daily_rate, total_nights)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING booking_id`,
        [propertyId, customerId, currencyCode, totalAmount,
         envelopeStart, envelopeEnd, bookingStatus, platform,
         session.businessId, dailyRate, totalNights]
      );
      const newBookingId = bookingRes.rows[0].booking_id;

      // 4. Insert booking segments
      for (const seg of segments) {
        await client.query(
          `INSERT INTO booking_segments (booking_id, start_date, end_date, business_id)
           VALUES ($1,$2,$3,$4)`,
          [newBookingId, seg.start_date, seg.end_date, session.businessId]
        );
      }

      // 5. If Confirmed: update account balances + post one tx per day
      if (bookingStatus === "Confirmed") {
        await client.query(
          `UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`,
          [totalAmount, propertyAccountSrno]
        );
        await client.query(
          `UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`,
          [totalAmount, mainAccountSrno]
        );

        await postDailyTransactions(client, {
          bookingId: newBookingId, propertyAccountSrno, mainAccountSrno,
          currencyCode, dailyRate, dates: allDates,
          businessId: session.businessId, customerName: name
        });
      }

      return newBookingId;
    });

    revalidatePath("/bookings");
    revalidatePath("/properties");
    return { success: true, bookingId };
  } catch (err) {
    console.error("Transaction Error:", err);
    return { error: err.message || "Failed to process booking transaction." };
  }
}

export async function getBookings() {
  try {
    const session = await requireSession();
    const res = await query(`
      SELECT b.*,
             p.property_name,
             c.name as customer_name,
             c.email as customer_email,
             c.phone as customer_phone
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.property_id
      LEFT JOIN customers c ON b.customer_id = c.customer_id
      WHERE b.business_id = $1
      ORDER BY b.created_at DESC
    `, [session.businessId]);
    return res.rows;
  } catch (err) {
    console.error("Error fetching bookings:", err);
    return [];
  }
}

export async function getBookingById(bookingId) {
  try {
    const session = await requireSession();
    const res = await query(`
      SELECT b.*,
             p.property_name, p.property_address, p.city, p.country,
             c.name as customer_name, c.identification_number as customer_id_num,
             c.email as customer_email, c.phone as customer_phone
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.property_id
      LEFT JOIN customers c ON b.customer_id = c.customer_id
      WHERE b.booking_id = $1 AND b.business_id = $2
    `, [bookingId, session.businessId]);
    return res.rows[0] || null;
  } catch (err) {
    console.error("Error fetching booking by ID:", err);
    return null;
  }
}

export async function getBookingSegments(bookingId) {
  try {
    const res = await query(
      `SELECT * FROM booking_segments WHERE booking_id = $1 ORDER BY start_date ASC`,
      [bookingId]
    );
    return res.rows;
  } catch (err) {
    console.error("Error fetching booking segments:", err);
    return [];
  }
}

export async function updateBookingStatus(bookingId, newStatus) {
  try {
    const session = await requireSession();
    await transaction(async (client) => {
      // 1. Fetch current booking
      const bRes = await client.query(
        `SELECT * FROM bookings WHERE booking_id = $1 AND business_id = $2 FOR UPDATE`,
        [bookingId, session.businessId]
      );
      if (bRes.rows.length === 0) throw new Error("Booking not found.");

      const booking    = bRes.rows[0];
      const oldStatus  = booking.booking_status;
      const amount     = Number(booking.amount);
      const dailyRate  = Number(booking.daily_rate) || amount;
      const currencyCode = booking.currency_code;
      const propertyId   = booking.property_id;

      if (oldStatus === "Cancelled")
        throw new Error("Cannot change status of a cancelled booking.");

      // 2. Update booking status
      await client.query(
        `UPDATE bookings SET booking_status = $1 WHERE booking_id = $2`,
        [newStatus, bookingId]
      );

      let action = null;
      if (oldStatus === "Pending"    && newStatus === "Confirmed") action = "ADD";
      if (oldStatus === "Confirmed"  && newStatus === "Pending")   action = "REVERSE";
      if (oldStatus === "Confirmed"  && newStatus === "Cancelled")  action = "REVERSE";

      if (!action) return;

      // 3. Fetch accounts
      const propAccRes = await client.query(
        `SELECT srno FROM accounts WHERE property_id = $1 AND currency_code = $2 LIMIT 1`,
        [propertyId, currencyCode]
      );
      const mainAccRes = await client.query(
        `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1
         AND (business_id = $2 OR business_id IS NULL) LIMIT 1`,
        [currencyCode, session.businessId]
      );
      const propertyAccountSrno = propAccRes.rows[0]?.srno;
      const mainAccountSrno     = mainAccRes.rows[0]?.srno;
      if (!propertyAccountSrno || !mainAccountSrno)
        throw new Error("Could not locate accounts for this booking.");

      if (action === "ADD") {
        // Pending → Confirmed: generate daily transactions from segments
        const segRes = await client.query(
          `SELECT start_date, end_date FROM booking_segments WHERE booking_id = $1 ORDER BY start_date`,
          [bookingId]
        );
        const segs = segRes.rows.map(r => ({
          start_date: r.start_date.toISOString().slice(0, 10),
          end_date: r.end_date.toISOString().slice(0, 10)
        }));
        const allDates = expandDates(segs);
        const totalAmount = allDates.length * dailyRate;

        await client.query(
          `UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`,
          [totalAmount, propertyAccountSrno]
        );
        await client.query(
          `UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`,
          [totalAmount, mainAccountSrno]
        );
        await postDailyTransactions(client, {
          bookingId, propertyAccountSrno, mainAccountSrno,
          currencyCode, dailyRate, dates: allDates,
          businessId: session.businessId, customerName: booking.customer_name || "Guest"
        });

      } else if (action === "REVERSE") {
        // Sum of all un-reversed daily charges
        const sumRes = await client.query(
          `SELECT COALESCE(SUM(amount),0) as total FROM transactions
           WHERE reference_id = $1 AND transaction_type = 'BookingDailyCharge' AND amount > 0`,
          [bookingId]
        );
        const totalToReverse = Number(sumRes.rows[0].total);

        await client.query(
          `UPDATE accounts SET income = income - $1, profit = profit - $1 WHERE srno = $2`,
          [totalToReverse, propertyAccountSrno]
        );
        await client.query(
          `UPDATE accounts SET income = income - $1, profit = profit - $1 WHERE srno = $2`,
          [totalToReverse, mainAccountSrno]
        );

        const txType = newStatus === "Cancelled" ? "BookingCancellation" : "BookingPendingReversal";
        await reverseDailyTransactions(client, {
          bookingId, propertyAccountSrno, mainAccountSrno,
          currencyCode, txType, businessId: session.businessId
        });
      }
    });

    revalidatePath("/bookings");
    revalidatePath("/properties");
    revalidatePath(`/bookings/${bookingId}`);
    return { success: true };
  } catch (err) {
    console.error("Error updating booking status:", err);
    return { error: err.message || "Failed to update status." };
  }
}

// Legacy wrapper — forwards to updateBookingSegments
export async function updateBookingDates(bookingId, startDate, endDate) {
  return updateBookingSegments(bookingId, [{ start_date: startDate, end_date: endDate }]);
}

// Full segment replacement — works for Pending AND Confirmed bookings.
// For Confirmed: reverses all existing daily transactions, then re-posts from new segments.
export async function updateBookingSegments(bookingId, segments) {
  try {
    const session = await requireSession();

    await transaction(async (client) => {
      // 1. Lock booking row
      const bRes = await client.query(
        `SELECT * FROM bookings WHERE booking_id = $1 AND business_id = $2 FOR UPDATE`,
        [bookingId, session.businessId]
      );
      if (bRes.rows.length === 0) throw new Error("Booking not found.");
      const booking = bRes.rows[0];
      if (booking.booking_status === "Cancelled")
        throw new Error("Cannot modify a cancelled booking.");

      // 2. Expand dates & compute new rate
      const allDates    = expandDates(segments);
      const totalNights = allDates.length;
      if (totalNights === 0) throw new Error("Segments produce zero nights — check your dates.");

      const totalAmount   = Number(booking.amount);
      const dailyRate     = Math.round((totalAmount / totalNights) * 100) / 100;
      const envelopeStart = allDates[0];
      const envelopeEnd   = allDates[allDates.length - 1];

      // 3. If Confirmed: reverse existing ledger, rebuild from new segments
      if (booking.booking_status === "Confirmed") {
        const propAccRes = await client.query(
          `SELECT srno FROM accounts WHERE property_id = $1 AND currency_code = $2 LIMIT 1`,
          [booking.property_id, booking.currency_code]
        );
        const mainAccRes = await client.query(
          `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1
           AND (business_id = $2 OR business_id IS NULL) LIMIT 1`,
          [booking.currency_code, session.businessId]
        );
        const propertyAccountSrno = propAccRes.rows[0]?.srno;
        const mainAccountSrno     = mainAccRes.rows[0]?.srno;
        if (!propertyAccountSrno || !mainAccountSrno)
          throw new Error("Could not locate accounts for this booking.");

        // Sum all existing daily charge transactions
        const sumRes = await client.query(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
           WHERE reference_id = $1 AND transaction_type = 'BookingDailyCharge' AND amount > 0`,
          [bookingId]
        );
        const oldTotal = Number(sumRes.rows[0].total);

        // Deduct old totals from balances
        if (oldTotal > 0) {
          await client.query(
            `UPDATE accounts SET income = income - $1, profit = profit - $1 WHERE srno = $2`,
            [oldTotal, propertyAccountSrno]
          );
          await client.query(
            `UPDATE accounts SET income = income - $1, profit = profit - $1 WHERE srno = $2`,
            [oldTotal, mainAccountSrno]
          );
        }

        // Wipe all transactions for this booking (charges + any prior reversals)
        await client.query(
          `DELETE FROM transactions WHERE reference_id = $1`, [bookingId]
        );

        // Add new totals to balances
        await client.query(
          `UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`,
          [totalAmount, propertyAccountSrno]
        );
        await client.query(
          `UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`,
          [totalAmount, mainAccountSrno]
        );

        // Post one transaction per new day
        await postDailyTransactions(client, {
          bookingId, propertyAccountSrno, mainAccountSrno,
          currencyCode: booking.currency_code, dailyRate,
          dates: allDates, businessId: session.businessId,
          customerName: "Guest"
        });
      }

      // 4. Replace booking_segments rows
      await client.query(`DELETE FROM booking_segments WHERE booking_id = $1`, [bookingId]);
      for (const seg of segments) {
        await client.query(
          `INSERT INTO booking_segments (booking_id, start_date, end_date, business_id)
           VALUES ($1,$2,$3,$4)`,
          [bookingId, seg.start_date, seg.end_date, session.businessId]
        );
      }

      // 5. Update booking envelope dates + rate columns
      await client.query(
        `UPDATE bookings
         SET start_date = $1, end_date = $2, daily_rate = $3, total_nights = $4
         WHERE booking_id = $5`,
        [envelopeStart, envelopeEnd, dailyRate, totalNights, bookingId]
      );
    });

    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    return { success: true };
  } catch (err) {
    console.error("Error updating booking segments:", err);
    return { error: err.message || "Failed to update booking dates." };
  }
}


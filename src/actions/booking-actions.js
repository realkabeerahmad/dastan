"use server";

import { query, transaction } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createBooking(formData) {
  // Customer details
  const name = formData.get("name");
  const identificationNumber = formData.get("identificationNumber") || null;
  const phone = formData.get("phone") || null;
  const email = formData.get("email") || null;

  // Booking details
  const propertyId = formData.get("propertyId");
  const currencyCode = formData.get("currencyCode");
  const amountStr = formData.get("amount");
  const startDate = formData.get("startDate"); // Expecting date string
  const endDate = formData.get("endDate");     // Expecting date string
  const bookingStatus = formData.get("bookingStatus") || "Confirmed";
  const platform = formData.get("platform") || "Offline";

  // Validate
  if (!name || !propertyId || !currencyCode || !amountStr || !startDate || !endDate) {
    return { error: "Please provide all required customer and booking details." };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }

  try {
    const bookingId = await transaction(async (client) => {
      // 1. Find or create customer
      let customerId;
      // We will blindly try to match by email or identification_number
      if (email || identificationNumber) {
        const custRes = await client.query(
          `SELECT customer_id FROM customers WHERE email = $1 OR identification_number = $2 LIMIT 1`,
          [email, identificationNumber]
        );
        if (custRes.rows.length > 0) {
          customerId = custRes.rows[0].customer_id;
        }
      }

      if (!customerId) {
        // Create new customer
        const insertCust = await client.query(
          `INSERT INTO customers (name, identification_number, phone, email)
           VALUES ($1, $2, $3, $4) RETURNING customer_id`,
          [name, identificationNumber, phone, email]
        );
        customerId = insertCust.rows[0].customer_id;
      }

      // 2. Fetch the Property Account for the given currency
      const propAccRes = await client.query(
        `SELECT srno FROM accounts WHERE property_id = $1 AND currency_code = $2 LIMIT 1`,
        [propertyId, currencyCode]
      );

      if (propAccRes.rows.length === 0) {
        throw new Error(`The selected property does not have a ${currencyCode} account configured.`);
      }
      const propertyAccountSrno = propAccRes.rows[0].srno;

      // 3. Fetch the Main Primary Account for the given currency
      const mainAccRes = await client.query(
        `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1 LIMIT 1`,
        [currencyCode]
      );

      if (mainAccRes.rows.length === 0) {
        throw new Error(`The system does not have a Main Primary account configured for ${currencyCode}.`);
      }
      const mainAccountSrno = mainAccRes.rows[0].srno;

      // 4. Create the Booking
      const bookingRes = await client.query(
        `INSERT INTO bookings (property_id, customer_id, currency_code, amount, start_date, end_date, booking_status, platform)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING booking_id`,
        [propertyId, customerId, currencyCode, amount, startDate, endDate, bookingStatus, platform]
      );
      const newBookingId = bookingRes.rows[0].booking_id;

      // 5. Financial Logic: Only apply if confirmed immediately
      if (bookingStatus === "Confirmed") {
        // Update Property Account (Add Income & Profit)
        await client.query(
          `UPDATE accounts 
           SET income = income + $1, profit = profit + $1 
           WHERE srno = $2`,
          [amount, propertyAccountSrno]
        );

        // Update Primary Main Account (Add Income & Profit)
        await client.query(
          `UPDATE accounts 
           SET income = income + $1, profit = profit + $1 
           WHERE srno = $2`,
          [amount, mainAccountSrno]
        );

        // Insert Transaction linking both accounts
        await client.query(
          `INSERT INTO transactions (currency_code, account_srno, primary_account_srno, amount, transaction_type, remarks, reference_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            currencyCode, 
            propertyAccountSrno, 
            mainAccountSrno, 
            amount, 
            "BookingIncome", 
            `Booking ${newBookingId} by ${name}`,
            newBookingId
          ]
        );
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
    const res = await query(`
      SELECT b.*,
             p.property_name,
             c.name as customer_name,
             c.email as customer_email,
             c.phone as customer_phone
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.property_id
      LEFT JOIN customers c ON b.customer_id = c.customer_id
      ORDER BY b.created_at DESC
    `);
    return res.rows;
  } catch (err) {
    console.error("Error fetching bookings:", err);
    return [];
  }
}

export async function getBookingById(bookingId) {
  try {
    const res = await query(`
      SELECT b.*,
             p.property_name, p.property_address, p.city, p.country,
             c.name as customer_name, c.identification_number as customer_id_num,
             c.email as customer_email, c.phone as customer_phone
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.property_id
      LEFT JOIN customers c ON b.customer_id = c.customer_id
      WHERE b.booking_id = $1
    `, [bookingId]);
    return res.rows[0] || null;
  } catch (err) {
    console.error("Error fetching booking by ID:", err);
    return null;
  }
}

export async function updateBookingStatus(bookingId, newStatus) {
  try {
    await transaction(async (client) => {
      // 1. Fetch current booking to check status and amounts
      const bRes = await client.query(`SELECT * FROM bookings WHERE booking_id = $1 FOR UPDATE`, [bookingId]);
      if (bRes.rows.length === 0) throw new Error("Booking not found.");
      
      const booking = bRes.rows[0];
      const oldStatus = booking.booking_status;

      // 2. Prevent un-cancelling
      if (oldStatus === "Cancelled") {
        throw new Error("Cannot change status of a cancelled booking. Actions are permanently reversed.");
      }

      // 3. Update the booking status
      await client.query(`UPDATE bookings SET booking_status = $1 WHERE booking_id = $2`, [newStatus, bookingId]);

      // 4. Financial Logic Engine for Transitions
      const amount = booking.amount;
      const currencyCode = booking.currency_code;
      const propertyId = booking.property_id;

      let action = null; // 'ADD', 'REVERSE', or null

      if (oldStatus === "Pending" && newStatus === "Confirmed") action = "ADD";
      if (oldStatus === "Confirmed" && newStatus === "Pending") action = "REVERSE";
      if (oldStatus === "Confirmed" && newStatus === "Cancelled") action = "REVERSE";
      // Note: Pending -> Cancelled does NOT need reversal because funds were never added.

      if (action) {
        // Fetch Property Account
        const propAccRes = await client.query(
          `SELECT srno FROM accounts WHERE property_id = $1 AND currency_code = $2 LIMIT 1`,
          [propertyId, currencyCode]
        );
        const propertyAccountSrno = propAccRes.rows[0]?.srno;

        // Fetch Main Account
        const mainAccRes = await client.query(
          `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1 LIMIT 1`,
          [currencyCode]
        );
        const mainAccountSrno = mainAccRes.rows[0]?.srno;

        if (propertyAccountSrno && mainAccountSrno) {
          if (action === "ADD") {
            // Apply Income & Profit
            await client.query(`UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`, [amount, propertyAccountSrno]);
            await client.query(`UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`, [amount, mainAccountSrno]);
            await client.query(`INSERT INTO transactions (currency_code, account_srno, primary_account_srno, amount, transaction_type, remarks, reference_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`, 
              [currencyCode, propertyAccountSrno, mainAccountSrno, amount, "BookingIncome", `Booking ${bookingId} Revenue`, bookingId]
            );
          } else if (action === "REVERSE") {
            // Deduct Income & Profit
            await client.query(`UPDATE accounts SET income = income - $1, profit = profit - $1 WHERE srno = $2`, [amount, propertyAccountSrno]);
            await client.query(`UPDATE accounts SET income = income - $1, profit = profit - $1 WHERE srno = $2`, [amount, mainAccountSrno]);
            
            const txType = newStatus === "Cancelled" ? "BookingCancellation" : "BookingPendingReversal";
            
            // Link back to original BookingIncome natively
            const linkRes = await client.query(`SELECT transaction_id FROM transactions WHERE reference_id = $1 AND transaction_type = 'BookingIncome' ORDER BY transaction_id DESC LIMIT 1`, [bookingId]);
            const linkedTxId = linkRes.rows.length > 0 ? linkRes.rows[0].transaction_id : null;

            await client.query(`INSERT INTO transactions (currency_code, account_srno, primary_account_srno, amount, transaction_type, remarks, reference_id, linked_transaction_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
              [currencyCode, propertyAccountSrno, mainAccountSrno, -amount, txType, `${txType} for Booking ${bookingId}`, bookingId, linkedTxId]
            );
          }
        }
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

export async function updateBookingDates(bookingId, startDate, endDate) {
  try {
    const res = await query(
      `UPDATE bookings SET start_date = $1, end_date = $2 WHERE booking_id = $3 AND booking_status = 'Pending' RETURNING booking_id`, 
      [startDate, endDate, bookingId]
    );
    if (res.rowCount === 0) throw new Error("Could not update dates. Booking must be Pending to change dates natively.");
    
    revalidatePath("/bookings");
    revalidatePath(`/bookings/${bookingId}`);
    return { success: true };
  } catch (err) {
    console.error("Error updating dates:", err);
    return { error: "Failed to update dates." };
  }
}

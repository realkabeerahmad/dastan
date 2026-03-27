/**
 * Retroactive Split Migration
 * Splits existing lump-sum BookingIncome transactions into per-day BookingDailyCharge
 * transactions so the transaction table is the sole source of truth for night-level analytics.
 *
 * Safe to run multiple times — skips bookings that already have daily transactions.
 *
 * Usage:
 *   node scripts/split-existing-bookings.js
 */

const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function expandDates(startDate, endDate) {
  const dates = [];
  const cur = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

async function main() {
  const client = await pool.connect();
  let migrated = 0, skipped = 0;

  try {
    // Get all Confirmed bookings with a lump-sum BookingIncome transaction
    const bookings = await client.query(`
      SELECT b.booking_id, b.amount, b.currency_code, b.property_id,
             b.start_date, b.end_date, b.daily_rate, b.total_nights,
             b.business_id,
             c.name as customer_name,
             t.trans_id as lump_trans_id,
             t.account_srno as property_account_srno,
             t.primary_account_srno as main_account_srno
      FROM bookings b
      JOIN customers c ON b.customer_id = c.customer_id
      JOIN transactions t ON t.reference_id = b.booking_id
                         AND t.transaction_type = 'BookingIncome'
                         AND t.amount > 0
      WHERE b.booking_status = 'Confirmed'
    `);

    console.log(`Found ${bookings.rows.length} confirmed bookings with lump-sum transactions.`);

    for (const b of bookings.rows) {
      await client.query("BEGIN");
      try {
        // Check if already split
        const already = await client.query(
          `SELECT COUNT(*) as cnt FROM transactions
           WHERE reference_id = $1 AND transaction_type = 'BookingDailyCharge' AND amount > 0`,
          [b.booking_id]
        );
        if (Number(already.rows[0].cnt) > 0) {
          console.log(`  SKIP ${b.booking_id} — already has daily transactions.`);
          skipped++;
          await client.query("ROLLBACK");
          continue;
        }

        // Build segments: use booking_segments if they exist, else fall back to start/end
        let segRows = await client.query(
          `SELECT start_date::text, end_date::text FROM booking_segments WHERE booking_id = $1 ORDER BY start_date`,
          [b.booking_id]
        );

        let allDates;
        if (segRows.rows.length > 0) {
          allDates = [];
          for (const seg of segRows.rows) {
            allDates.push(...expandDates(seg.start_date, seg.end_date));
          }
        } else {
          // Backfill booking_segments from start/end
          const sd = b.start_date.toISOString().slice(0, 10);
          const ed = b.end_date.toISOString().slice(0, 10);
          allDates = expandDates(sd, ed);
          await client.query(
            `INSERT INTO booking_segments (booking_id, start_date, end_date, business_id) VALUES ($1,$2,$3,$4)`,
            [b.booking_id, sd, ed, b.business_id]
          );
        }

        const totalNights = allDates.length;
        const totalAmount = Number(b.amount);
        const dailyRate   = Math.round((totalAmount / totalNights) * 100) / 100;

        // Update booking with daily_rate and total_nights if missing
        await client.query(
          `UPDATE bookings SET daily_rate = $1, total_nights = $2 WHERE booking_id = $3`,
          [dailyRate, totalNights, b.booking_id]
        );

        // Delete the lump-sum transaction
        await client.query(
          `DELETE FROM transactions WHERE trans_id = $1`,
          [b.lump_trans_id]
        );

        // Insert one transaction per day
        for (const date of allDates) {
          await client.query(
            `INSERT INTO transactions
               (currency_code, account_srno, primary_account_srno, amount, transaction_type,
                remarks, reference_id, trans_date, business_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              b.currency_code,
              b.property_account_srno,
              b.main_account_srno,
              dailyRate,
              "BookingDailyCharge",
              `Nightly charge — ${date} — ${b.customer_name}`,
              b.booking_id,
              date,
              b.business_id
            ]
          );
        }

        await client.query("COMMIT");
        console.log(`  ✓ ${b.booking_id}: split into ${totalNights} daily charges @ ${dailyRate} ${b.currency_code}/night`);
        migrated++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  ✗ ${b.booking_id}: ${err.message}`);
      }
    }

    console.log(`\nDone. Migrated: ${migrated}  Skipped: ${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

/**
 * Seed Migration Script
 * Run ONCE after applying multitenant_migration.sql to backfill existing data
 * to a default business + admin user.
 *
 * Usage:
 *   node scripts/seed-business.js
 */

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check if a business already exists — skip if so
    const existing = await client.query("SELECT business_id FROM businesses LIMIT 1");
    if (existing.rows.length > 0) {
      console.log("✓ A business already exists. Skipping seed.");
      await client.query("ROLLBACK");
      return;
    }

    // 2. Create default business
    const bizRes = await client.query(
      `INSERT INTO businesses (name) VALUES ($1) RETURNING business_id`,
      ["Default Business"]
    );
    const businessId = bizRes.rows[0].business_id;
    console.log(`✓ Created business: Default Business (${businessId})`);

    // 3. Create admin user
    const adminEmail    = process.env.SEED_ADMIN_EMAIL    || "admin@dastan.local";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin1234";
    const adminName     = process.env.SEED_ADMIN_NAME     || "Admin";
    const passwordHash  = await bcrypt.hash(adminPassword, 12);

    await client.query(
      `INSERT INTO users (business_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')`,
      [businessId, adminName, adminEmail, passwordHash]
    );
    console.log(`✓ Created admin user: ${adminEmail} / password: ${adminPassword}`);

    // 4. Backfill all existing data rows to the new business
    const tables = ["properties", "accounts", "customers", "bookings", "transactions", "account_summary", "scheduler_config"];
    for (const table of tables) {
      const res = await client.query(
        `UPDATE ${table} SET business_id = $1 WHERE business_id IS NULL`,
        [businessId]
      );
      console.log(`✓ Backfilled ${res.rowCount} rows in ${table}`);
    }

    await client.query("COMMIT");
    console.log("\n✅ Seed complete! Login with:");
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("\n⚠️  Change the admin password after first login!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

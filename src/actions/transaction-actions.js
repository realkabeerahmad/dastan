"use server";

import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function getTransactions() {
  try {
    const session = await requireSession();
    const res = await query(`
      SELECT t.*, 
             a.account_type,
             p.property_name 
      FROM transactions t
      LEFT JOIN accounts a ON t.account_srno = a.srno
      LEFT JOIN properties p ON a.property_id = p.property_id
      WHERE t.business_id = $1
      ORDER BY t.trans_date DESC, t.created_at DESC
      LIMIT 1000
    `, [session.businessId]);
    return res.rows;
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return [];
  }
}

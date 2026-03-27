"use server";

import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getCustomers() {
  try {
    const session = await requireSession();
    const res = await query(`
      SELECT c.*, 
             COUNT(b.booking_id) as total_bookings, 
             SUM(CASE WHEN b.booking_status = 'Confirmed' THEN b.amount ELSE 0 END) as total_spent
      FROM customers c
      LEFT JOIN bookings b ON c.customer_id = b.customer_id
      WHERE c.business_id = $1
      GROUP BY c.customer_id
      ORDER BY c.created_at DESC
    `, [session.businessId]);
    return res.rows;
  } catch (err) {
    console.error("Error fetching customers:", err);
    return [];
  }
}

export async function updateCustomer(customerId, formData) {
  try {
    const session = await requireSession();
    const name = formData.get("name");
    const identificationNumber = formData.get("identificationNumber");
    const phone = formData.get("phone");
    const email = formData.get("email");

    if (!name) return { error: "Customer name is strictly required." };

    await query(
      `UPDATE customers SET name=$1, identification_number=$2, phone=$3, email=$4 WHERE customer_id=$5 AND business_id=$6`,
      [name, identificationNumber, phone, email, customerId, session.businessId]
    );

    revalidatePath("/customers");
    revalidatePath("/bookings");
    return { success: true };
  } catch (err) {
    console.error("Error updating customer:", err);
    return { error: "Failed to securely update customer PII details." };
  }
}

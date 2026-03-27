"use server";

import { query, transaction } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createProperty(formData) {
  const session = await requireSession();
  const propertyName = formData.get("propertyName");
  const propertyAddress = formData.get("propertyAddress");
  const city = formData.get("city");
  const state = formData.get("state");
  const country = formData.get("country");
  const propertyType = formData.get("propertyType");
  const propertyStatus = formData.get("propertyStatus");
  
  if (!propertyName || !propertyAddress || !city || !state || !country)
    return { error: "Please fill out all required fields." };

  try {
    const propertyId = await transaction(async (client) => {
      const propertyRes = await client.query(
        `INSERT INTO properties (property_name, property_address, city, state, country, property_type, property_status, business_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING property_id`,
        [propertyName, propertyAddress, city, state, country, propertyType || null, propertyStatus || null, session.businessId]
      );
      const newPropertyId = propertyRes.rows[0].property_id;

      await client.query(
        `INSERT INTO accounts (currency_code, account_type, property_id, business_id) VALUES ($1, $2, $3, $4)`,
        ["USD", "Property", newPropertyId, session.businessId]
      );
      await client.query(
        `INSERT INTO accounts (currency_code, account_type, property_id, business_id) VALUES ($1, $2, $3, $4)`,
        ["PKR", "Property", newPropertyId, session.businessId]
      );
      return newPropertyId;
    });
    revalidatePath("/properties");
    return { success: true, propertyId };
  } catch (err) {
    console.error("Error creating property:", err);
    return { error: "Failed to create property. Please try again." };
  }
}

export async function getProperties() {
  try {
    const session = await requireSession();
    const res = await query(
      `SELECT p.*, 
              pt.property_type_name, 
              ps.property_status_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'currency_code', a.currency_code,
                    'income', a.income,
                    'expense', a.expense,
                    'profit', a.profit
                  )
                ) FILTER (WHERE a.srno IS NOT NULL), '[]'
              ) as accounts
       FROM properties p
       LEFT JOIN property_types pt ON p.property_type = pt.property_type_id
       LEFT JOIN property_statuses ps ON p.property_status = ps.property_status_id
       LEFT JOIN accounts a ON a.property_id = p.property_id
       WHERE p.business_id = $1
       GROUP BY p.property_id, pt.property_type_name, ps.property_status_name
       ORDER BY p.created_at DESC`,
      [session.businessId]
    );
    return res.rows;
  } catch (err) {
    console.error("Error fetching properties:", err);
    return [];
  }
}

export async function updateProperty(propertyId, formData) {
  const session = await requireSession();
  const propertyName = formData.get("propertyName");
  const propertyAddress = formData.get("propertyAddress");
  const city = formData.get("city");
  const state = formData.get("state");
  const country = formData.get("country");
  const propertyType = formData.get("propertyType");
  const propertyStatus = formData.get("propertyStatus");
  
  if (!propertyId || !propertyName || !propertyAddress || !city || !state || !country)
    return { error: "Please fill out all required fields." };

  try {
    await query(
      `UPDATE properties 
       SET property_name=$1, property_address=$2, city=$3, state=$4, country=$5, property_type=$6, property_status=$7
       WHERE property_id=$8 AND business_id=$9`,
      [propertyName, propertyAddress, city, state, country, propertyType || null, propertyStatus || null, propertyId, session.businessId]
    );
    revalidatePath("/properties");
    return { success: true };
  } catch (err) {
    console.error("Error updating property:", err);
    return { error: "Failed to update property. Please try again." };
  }
}

export async function getPropertyTypes() {
  try {
    const res = await query(`SELECT property_type_id as id, property_type_name as name FROM property_types WHERE active = true ORDER BY name ASC`);
    return res.rows;
  } catch (err) {
    console.error("Error fetching property types:", err);
    return [];
  }
}

export async function getPropertyStatuses() {
  try {
    const res = await query(`SELECT property_status_id as id, property_status_name as name FROM property_statuses WHERE active = true ORDER BY name ASC`);
    return res.rows;
  } catch (err) {
    console.error("Error fetching property statuses:", err);
    return [];
  }
}

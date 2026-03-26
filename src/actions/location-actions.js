"use server";

import { query } from "@/lib/db";

export async function getCountries() {
  try {
    const res = await query(`SELECT srno as id, name FROM countries ORDER BY name ASC`);
    return res.rows;
  } catch (err) {
    console.error("Error fetching countries:", err);
    return [];
  }
}

export async function getStates(countryId) {
  if (!countryId) return [];
  try {
    const res = await query(
      `SELECT srno as id, name FROM states WHERE country_srno = $1 ORDER BY name ASC`,
      [countryId]
    );
    return res.rows;
  } catch (err) {
    console.error("Error fetching states:", err);
    return [];
  }
}

export async function getCities(stateId) {
  if (!stateId) return [];
  try {
    const res = await query(
      `SELECT srno as id, name FROM cities WHERE state_srno = $1 ORDER BY name ASC`,
      [stateId]
    );
    return res.rows;
  } catch (err) {
    console.error("Error fetching cities:", err);
    return [];
  }
}

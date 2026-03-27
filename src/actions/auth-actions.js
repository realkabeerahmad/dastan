"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { setSessionCookie, clearSessionCookie, requireSession } from "@/lib/auth";

export async function registerBusiness(formData) {
  const businessName = formData.get("businessName")?.trim();
  const name = formData.get("name")?.trim();
  const email = formData.get("email")?.trim().toLowerCase();
  const password = formData.get("password");
  const confirm = formData.get("confirmPassword");

  if (!businessName || !name || !email || !password)
    return { error: "All fields are required." };
  if (password !== confirm)
    return { error: "Passwords do not match." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  try {
    // Check if email already taken
    const existing = await query(`SELECT user_id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) return { error: "An account with that email already exists." };

    // Create business
    const bizRes = await query(
      `INSERT INTO businesses (name) VALUES ($1) RETURNING business_id`,
      [businessName]
    );
    const businessId = bizRes.rows[0].business_id;

    // Hash password and create admin user
    const passwordHash = await bcrypt.hash(password, 12);
    const userRes = await query(
      `INSERT INTO users (business_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin') RETURNING user_id, name, email, role`,
      [businessId, name, email, passwordHash]
    );
    const user = userRes.rows[0];

    await setSessionCookie({
      businessId,
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessName,
    });
  } catch (err) {
    console.error("Register error:", err);
    return { error: "Registration failed. Please try again." };
  }

  redirect("/");
}

export async function loginUser(formData) {
  const email = formData.get("email")?.trim().toLowerCase();
  const password = formData.get("password");

  if (!email || !password) return { error: "Email and password are required." };

  try {
    const res = await query(
      `SELECT u.*, b.name as business_name 
       FROM users u JOIN businesses b ON u.business_id = b.business_id
       WHERE u.email = $1`,
      [email]
    );

    if (res.rows.length === 0) return { error: "Invalid email or password." };
    const user = res.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return { error: "Invalid email or password." };

    await setSessionCookie({
      businessId: user.business_id,
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessName: user.business_name,
    });
  } catch (err) {
    console.error("Login error:", err);
    return { error: "Login failed. Please try again." };
  }

  redirect("/");
}

export async function logoutUser() {
  await clearSessionCookie();
  redirect("/login");
}

export async function getBusinessUsers() {
  const session = await requireSession();
  const res = await query(
    `SELECT user_id, name, email, role, created_at FROM users WHERE business_id = $1 ORDER BY created_at ASC`,
    [session.businessId]
  );
  return res.rows;
}

export async function createUser(formData) {
  const session = await requireSession();
  if (session.role !== "admin") return { error: "Admin access required." };

  const name = formData.get("name")?.trim();
  const email = formData.get("email")?.trim().toLowerCase();
  const password = formData.get("password");
  const role = formData.get("role") || "member";

  if (!name || !email || !password) return { error: "All fields are required." };

  try {
    const existing = await query(`SELECT user_id FROM users WHERE email = $1`, [email]);
    if (existing.rows.length > 0) return { error: "A user with that email already exists." };

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `INSERT INTO users (business_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
      [session.businessId, name, email, passwordHash, role]
    );
    return { success: true };
  } catch (err) {
    console.error("Create user error:", err);
    return { error: "Failed to create user." };
  }
}

export async function deleteUser(userId) {
  const session = await requireSession();
  if (session.role !== "admin") return { error: "Admin access required." };
  if (userId === session.userId) return { error: "You cannot delete your own account." };

  try {
    await query(
      `DELETE FROM users WHERE user_id = $1 AND business_id = $2`,
      [userId, session.businessId]
    );
    return { success: true };
  } catch (err) {
    console.error("Delete user error:", err);
    return { error: "Failed to delete user." };
  }
}

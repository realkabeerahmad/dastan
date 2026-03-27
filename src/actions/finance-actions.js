"use server";

import { query, transaction } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Fetches all properties for the Expense dropdown
export async function getPropertiesForFinance() {
  try {
    const session = await requireSession();
    const res = await query(
      `SELECT property_id, property_name FROM properties WHERE business_id = $1 ORDER BY property_name ASC`,
      [session.businessId]
    );
    return res.rows;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Fetches all valid Accounts for Withdrawal dropdown
export async function getAllAccounts() {
  try {
    const session = await requireSession();
    const res = await query(`
      SELECT a.srno, a.currency_code, a.account_type, a.income, a.profit, a.expense,
             p.property_name 
      FROM accounts a
      LEFT JOIN properties p ON a.property_id = p.property_id
      WHERE a.business_id = $1
      ORDER BY a.account_type ASC, a.currency_code ASC
    `, [session.businessId]);
    return res.rows.map(acc => {
      const label = acc.account_type === 'Main' 
        ? `[Main] Global ${acc.currency_code} Ledger`
        : `[Property] ${acc.property_name} (${acc.currency_code})`;
      return { id: acc.srno, name: label, currencyCode: acc.currency_code, balance: Number(acc.profit) };
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function postExpense(formData) {
  try {
    const session = await requireSession();
    const { propertyId, amount, currencyCode, details, date } = formData;
    const numAmount = Number(amount);

    await transaction(async (client) => {
      // 1. Fetch Property Account
      const propAccRes = await client.query(
        `SELECT srno FROM accounts WHERE property_id = $1 AND currency_code = $2 LIMIT 1`,
        [propertyId, currencyCode]
      );
      if (propAccRes.rows.length === 0) throw new Error(`Property Account (${currencyCode}) not found.`);
      const propertyAccountSrno = propAccRes.rows[0].srno;

      // 2. Fetch Main Account (business-scoped)
      const mainAccRes = await client.query(
        `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1 AND business_id = $2 LIMIT 1`,
        [currencyCode, session.businessId]
      );
      if (mainAccRes.rows.length === 0) throw new Error(`Global Main Account (${currencyCode}) not found.`);
      const mainAccountSrno = mainAccRes.rows[0].srno;

      // 3. Deduct from Property Profit, Add to Expense
      await client.query(
        `UPDATE accounts SET profit = profit - $1, expense = expense + $1 WHERE srno = $2`,
        [numAmount, propertyAccountSrno]
      );

      // 4. Deduct from Main Profit, Add to Expense
      await client.query(
        `UPDATE accounts SET profit = profit - $1, expense = expense + $1 WHERE srno = $2`,
        [numAmount, mainAccountSrno]
      );

      // 5. Insert Expense Transaction with the form-supplied date
      await client.query(
        `INSERT INTO transactions
           (currency_code, account_srno, primary_account_srno, amount, transaction_type, remarks, trans_date, business_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [currencyCode, propertyAccountSrno, mainAccountSrno, -numAmount, "Expense", details, date, session.businessId]
      );
    });

    revalidatePath("/finance");
    revalidatePath("/properties");
    return { success: true };
  } catch (error) {
    console.error("Expense error:", error);
    return { error: error.message };
  }
}

// Logic: Modifying an account modifies IT, and IF it's a Property, modifies its parent Main Account too.
async function safelyModifyAccount(client, accountSrno, amountToModify, businessId) {
  const accRes = await client.query(`SELECT account_type, currency_code FROM accounts WHERE srno = $1`, [accountSrno]);
  if (!accRes.rows.length) throw new Error("Target Account not found.");
  const acc = accRes.rows[0];
  let mainAccountSrno = null;

  // Modify the specific account directly (Income & Profit)
  await client.query(`UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`, [amountToModify, accountSrno]);

  // If this was a localized Property Account, ripple the effect natively to its parent Main ledger
  const mainAccRes = await client.query(
    `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1 AND business_id = $2 LIMIT 1`,
    [acc.currency_code, businessId]
  );
  if (mainAccRes.rows.length > 0) {
    mainAccountSrno = mainAccRes.rows[0].srno;
    if (acc.account_type === 'Property') {
      await client.query(`UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`, [amountToModify, mainAccountSrno]);
    }
  }
  return { currencyCode: acc.currency_code, mainAccountSrno };
}

export async function postWithdrawal(formData) {
  try {
    const session = await requireSession();
    const { fromAccountSrno, toAccountSrno, amount, exchangeRate, date, details } = formData;
    const debitAmount = Number(amount);
    const rate = Number(exchangeRate);
    const creditAmount = debitAmount * rate;

    if (fromAccountSrno === toAccountSrno) throw new Error("Cannot transfer to the same account.");

    await transaction(async (client) => {
      // 1. Debit the Origin Ledger (Negative Addition)
      const fromResult = await safelyModifyAccount(client, fromAccountSrno, -debitAmount, session.businessId);
      
      await client.query(
        `INSERT INTO transactions (currency_code, account_srno, primary_account_srno, amount, transaction_type, remarks, trans_date, business_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [fromResult.currencyCode, fromAccountSrno, fromResult.mainAccountSrno, -debitAmount, "WithdrawalDebit", `Withdrawal: ${details}`, date, session.businessId]
      );

      // 2. Credit the Destination Ledger (Positive Addition via Exchange Rate)
      const toResult = await safelyModifyAccount(client, toAccountSrno, creditAmount, session.businessId);
      
      await client.query(
        `INSERT INTO transactions (currency_code, account_srno, primary_account_srno, amount, transaction_type, remarks, trans_date, business_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [toResult.currencyCode, toAccountSrno, toResult.mainAccountSrno, creditAmount, "WithdrawalCredit", `Received Transfer: ${details}`, date, session.businessId]
      );
    });

    revalidatePath("/finance");
    revalidatePath("/properties");
    return { success: true };
  } catch (error) {
    console.error("Transfer error:", error);
    return { error: error.message };
  }
}

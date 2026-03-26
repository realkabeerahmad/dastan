"use server";

import { query, transaction } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Fetches all properties explicitly for the Expense dropdown.
export async function getPropertiesForFinance() {
  try {
    const res = await query(`SELECT property_id, property_name FROM properties ORDER BY property_name ASC`);
    return res.rows;
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Fetches all valid Accounts in the DB (Both Main and Property accounts) for Withdrawals.
export async function getAllAccounts() {
  try {
    const res = await query(`
      SELECT a.srno, a.currency_code, a.account_type, a.income, a.profit, a.expense,
             p.property_name 
      FROM accounts a
      LEFT JOIN properties p ON a.property_id = p.property_id
      ORDER BY a.account_type ASC, a.currency_code ASC
    `);
    
    // Map them cleanly for the UI dropdown
    return res.rows.map(acc => {
      const label = acc.account_type === 'Main' 
        ? `[Main] Global ${acc.currency_code} Ledger`
        : `[Property] ${acc.property_name} (${acc.currency_code})`;
      
      return {
        id: acc.srno,
        name: label,
        currencyCode: acc.currency_code,
        balance: Number(acc.profit)
      };
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function postExpense(formData) {
  try {
    const { propertyId, amount, currencyCode, details, date } = formData;
    const numAmount = Number(amount);
    const isoDate = new Date(date).toISOString();

    await transaction(async (client) => {
      // 1. Fetch Property Account
      const propAccRes = await client.query(
        `SELECT srno FROM accounts WHERE property_id = $1 AND currency_code = $2 LIMIT 1`,
        [propertyId, currencyCode]
      );
      if (propAccRes.rows.length === 0) throw new Error(`Property Account (${currencyCode}) not found.`);
      const propertyAccountSrno = propAccRes.rows[0].srno;

      // 2. Fetch Main Account
      const mainAccRes = await client.query(
        `SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1 LIMIT 1`,
        [currencyCode]
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

      // 5. Insert Negative Expense Transaction
      await client.query(
        `INSERT INTO transactions (currency_code, account_srno, primary_account_srno, amount, transaction_type, remarks, trans_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [currencyCode, propertyAccountSrno, mainAccountSrno, -numAmount, "Expense", details, date]
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
async function safelyModifyAccount(client, accountSrno, amountToModify) {
  const accRes = await client.query(`SELECT account_type, currency_code FROM accounts WHERE srno = $1`, [accountSrno]);
  if (!accRes.rows.length) throw new Error("Target Account not found.");
  const acc = accRes.rows[0];

  // Modify the specific account directly (Income & Profit)
  await client.query(`UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`, [amountToModify, accountSrno]);

  // If this was a localized Property Account, ripple the effect natively to its parent Main ledger
  if (acc.account_type === 'Property') {
    const mainAccRes = await client.query(`SELECT srno FROM accounts WHERE account_type = 'Main' AND currency_code = $1 LIMIT 1`, [acc.currency_code]);
    if (mainAccRes.rows.length > 0) {
      const mainAccountSrno = mainAccRes.rows[0].srno;
      await client.query(`UPDATE accounts SET income = income + $1, profit = profit + $1 WHERE srno = $2`, [amountToModify, mainAccountSrno]);
    }
  }
  return acc.currency_code;
}

export async function postWithdrawal(formData) {
  try {
    const { fromAccountSrno, toAccountSrno, amount, exchangeRate, date, details } = formData;
    const debitAmount = Number(amount);
    const rate = Number(exchangeRate);
    const creditAmount = debitAmount * rate;
    const isoDate = new Date(date).toISOString();

    if (fromAccountSrno === toAccountSrno) throw new Error("Cannot transfer to the same account.");

    await transaction(async (client) => {
      // 1. Debit the Origin Ledger (Negative Addition)
      const fromCurr = await safelyModifyAccount(client, fromAccountSrno, -debitAmount);
      
      await client.query(
        `INSERT INTO transactions (currency_code, account_srno, amount, transaction_type, remarks, trans_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [fromCurr, fromAccountSrno, -debitAmount, "WithdrawalDebit", `Withdrawal: ${details}`, date]
      );

      // 2. Credit the Destination Ledger (Positive Addition via Exchange Rate)
      const toCurr = await safelyModifyAccount(client, toAccountSrno, creditAmount);
      
      await client.query(
        `INSERT INTO transactions (currency_code, account_srno, amount, transaction_type, remarks, trans_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [toCurr, toAccountSrno, creditAmount, "WithdrawalCredit", `Received Transfer: ${details}`, date]
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

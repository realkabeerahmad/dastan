"use server";
import { query } from "@/lib/db";

export async function getDashboardAnalytics() {
  try {
    // 1. Live Running Balances
    const balanceRes = await query(`
      SELECT a.srno, a.currency_code, a.account_type, a.profit, p.property_name 
      FROM accounts a
      LEFT JOIN properties p ON a.property_id = p.property_id
      ORDER BY a.account_type ASC, a.currency_code ASC
    `);

    // 2. Fetch Historical Snapshots from Python ETL (account_summary)
    const historyMonthly = await query(`
      SELECT currency_code, SUM(daily_income) as inc, SUM(daily_expense) as exp, SUM(daily_profit) as prof
      FROM account_summary
      WHERE date_trunc('month', summary_date) = date_trunc('month', CURRENT_DATE)
      GROUP BY currency_code
    `);

    const historyYearly = await query(`
      SELECT currency_code, SUM(daily_income) as inc, SUM(daily_expense) as exp, SUM(daily_profit) as prof
      FROM account_summary
      WHERE date_trunc('year', summary_date) = date_trunc('year', CURRENT_DATE)
      GROUP BY currency_code
    `);

    // 3. Fetch Intra-day Live Data (Since Python strictly aggregates up to Today - 1)
    const todayRes = await query(`
      SELECT currency_code, 
             SUM(CASE WHEN transaction_type IN ('BookingIncome', 'WithdrawalCredit', 'BookingCancellation', 'BookingPendingReversal') THEN amount ELSE 0 END) as inc,
             SUM(CASE WHEN transaction_type IN ('Expense', 'WithdrawalDebit') THEN ABS(amount) ELSE 0 END) as exp
      FROM transactions
      WHERE trans_date = CURRENT_DATE
      GROUP BY currency_code
    `);

    return {
      balances: balanceRes.rows,
      snapshots: {
        monthly: historyMonthly.rows,
        yearly: historyYearly.rows,
        today: todayRes.rows
      }
    };
  } catch (err) {
    console.error("Critical Dashboard Failure:", err);
    return null;
  }
}

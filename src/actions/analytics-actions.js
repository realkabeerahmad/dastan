"use server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function getDashboardAnalytics() {
  try {
    const session = await requireSession();
    const bid = session.businessId;

    // 1. Live Running Balances
    const balanceRes = await query(`
      SELECT a.srno, a.currency_code, a.account_type, a.profit, p.property_name 
      FROM accounts a
      LEFT JOIN properties p ON a.property_id = p.property_id
      WHERE a.business_id = $1
      ORDER BY a.account_type ASC, a.currency_code ASC
    `, [bid]);

    // 2. Historical Snapshots
    const historyMonthly = await query(`
      SELECT currency_code, SUM(daily_income) as inc, SUM(daily_expense) as exp, SUM(daily_profit) as prof
      FROM account_summary
      WHERE business_id = $1 AND date_trunc('month', summary_date) = date_trunc('month', CURRENT_DATE)
      GROUP BY currency_code
    `, [bid]);

    const historyYearly = await query(`
      SELECT currency_code, SUM(daily_income) as inc, SUM(daily_expense) as exp, SUM(daily_profit) as prof
      FROM account_summary
      WHERE business_id = $1 AND date_trunc('year', summary_date) = date_trunc('year', CURRENT_DATE)
      GROUP BY currency_code
    `, [bid]);

    // 3. Intra-day Live Data
    const todayRes = await query(`
      SELECT currency_code, 
             SUM(CASE WHEN transaction_type IN ('BookingIncome', 'BookingCancellation', 'BookingPendingReversal') THEN amount ELSE 0 END) as inc,
             SUM(CASE WHEN transaction_type IN ('Expense') THEN ABS(amount) ELSE 0 END) as exp
      FROM transactions
      WHERE business_id = $1 AND trans_date = CURRENT_DATE
      GROUP BY currency_code
    `, [bid]);

    // 4. Global KPIs
    const propsCount = await query(`SELECT COUNT(*) as count FROM properties WHERE business_id = $1`, [bid]);
    const custsCount = await query(`SELECT COUNT(*) as count FROM customers WHERE business_id = $1`, [bid]);
    const transCount = await query(`SELECT COUNT(*) as count FROM transactions WHERE business_id = $1`, [bid]);
    
    // 5. Bookings Velocity (unused standalone but kept)
    const bookingsRatio = await query(`
      SELECT booking_status as name, COUNT(*) as value FROM bookings
      WHERE business_id = $1 GROUP BY booking_status
    `, [bid]);

    // 6. Property Performance Arrays
    const propPerformance = await query(`
      SELECT p.property_name, a.currency_code, a.income, a.expense, a.profit 
      FROM properties p 
      JOIN accounts a ON p.property_id = a.property_id 
      WHERE a.account_type = 'Property' AND p.business_id = $1
    `, [bid]);

    // 7. Time-Series Revenue
    const timeSeries = await query(`
      SELECT date_trunc('day', summary_date) as date, 
             currency_code, 
             SUM(daily_income) as revenue, 
             SUM(daily_expense) as expense, 
             SUM(daily_profit) as profit 
      FROM account_summary 
      WHERE business_id = $1 AND summary_date >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY date_trunc('day', summary_date), currency_code 
      ORDER BY date ASC
    `, [bid]);

    // 8. Booking ratios split by tenure
    const bookingRatioToday = await query(`
      SELECT booking_status as name, COUNT(*) as value FROM bookings
      WHERE business_id = $1 AND DATE(created_at) = CURRENT_DATE GROUP BY booking_status
    `, [bid]);
    const bookingRatioMonth = await query(`
      SELECT booking_status as name, COUNT(*) as value FROM bookings
      WHERE business_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE) GROUP BY booking_status
    `, [bid]);
    const bookingRatioYear = await query(`
      SELECT booking_status as name, COUNT(*) as value FROM bookings
      WHERE business_id = $1 AND created_at >= date_trunc('year', CURRENT_DATE) GROUP BY booking_status
    `, [bid]);

    const mapRatio = (rows) => rows.map(r => ({ ...r, value: Number(r.value) }));

    return {
      balances: balanceRes.rows,
      snapshots: {
        monthly: historyMonthly.rows,
        yearly: historyYearly.rows,
        today: todayRes.rows
      },
      kpis: {
        totalProperties: Number(propsCount.rows[0]?.count || 0),
        totalCustomers: Number(custsCount.rows[0]?.count || 0),
        totalTransactions: Number(transCount.rows[0]?.count || 0)
      },
      charts: {
        bookingRatio: {
          day:   mapRatio(bookingRatioToday.rows),
          month: mapRatio(bookingRatioMonth.rows),
          year:  mapRatio(bookingRatioYear.rows),
        },
        propertyPerformance: propPerformance.rows.map(r => ({
          ...r,
          income: Number(r.income),
          expense: Number(r.expense),
          profit: Number(r.profit)
        })),
        timeSeries: timeSeries.rows.map(r => ({
          ...r,
          revenue: Number(r.revenue),
          expense: Number(r.expense),
          profit: Number(r.profit)
        }))
      }
    };
  } catch (err) {
    console.error("Critical Dashboard Failure:", err);
    return null;
  }
}

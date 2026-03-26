"use client";

import { useMemo } from "react";
import styles from "./dashboard.module.css";
import { AreaChart, Banknote, CalendarDays, BarChart3, TrendingUp, AlertCircle } from "lucide-react";

export default function DashboardClient({ data }) {
  if (!data) return <div className={styles.container}>Failed to load analytics...</div>;

  // Compile Analytics
  const getMetrics = (currency) => {
    // Pluck Historicals
    const mRow = data.snapshots.monthly.find(r => r.currency_code === currency) || { inc: 0, exp: 0, prof: 0 };
    const yRow = data.snapshots.yearly.find(r => r.currency_code === currency) || { inc: 0, exp: 0, prof: 0 };
    const tRow = data.snapshots.today.find(r => r.currency_code === currency) || { inc: 0, exp: 0 };

    const tInc = Number(tRow.inc);
    const tExp = Number(tRow.exp);
    const tProf = tInc - tExp;

    return {
      today: { inc: tInc, exp: tExp, prof: tProf },
      month: { 
        inc: Number(mRow.inc) + tInc, 
        exp: Number(mRow.exp) + tExp, 
        prof: Number(mRow.prof) + tProf 
      },
      year: { 
        inc: Number(yRow.inc) + tInc, 
        exp: Number(yRow.exp) + tExp, 
        prof: Number(yRow.prof) + tProf 
      }
    };
  };

  const usdMetrics = getMetrics("USD");
  const pkrMetrics = getMetrics("PKR");

  const renderMetricCard = (title, icon, metrics, cur) => (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {icon}
          <span className={styles.cardTitle}>{title} ({cur})</span>
        </div>
      </div>
      
      <div className={styles.metricRow}>
        <span className={styles.metricLabel}>Income Added</span>
        <span className={`${styles.metricValue} ${styles.metricIncome}`}>+{cur} {metrics.inc.toLocaleString()}</span>
      </div>
      <div className={styles.metricRow}>
        <span className={styles.metricLabel}>Expenses & Reversals</span>
        <span className={`${styles.metricValue} ${styles.metricExpense}`}>-{cur} {metrics.exp.toLocaleString()}</span>
      </div>
      <div className={`${styles.metricRow} ${styles.metricProfit}`}>
        <span className={styles.metricLabel}>Net Profit Margin</span>
        <span className={styles.metricValue}>{cur} {metrics.prof.toLocaleString()}</span>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Headquarters</h1>
        <p className={styles.subtitle}>Your real-time consolidated financial overview.</p>
      </header>

      {(!data.snapshots.monthly.length && !data.snapshots.today.length) && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <AlertCircle color="#d97706" size={20} />
          <div style={{ fontSize: '0.875rem', color: '#b45309' }}>
            <strong>Analytics Waiting for Python:</strong> The Python ETL Scheduler (`account_snapshot_job.py`) has not crunched the historical database snapshots yet! Only live intra-day uncommitted metrics are currently displaying. Run the python script to permanently hydrate the history!
          </div>
        </div>
      )}

      {/* Global Running Balances */}
      <h2 className={styles.sectionTitle}>Vault Balances</h2>
      <div className={styles.grid}>
        {data.balances.map(acc => (
          <div key={acc.srno} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle} style={{ color: acc.account_type === 'Main' ? '#18181b' : '#71717a' }}>
                {acc.account_type === "Main" ? "Global Ledger" : acc.property_name}
              </span>
              <span className={`${styles.badge} ${acc.account_type === "Main" ? styles.badgeMain : styles.badgeProp}`}>
                {acc.currency_code}
              </span>
            </div>
            <div className={styles.balanceAmount} style={{ color: Number(acc.profit) >= 0 ? '#18181b' : '#ef4444' }}>
              {acc.currency_code} {Number(acc.profit).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Analytics Blended */}
      <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp size={20} /> Unified Performance (USD)
      </h2>
      <div className={styles.analyticsGrid}>
        {renderMetricCard("Today", <CalendarDays size={16} color="#71717a" />, usdMetrics.today, "USD")}
        {renderMetricCard("This Month", <BarChart3 size={16} color="#71717a" />, usdMetrics.month, "USD")}
        {renderMetricCard("This Year", <AreaChart size={16} color="#71717a" />, usdMetrics.year, "USD")}
      </div>

      <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp size={20} /> Unified Performance (PKR)
      </h2>
      <div className={styles.analyticsGrid}>
        {renderMetricCard("Today", <CalendarDays size={16} color="#71717a" />, pkrMetrics.today, "PKR")}
        {renderMetricCard("This Month", <BarChart3 size={16} color="#71717a" />, pkrMetrics.month, "PKR")}
        {renderMetricCard("This Year", <AreaChart size={16} color="#71717a" />, pkrMetrics.year, "PKR")}
      </div>

    </div>
  );
}

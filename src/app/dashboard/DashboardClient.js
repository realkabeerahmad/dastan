"use client";

import { useState, useMemo } from "react";
import styles from "./dashboard.module.css";
import {
  Building, Users, Activity, TrendingUp, TrendingDown,
  Wallet, AlertCircle, CalendarCheck, CalendarClock, CalendarX,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLORS = { Confirmed: "#10b981", Pending: "#f59e0b", Cancelled: "#ef4444" };
const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

function fmt(n, code) {
  const v = Number(n || 0);
  const sign = v >= 0 ? "+" : "";
  const abs = Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return `${sign}${code} ${abs}`;
}

function MetricCard({ label, today, month, year, currency, icon: Icon }) {
  const color = (v) => (Number(v) >= 0 ? styles.green : styles.red);
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <Icon size={18} className={styles.metricIcon} />
        <span className={styles.metricTitle}>{label}</span>
      </div>
      <div className={styles.metricBody}>
        <div className={styles.metricPeriod}>
          <div className={styles.periodLabel}>Today</div>
          <div className={`${styles.periodValue} ${color(today)}`}>{fmt(today, currency)}</div>
        </div>
        <div className={styles.metricDivider} />
        <div className={styles.metricPeriod}>
          <div className={styles.periodLabel}>This Month</div>
          <div className={`${styles.periodValue} ${color(month)}`}>{fmt(month, currency)}</div>
        </div>
        <div className={styles.metricDivider} />
        <div className={styles.metricPeriod}>
          <div className={styles.periodLabel}>This Year</div>
          <div className={`${styles.periodValue} ${color(year)}`}>{fmt(year, currency)}</div>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, prefix }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span style={{ color: p.color }}>●</span>
          <span className={styles.tooltipKey}>{p.name}</span>
          <span className={styles.tooltipVal}>
            {prefix}{Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardClient({ data }) {
  const [currency, setCurrency] = useState("USD");
  const [tenure, setTenure] = useState("month");

  if (!data) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={32} />
        <p>Dashboard failed to load. Check your database connection.</p>
      </div>
    );
  }

  const getMetrics = (cur) => {
    const mRow = data.snapshots.monthly.find((r) => r.currency_code === cur) || {};
    const yRow = data.snapshots.yearly.find((r) => r.currency_code === cur) || {};
    const tRow = data.snapshots.today.find((r) => r.currency_code === cur) || {};
    const ti = Number(tRow.inc || 0), te = Number(tRow.exp || 0), tp = ti - te;
    return {
      income:  { t: ti, m: Number(mRow.inc || 0) + ti,  y: Number(yRow.inc || 0) + ti },
      expense: { t: te, m: Number(mRow.exp || 0) + te,  y: Number(yRow.exp || 0) + te },
      profit:  { t: tp, m: Number(mRow.prof || 0) + tp, y: Number(yRow.prof || 0) + tp },
    };
  };

  const usd = getMetrics("USD"), pkr = getMetrics("PKR");
  const hasHistory =
    data.snapshots.monthly.length > 0 || data.snapshots.today.length > 0;

  const cutoffDays = tenure === "day" ? 1 : tenure === "month" ? 30 : 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cutoffDays);

  const tsFiltered = useMemo(
    () =>
      data.charts.timeSeries
        .filter((d) => d.currency_code === currency && new Date(d.date) >= cutoff)
        .map((r) => ({
          ...r,
          label: new Date(r.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }),
        })),
    [currency, tenure, data.charts.timeSeries]
  );

  const propFiltered = useMemo(
    () => data.charts.propertyPerformance.filter((d) => d.currency_code === currency),
    [currency, data.charts.propertyPerformance]
  );

  const bookingFiltered = useMemo(
    () => data.charts.bookingRatio[tenure] || [],
    [tenure, data.charts.bookingRatio]
  );

  const mainAccounts = data.balances.filter((a) => a.account_type === "Main");
  const propAccounts = data.balances.filter((a) => a.account_type !== "Main");

  const tenureLabel =
    tenure === "day" ? "Today" : tenure === "month" ? "Last 30 days" : "Last 12 months";

  return (
    <div className={styles.page}>
      {/* ── Hero Header ── */}
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>Headquarters</h1>
          <p className={styles.heroSub}>
            Live consolidated view across all properties and ledgers.
          </p>
        </div>
        <div className={styles.kpiStrip}>
          <div className={styles.kpiPill}>
            {/* FIX: was inline style={{ background:'#ede9fe', color:'#5b21b6' }} — light on dark */}
            <div className={`${styles.kpiIcon} ${styles.kpiIconPurple}`}>
              <Building size={16} />
            </div>
            <div>
              <div className={styles.kpiNum}>{data.kpis.totalProperties}</div>
              <div className={styles.kpiLbl}>Properties</div>
            </div>
          </div>
          <div className={styles.kpiPill}>
            {/* FIX: was inline style={{ background:'#dcfce7', color:'#166534' }} — light on dark */}
            <div className={`${styles.kpiIcon} ${styles.kpiIconGreen}`}>
              <Users size={16} />
            </div>
            <div>
              <div className={styles.kpiNum}>{data.kpis.totalCustomers}</div>
              <div className={styles.kpiLbl}>Customers</div>
            </div>
          </div>
          <div className={styles.kpiPill}>
            {/* FIX: was inline style={{ background:'#fef3c7', color:'#92400e' }} — light on dark */}
            <div className={`${styles.kpiIcon} ${styles.kpiIconAmber}`}>
              <Activity size={16} />
            </div>
            <div>
              <div className={styles.kpiNum}>{data.kpis.totalTransactions}</div>
              <div className={styles.kpiLbl}>Transactions</div>
            </div>
          </div>
        </div>
      </div>

      {!hasHistory && (
        <div className={styles.alertBanner}>
          <AlertCircle size={16} />
          <span>
            <strong>Awaiting ETL Data:</strong> The Python scheduler hasn&apos;t generated
            historical snapshots yet. Only live intra-day data is shown below.
          </span>
        </div>
      )}

      {/* ── Vault Balances ── */}
      <section>
        <div className={styles.sectionHeader}>
          <Wallet size={16} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Vault Balances</h2>
          <span className={styles.sectionBadge}>Live Running</span>
        </div>
        <div className={styles.vaultGrid}>
          {mainAccounts.map((acc) => (
            <div key={acc.srno} className={`${styles.vaultCard} ${styles.vaultMain}`}>
              <div className={styles.vaultLabel}>Global Master · {acc.currency_code}</div>
              <div className={`${styles.vaultAmount} ${Number(acc.profit) >= 0 ? styles.green : styles.red}`}>
                {acc.currency_code} {Number(acc.profit).toLocaleString()}
              </div>
              <div className={styles.vaultBadge}>Main Ledger</div>
            </div>
          ))}
          {propAccounts.map((acc) => (
            <div key={acc.srno} className={styles.vaultCard}>
              <div className={styles.vaultLabel}>{acc.property_name} · {acc.currency_code}</div>
              <div className={`${styles.vaultAmount} ${Number(acc.profit) >= 0 ? styles.green : styles.red}`}>
                {acc.currency_code} {Number(acc.profit).toLocaleString()}
              </div>
              <div className={styles.vaultBadge}>Property</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── P&L Performance ── */}
      <section>
        <div className={styles.sectionHeader}>
          <TrendingUp size={16} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>P&amp;L Performance</h2>
        </div>
        <div className={styles.perfGrid}>
          <MetricCard label="Income (USD)"     today={usd.income.t}    month={usd.income.m}    year={usd.income.y}    currency="USD" icon={TrendingUp} />
          <MetricCard label="Expense (USD)"    today={-usd.expense.t}  month={-usd.expense.m}  year={-usd.expense.y}  currency="USD" icon={TrendingDown} />
          <MetricCard label="Net Profit (USD)" today={usd.profit.t}    month={usd.profit.m}    year={usd.profit.y}    currency="USD" icon={Wallet} />
          <MetricCard label="Income (PKR)"     today={pkr.income.t}    month={pkr.income.m}    year={pkr.income.y}    currency="PKR" icon={TrendingUp} />
          <MetricCard label="Expense (PKR)"    today={-pkr.expense.t}  month={-pkr.expense.m}  year={-pkr.expense.y}  currency="PKR" icon={TrendingDown} />
          <MetricCard label="Net Profit (PKR)" today={pkr.profit.t}    month={pkr.profit.m}    year={pkr.profit.y}    currency="PKR" icon={Wallet} />
        </div>
      </section>

      {/* ── Charts ── */}
      <section>
        <div className={styles.sectionHeader}>
          <Activity size={16} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Financial Visualizations</h2>
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              {["USD", "PKR"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`${styles.filterBtn} ${currency === c ? styles.filterBtnActive : ""}`}
                >
                  {c === "USD" ? "$ USD" : "₨ PKR"}
                </button>
              ))}
            </div>
            <div className={styles.filterSep} />
            <div className={styles.filterGroup}>
              {[["day", "Today"], ["month", "Month"], ["year", "Year"]].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setTenure(val)}
                  className={`${styles.filterBtn} ${tenure === val ? styles.filterBtnActive : ""}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          {/* Area Chart — FIX: was inline style={{ gridColumn:'1 / -1' }} */}
          <div className={`${styles.chartCard} ${styles.chartCardFull}`}>
            <div className={styles.chartHeader}>
              <div>
                <div className={styles.chartTitle}>Revenue vs Expense Trend</div>
                <div className={styles.chartSub}>
                  {currency} · {tenureLabel} · from ETL snapshots
                </div>
              </div>
              <div className={styles.chartLegend}>
                <span className={`${styles.legendDot} ${styles.legendDotGreen}`} />Revenue
                <span className={`${styles.legendDot} ${styles.legendDotRed}`} />Expense
              </div>
            </div>
            {tsFiltered.length === 0 ? (
              <div className={styles.chartEmpty}>
                No historical data yet — run the Python scheduler to populate.
              </div>
            ) : (
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tsFiltered} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} dx={-8} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip prefix="$" />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#gRev)" />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <div className={styles.chartTitle}>Property Performance</div>
                <div className={styles.chartSub}>
                  Income · Expense · Net Profit per property ({currency})
                </div>
              </div>
            </div>
            {propFiltered.length === 0 ? (
              <div className={styles.chartEmpty}>No property data found.</div>
            ) : (
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propFiltered} barSize={14} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="property_name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a1a1aa" }} dx={-8} tickFormatter={(v) => `$${v}`} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<CustomTooltip prefix="$" />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "16px", color: "#a1a1aa" }} />
                    <Bar dataKey="income"  name="Income"     fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expense" name="Expense"    fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="profit"  name="Net Profit" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Donut Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <div className={styles.chartTitle}>Booking Status Breakdown</div>
                <div className={styles.chartSub}>
                  {tenure === "day" ? "Today" : tenure === "month" ? "This month" : "This year"}
                </div>
              </div>
            </div>
            {bookingFiltered.length === 0 ? (
              <div className={styles.chartEmpty}>No booking data found.</div>
            ) : (
              /* FIX: was inline style={{ height:'280px' }} — moved to chartBody in CSS */
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bookingFiltered}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="45%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {bookingFiltered.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} bookings`, ""]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: "#050505",
                        color: "#ededed",
                        fontSize: "12px",
                      }}
                    />
                    <Legend iconType="circle" verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

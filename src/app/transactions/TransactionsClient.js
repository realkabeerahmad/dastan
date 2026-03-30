"use client";

import styles from "./transactions.module.css";
import { Link2, CalendarDays, RefreshCcw, Banknote, HelpCircle } from "lucide-react";
import { formatDate, formatTime } from "@/lib/dateUtils";

export default function TransactionsClient({ initialTransactions }) {

  function renderIcon(type) {
    if (type.includes("BookingIncome") || type.includes("Credit"))
      return <Banknote size={14} className={styles.iconGreen} />;
    if (type.includes("Withdrawal Debit") || type.includes("Expense") || type.includes("Debit"))
      return <Banknote size={14} className={styles.iconRed} />;
    if (type.includes("Reversal") || type.includes("Cancel"))
      return <RefreshCcw size={14} className={styles.iconAmber} />;
    return <HelpCircle size={14} className={styles.iconMuted} />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {/* FIX: was inline style={{ display, alignItems, gap }} — use CSS class */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Audit Ledger</h1>
          <span className={styles.badgeCount}>
            {initialTransactions.length} logs strictly verified
          </span>
        </div>
        <p className={styles.subtitle}>
          Raw un-aggregated dual-entry transaction stream securely surfacing exact Vault origins.
        </p>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Ledger Origin</th>
              <th>Transaction Details</th>
              <th>Classification</th>
              <th>Links</th>
              <th className={styles.rightAlign}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {initialTransactions.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.emptyState}>
                  No transactions recorded.
                </td>
              </tr>
            ) : (
              initialTransactions.map((tx) => {
                const isPositive = Number(tx.amount) > 0;
                const isReversal =
                  tx.transaction_type.includes("Cancel") ||
                  tx.transaction_type.includes("Reversal");

                return (
                  <tr key={tx.trans_id} className={styles.row}>
                    {/* Date */}
                    <td>
                      <div className={styles.dateCell}>
                        <CalendarDays size={12} className={styles.dateCellIcon} />
                        {/* FIX: formatDate now imported from shared lib — was duplicated locally */}
                        <span className={styles.primaryText}>{formatDate(tx.trans_date)}</span>
                      </div>
                      <div className={styles.subText}>{formatTime(tx.created_at)}</div>
                    </td>

                    {/* Account Origin — FIX: was inline color:"#18181b"/"#3f3f46" — dark text on dark bg */}
                    <td>
                      <div className={`${styles.primaryText} ${tx.account_type === "Main" ? styles.accountMain : styles.accountProp}`}>
                        {tx.account_type === "Main" ? "Global Main Account" : tx.property_name}
                      </div>
                      <div className={styles.subText}>
                        {tx.currency_code} / {tx.account_type}
                        {/* FIX: was inline style fontSize,color,marginLeft — now CSS class */}
                        <span className={styles.accountSrno}>#{tx.account_srno}</span>
                      </div>
                    </td>

                    {/* Remarks */}
                    <td>
                      <div className={styles.primaryText}>
                        {tx.remarks || "No details provided"}
                      </div>
                      {/* FIX: was inline style fontFamily:"monospace" — now CSS class */}
                      <div className={`${styles.subText} ${styles.monoId}`}>
                        ID: {tx.trans_id}
                      </div>
                    </td>

                    {/* Classification */}
                    <td>
                      <div className={styles.classificationBadge}>
                        {renderIcon(tx.transaction_type)}
                        <span>{tx.transaction_type}</span>
                      </div>
                    </td>

                    {/* Links */}
                    <td>
                      {tx.linked_transaction_id ? (
                        <div className={styles.linkBadge}>
                          <Link2 size={12} />
                          Reverses #{tx.linked_transaction_id}
                        </div>
                      ) : (
                        <span className={styles.subText}>-</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td
                      className={`${styles.rightAlign} ${
                        isPositive
                          ? styles.amtGreen
                          : isReversal
                          ? styles.amtOrange
                          : styles.amtRed
                      }`}
                    >
                      <span className={styles.currencyCode}>{tx.currency_code}</span>
                      {isPositive && "+"}
                      {Number(tx.amount).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

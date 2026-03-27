"use client";

import styles from "./transactions.module.css";
import { Link2, CalendarDays, RefreshCcw, Banknote, HelpCircle } from "lucide-react";

export default function TransactionsClient({ initialTransactions }) {

  function formatDate(dateStr, withTime = false) {
    if (!dateStr) return "";
    const options = { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" };
    if (withTime) {
      return new Date(dateStr).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    return new Date(dateStr).toLocaleDateString("en-GB", options);
  }

  function renderIcon(type) {
    if (type.includes("BookingIncome") || type.includes("Credit")) return <Banknote size={14} color="#10b981" />;
    if (type.includes("Withdrawal Debit") || type.includes("Expense") || type.includes("Debit")) return <Banknote size={14} color="#ef4444" />;
    if (type.includes("Reversal") || type.includes("Cancel")) return <RefreshCcw size={14} color="#b45309" />;
    return <HelpCircle size={14} color="#71717a" />;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 className={styles.title}>Audit Ledger</h1>
          <span className={styles.badgeCount}>{initialTransactions.length} logs strictly verified</span>
        </div>
        <p className={styles.subtitle}>Raw un-aggregated dual-entry transaction stream securely surfacing exact Vault origins.</p>
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
                <td colSpan="6" className={styles.emptyState}>No transactions recorded.</td>
              </tr>
            ) : (
              initialTransactions.map((tx) => {
                const isPositive = Number(tx.amount) > 0;
                const isReversal = tx.transaction_type.includes("Cancel") || tx.transaction_type.includes("Reversal");
                return (
                  <tr key={tx.trans_id} className={styles.row}>
                    {/* Native Formatted Date */}
                    <td>
                      <div className={styles.dateCell}>
                        <CalendarDays size={12} color="#a1a1aa" />
                        <span className={styles.primaryText}>{formatDate(tx.trans_date)}</span>
                      </div>
                      <div className={styles.subText}>{formatDate(tx.created_at, true)}</div>
                    </td>

                    {/* Account Origin */}
                    <td>
                      <div className={styles.primaryText} style={{ color: tx.account_type === 'Main' ? '#18181b' : '#3f3f46' }}>
                        {tx.account_type === 'Main' ? 'Global Main Account' : tx.property_name}
                      </div>
                      <div className={styles.subText}>
                        {tx.currency_code} / {tx.account_type}
                        <span style={{ fontSize: '0.65em', color: '#d4d4d8', marginLeft: '4px' }}>#{tx.account_srno}</span>
                      </div>
                    </td>

                    {/* Meta Remarks */}
                    <td>
                      <div className={styles.primaryText}>{tx.remarks || "No details provided"}</div>
                      <div className={styles.subText}>
                        <span style={{ fontFamily: "monospace", letterSpacing: "-0.02em" }}>ID: {tx.trans_id}</span>
                      </div>
                    </td>

                    {/* Strict Dual-Entry Classifier */}
                    <td>
                      <div className={styles.classificationBadge}>
                        {renderIcon(tx.transaction_type)}
                        <span>{tx.transaction_type}</span>
                      </div>
                    </td>

                    {/* Mathematical Strict Linkage Maps */}
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

                    {/* Final Formatted Number */}
                    <td className={`${styles.rightAlign} ${isPositive ? styles.amtGreen : isReversal ? styles.amtOrange : styles.amtRed}`}>
                      <span className={styles.currencyCode}>{tx.currency_code}</span> 
                      {Number(tx.amount) > 0 && '+'}{Number(tx.amount).toLocaleString()}
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

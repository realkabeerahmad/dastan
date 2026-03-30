"use client";

import { useState, useTransition } from "react";
import styles from "./finance.module.css";
import { Loader2, ArrowRightLeft, CreditCard } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DatePicker from "@/components/ui/DatePicker";
import { postExpense, postWithdrawal } from "@/actions/finance-actions";

export default function FinanceClient({ properties, accounts }) {
  const [activeTab, setActiveTab] = useState("expense"); // "expense" or "withdraw"
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Expense State
  const [expenseProp, setExpenseProp] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCurrency, setExpenseCurrency] = useState("USD");
  
  // Withdraw State
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [withdrawDate, setWithdrawDate] = useState("");

  // Helper mappings
  const propertyOptions = properties.map(p => ({ id: p.property_id, name: p.property_name }));
  const accountOptions = accounts.map(a => ({ id: a.id, name: a.name }));

  // Find balances dynamically when selected
  const fromAccObj = accounts.find(a => a.id === fromAccount?.id);
  const toAccObj = accounts.find(a => a.id === toAccount?.id);

  // Form Handlers
  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const formData = new FormData(e.target);

    // Validation
    if (!expenseProp) return setErrorMsg("Please select a property.");
    if (!expenseDate) return setErrorMsg("Please select an expense date.");
    
    startTransition(async () => {
      const data = {
        propertyId: expenseProp?.id,
        currencyCode: formData.get("currencyCode"),
        amount: formData.get("amount"),
        date: expenseDate,
        details: formData.get("details")
      };
      
      const res = await postExpense(data);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Expense natively deducted from profit and securely logged!");
        e.target.reset();
        setExpenseDate("");
        setExpenseProp("");
      }
    });
  };

  const handleWithdrawalSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    const formData = new FormData(e.target);

    // Validation
    if (!fromAccount || !toAccount) return setErrorMsg("Please select both origin and destination accounts.");
    if (!withdrawDate) return setErrorMsg("Please select a transfer date.");
    if (fromAccount === toAccount) return setErrorMsg("Origin and Destination cannot be the same ledger.");

    startTransition(async () => {
      const data = {
        fromAccountSrno: fromAccount?.id,
        toAccountSrno: toAccount?.id,
        amount: formData.get("amount"),
        exchangeRate: formData.get("exchangeRate"),
        date: withdrawDate,
        details: formData.get("details")
      };

      const res = await postWithdrawal(data);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Multi-currency ledger transfer completed flawlessly!");
        e.target.reset();
        setWithdrawDate("");
        setFromAccount("");
        setToAccount("");
      }
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Financial Operations</h1>
        <p className={styles.subtitle}>Execute direct ledger actions, natively mutating accounts.</p>
      </header>

      <div className={styles.tabs}>
        <div 
          className={activeTab === "expense" ? `${styles.tab} ${styles.activeTab}` : styles.tab}
          onClick={() => { setActiveTab("expense"); setErrorMsg(""); setSuccessMsg(""); }}
        >
          Post Expense
        </div>
        <div 
          className={activeTab === "withdraw" ? `${styles.tab} ${styles.activeTab}` : styles.tab}
          onClick={() => { setActiveTab("withdraw"); setErrorMsg(""); setSuccessMsg(""); }}
        >
          Transfer / Withdraw
        </div>
      </div>

      {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}
      {successMsg && <div className={styles.successBox}>{successMsg}</div>}

      {activeTab === "expense" && (
        <div className={styles.card}>
          <form onSubmit={handleExpenseSubmit} className={styles.formGrid}>
            <div className={styles.fullWidth}>
              <label className={styles.label}>Associated Property</label>
              <SearchableSelect 
                options={propertyOptions}
                value={expenseProp?.name || ""}
                onChange={setExpenseProp}
                placeholder="Search and select a property..."
              />
            </div>

            <div>
              <label className={styles.label}>Expense Date</label>
              <DatePicker 
                value={expenseDate}
                onChange={setExpenseDate}
                placeholder="Select date"
                required
              />
            </div>

            <div>
              <label className={styles.label}>Currency Ledger</label>
              <select 
                name="currencyCode" 
                className={styles.select} 
                required 
                value={expenseCurrency}
                onChange={(e) => setExpenseCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
              </select>
            </div>

            <div className={styles.fullWidth}>
              <label className={styles.label}>Amount to Deduct</label>
              <div className={styles.inputWrapper}>
                <span className={styles.currencyAddon}>{expenseCurrency === "PKR" ? "₨" : "$"}</span>
                <input 
                  type="number" 
                  name="amount" 
                  step="0.01" 
                  min="0"
                  placeholder="0.00" 
                  className={`${styles.input} ${styles.inputWithAddon}`} 
                  required 
                />
              </div>
            </div>

            <div className={styles.fullWidth}>
              <label className={styles.label}>Expense Receipt Details</label>
              <textarea 
                name="details" 
                className={styles.textarea} 
                placeholder="E.g. Plumber for Room 204 leakage repairs..." 
                required
              />
            </div>

            <div className={styles.fullWidth}>
              <div className={styles.formulaNote}>
                <strong>Ledger Action:</strong> This will explicitly deduct the amount ONLY from the <code>profit</code> margin of both the Local Property Account and the Global Main Account. A negative <code>Expense</code> transaction receipt will be logged.
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                Confirm Expense Deduction
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "withdraw" && (
        <div className={styles.card}>
          <form onSubmit={handleWithdrawalSubmit} className={styles.formGrid}>
            <div className={styles.fullWidth}>
              <label className={styles.label}>Origin Account (Withdraw From)</label>
              <SearchableSelect 
                options={accountOptions}
                value={fromAccount?.name || ""}
                onChange={setFromAccount}
                placeholder="Select ledger to withdraw from..."
              />
              {fromAccObj && (
                <div className={styles.balanceLabel}>
                  <span>Available Profit Margin:</span>
                  {/* FIX: was inline style with conditional color — now CSS classes */}
                  <span className={fromAccObj.balance >= 0 ? styles.balancePositive : styles.balanceNegative}>
                    {fromAccObj.currencyCode} {fromAccObj.balance.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.fullWidth}>
              <label className={styles.label}>Destination Account (Transfer To)</label>
              <SearchableSelect 
                options={accountOptions}
                value={toAccount?.name || ""}
                onChange={setToAccount}
                placeholder="Select ledger to heavily impact..."
              />
              {toAccObj && (
                <div className={styles.balanceLabel}>
                  <span>Current Profit Margin:</span>
                  {/* FIX: was inline style with conditional color — now CSS classes */}
                  <span className={toAccObj.balance >= 0 ? styles.balancePositive : styles.balanceNegative}>
                    {toAccObj.currencyCode} {toAccObj.balance.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className={styles.label}>Withdrawal Amount ({fromAccObj?.currencyCode || 'Origin Currency'})</label>
              <input 
                type="number" 
                name="amount" 
                step="0.01" 
                min="0"
                placeholder="0.00" 
                className={styles.input} 
                required 
              />
            </div>

            <div>
              <label className={styles.label}>Exchange Rate Multiplier</label>
              <input 
                type="number" 
                name="exchangeRate" 
                step="0.0001" 
                min="0"
                defaultValue="1.0"
                placeholder="1.0" 
                className={styles.input} 
                required 
              />
              {/* FIX: was inline style={{ fontSize, color, marginTop }} */}
              <div className={styles.inputHint}>
                For same currency, keep as <code>1.0</code>
              </div>
            </div>

            <div className={styles.fullWidth}>
              <label className={styles.label}>Transfer Date</label>
              <DatePicker 
                value={withdrawDate}
                onChange={setWithdrawDate}
                placeholder="Select timestamp"
                required
              />
            </div>

            <div className={styles.fullWidth}>
              <label className={styles.label}>Transfer Remarks</label>
              <textarea 
                name="details" 
                className={styles.textarea} 
                placeholder="E.g. Withdrawn Airbnb profits matching Interbank exchange rate..." 
                required
              />
            </div>

            <div className={styles.fullWidth}>
              <div className={styles.formulaNote}>
                <strong>Cross-Currency Engine:</strong> Origin Account receives a strict <code>Debit</code> for the Withdrawal Amount. Destination Account receives a <code>Credit</code> equal to <code>(Withdrawal Amount × Exchange Rate)</code>. If Origin or Destination are localized Property Ledgers, their parent Global Main Accounts are automatically deduced/credited respectively.
              </div>
              <button type="submit" className={styles.submitBtn} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" size={18} /> : <ArrowRightLeft size={18} />}
                Execute Complex Transfer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

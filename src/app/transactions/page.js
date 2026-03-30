import { getTransactions } from "@/actions/transaction-actions";
import TransactionsClient from "./TransactionsClient";
/* FIX: title was "Dastan Audit Ledger" — standardised to "Mulk" */
export const metadata = { title: "Transactions — Mulk" };
export default async function TransactionsPage() {
  const transactions = await getTransactions();
  return <main><TransactionsClient initialTransactions={transactions} /></main>;
}

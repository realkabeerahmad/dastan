import { getTransactions } from "@/actions/transaction-actions";
import TransactionsClient from "./TransactionsClient";

export const metadata = { title: "Dastan Audit Ledger" };

export default async function TransactionsPage() {
  const transactions = await getTransactions();
  
  return (
    <main style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <TransactionsClient initialTransactions={transactions} />
    </main>
  );
}

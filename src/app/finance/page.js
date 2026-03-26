import { getPropertiesForFinance, getAllAccounts } from "@/actions/finance-actions";
import FinanceClient from "./FinanceClient";

export const metadata = {
  title: "Finance & Accounts | Dastan",
};

export default async function FinancePage() {
  const properties = await getPropertiesForFinance();
  const accounts = await getAllAccounts();

  return (
    <main style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <FinanceClient properties={properties} accounts={accounts} />
    </main>
  );
}

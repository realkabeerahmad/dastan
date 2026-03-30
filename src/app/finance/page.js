import { getPropertiesForFinance, getAllAccounts } from "@/actions/finance-actions";
import FinanceClient from "./FinanceClient";
/* FIX: title was "Finance & Accounts | Dastan" — standardised to "Mulk" */
export const metadata = { title: "Finance — Mulk" };
export default async function FinancePage() {
  const [properties, accounts] = await Promise.all([
    getPropertiesForFinance(), getAllAccounts(),
  ]);
  return <main><FinanceClient properties={properties} accounts={accounts} /></main>;
}

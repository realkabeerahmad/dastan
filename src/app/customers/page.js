import { getCustomers } from "@/actions/customer-actions";
import CustomersClient from "./CustomersClient";
/* FIX: title was "Dastan Customers" — standardised to "Mulk" */
export const metadata = { title: "Customers — Mulk" };
export default async function CustomersPage() {
  const customers = await getCustomers();
  return <main><CustomersClient initialCustomers={customers} /></main>;
}

import { getCustomers } from "@/actions/customer-actions";
import CustomersClient from "./CustomersClient";

export const metadata = { title: "Dastan Customers" };

export default async function CustomersPage() {
  const customers = await getCustomers();
  
  return (
    <main style={{ backgroundColor: "transparent", minHeight: "100vh" }}>
      <CustomersClient initialCustomers={customers} />
    </main>
  );
}

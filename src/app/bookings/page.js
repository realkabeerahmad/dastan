import { getBookings } from "@/actions/booking-actions";
import { getProperties } from "@/actions/property-actions";
import { getCustomers } from "@/actions/customer-actions";
import BookingsClient from "./BookingsClient";

export const metadata = {
  title: "Bookings | Mulk",
  description: "Manage bookings and transactions.",
};

export default async function BookingsPage() {
  const bookings = await getBookings();
  const properties = await getProperties();
  const customers = await getCustomers();

  return (
    <main style={{ backgroundColor: "transparent", minHeight: "100vh" }}>
      <BookingsClient initialBookings={bookings} properties={properties} customers={customers} />
    </main>
  );
}

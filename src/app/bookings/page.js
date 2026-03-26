import { getBookings } from "@/actions/booking-actions";
import { getProperties } from "@/actions/property-actions";
import BookingsClient from "./BookingsClient";

export const metadata = {
  title: "Bookings | Dastan",
  description: "Manage bookings and transactions.",
};

export default async function BookingsPage() {
  const bookings = await getBookings();
  const properties = await getProperties();

  return (
    <main style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <BookingsClient initialBookings={bookings} properties={properties} />
    </main>
  );
}

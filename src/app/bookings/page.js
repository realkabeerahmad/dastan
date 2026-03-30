import { getBookings } from "@/actions/booking-actions";
import { getProperties } from "@/actions/property-actions";
import { getCustomers } from "@/actions/customer-actions";
import BookingsClient from "./BookingsClient";
export const metadata = { title: "Bookings — Mulk" };
export default async function BookingsPage() {
  const [bookings, properties, customers] = await Promise.all([
    getBookings(), getProperties(), getCustomers(),
  ]);
  return <main><BookingsClient initialBookings={bookings} properties={properties} customers={customers} /></main>;
}

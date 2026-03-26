import { getBookingById } from "@/actions/booking-actions";
import { notFound } from "next/navigation";
import BookingDetailClient from "./BookingDetailClient";

export const metadata = {
  title: "Booking Details | Dastan",
};

export default async function BookingDetailPage({ params }) {
  const { id } = await params;
  
  if (!id) notFound();

  const booking = await getBookingById(id);

  if (!booking) {
    notFound();
  }

  return (
    <main style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <BookingDetailClient booking={booking} />
    </main>
  );
}

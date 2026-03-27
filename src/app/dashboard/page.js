import { getDashboardAnalytics } from "@/actions/analytics-actions";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dastan Dashboard" };

export default async function DashboardPage() {
  const analytics = await getDashboardAnalytics();

  return (
    <main style={{ backgroundColor: "transparent", minHeight: "100vh" }}>
      <DashboardClient data={analytics} />
    </main>
  );
}

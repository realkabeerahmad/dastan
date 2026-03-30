import { getDashboardAnalytics } from "@/actions/analytics-actions";
import DashboardClient from "./DashboardClient";
/* FIX: metadata title was "Dastan Dashboard" — standardised to "Mulk" */
export const metadata = { title: "Dashboard — Mulk" };
export default async function DashboardPage() {
  const analytics = await getDashboardAnalytics();
  return <main><DashboardClient data={analytics} /></main>;
}

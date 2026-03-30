import { getProperties } from "@/actions/property-actions";
import ManagePropertiesClient from "./ManagePropertiesClient";
/* FIX: title was "Manage Properties | Dastan" — standardised to "Mulk" */
export const metadata = { title: "Properties — Mulk" };
export default async function PropertiesPage() {
  const properties = await getProperties();
  return <main><ManagePropertiesClient initialProperties={properties} /></main>;
}

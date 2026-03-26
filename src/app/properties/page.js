import { getProperties } from "@/actions/property-actions";
import ManagePropertiesClient from "./ManagePropertiesClient";

export const metadata = {
  title: "Manage Properties | Dastan",
  description: "Manage your real estate properties and related financial accounts.",
};

export default async function PropertiesPage() {
  const properties = await getProperties();

  return (
    <main style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <ManagePropertiesClient initialProperties={properties} />
    </main>
  );
}

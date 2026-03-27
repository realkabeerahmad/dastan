import RegisterClient from "./RegisterClient";

export const metadata = { title: "Create Your Dastan Account" };

export default function RegisterPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
      <RegisterClient />
    </main>
  );
}

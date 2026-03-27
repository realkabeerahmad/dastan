import RegisterClient from "./RegisterClient";

export const metadata = { title: "Create Your Mulk Account" };

export default function RegisterPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "transparent" }}>
      <RegisterClient />
    </main>
  );
}

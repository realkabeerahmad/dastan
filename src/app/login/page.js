import LoginClient from "./LoginClient";

export const metadata = { title: "Sign In — Dastan" };

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
      <LoginClient />
    </main>
  );
}

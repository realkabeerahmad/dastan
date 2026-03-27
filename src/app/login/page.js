import LoginClient from "./LoginClient";

export const metadata = { title: "Sign In — Mulk" };

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "transparent" }}>
      <LoginClient />
    </main>
  );
}

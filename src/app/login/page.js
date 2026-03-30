import LoginClient from "./LoginClient";

export const metadata = { title: "Sign In — Mulk" };

/* FIX: removed inline style={{ minHeight:"100vh", backgroundColor:"transparent" }}
   The body already has min-height:100% from globals.css. The transparent bg is
   the default. Repeating it as an inline style on every page is both redundant
   and a maintenance hazard (if the bg ever changes, all pages need updating). */
export default function LoginPage() {
  return (
    <main>
      <LoginClient />
    </main>
  );
}

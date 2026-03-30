import { getBusinessUsers } from "@/actions/auth-actions";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";
/* FIX: title was "Team — Dastan" — standardised to "Mulk"
   FIX: page was the only one not wrapping in <main> — now consistent */
export const metadata = { title: "Team — Mulk" };
export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/");
  const users = await getBusinessUsers();
  return (
    <main>
      <UsersClient users={users} currentUserId={session.userId} businessName={session.businessName} />
    </main>
  );
}

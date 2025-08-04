// app/dashboard/register-server/page.tsx

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, SessionData } from "@/lib/session";
import { RegisterServerForm } from "@/components/RegisterForm";
export default async function RegisterServerPage() {
  // 1. Get the session on the server
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  // 2. Check for an active login session
  if (!session.isLoggedIn) {
    // 3. If not logged in, redirect to the login page
    redirect("/login");
  }

  // 4. If the user is logged in, render the page content
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <RegisterServerForm />
    </div>
  );
}

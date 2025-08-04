// Create this file at: app/dashboard/page.tsx

import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, SessionData } from "@/lib/session";
import { ChatInterface } from "@/components/ChatInterface"; // Adjust path as needed

/**
 * This is the main dashboard page for logged-in users.
 * It's a protected route that renders the main chat interface.
 */
export default async function DashboardPage() {
  // 1. Get the user's session on the server.
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  // 2. Check for an active login session.
  if (!session.isLoggedIn) {
    // 3. If the user is not logged in, redirect them to the login page.
    redirect("/login");
  }

  // 4. If the user is logged in, render the dashboard content.
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">
          Welcome to the Marketplace
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          This is your central hub for interacting with AI-powered services.
        </p>
      </div>

      {/* The main chat interface is rendered here */}
      <ChatInterface />
    </div>
  );
}

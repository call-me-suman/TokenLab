// app/dashboard/page.tsx
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, SessionData } from "@/lib/session";
import { ChatInterface } from "@/components/ChatInterface";
import Link from "next/link";
import { Suspense } from "react";

interface McpServer {
  _id: string;
  name: string;
  description: string;
  pricePerQuery: number;
  keywords: string[];
}

/**
 * Fetches available services for the sidebar
 */
async function getAvailableServices(): Promise<McpServer[]> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/marketplace/server-list`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch services");
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching services for dashboard:", error);
    return [];
  }
}

/**
 * Dashboard header component
 */
function DashboardHeader({ userName }: { userName?: string }) {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4"></div>
    </header>
  );
}

/**
 * Service selector sidebar
 */
function ServiceSidebar({
  services,
  selectedService,
}: {
  services: McpServer[];
  selectedService?: string;
}) {
  if (services.length === 0) {
    return (
      <div className="w-80 bg-gray-800/30 backdrop-blur-sm border-r border-gray-700/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">AI Services</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <p className="text-gray-400 text-sm mb-4">No services available</p>
          <Link
            href="/marketplace"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Browse Marketplace →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800/30 backdrop-blur-sm border-r border-gray-700/50 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">AI Services</h2>
        <Link
          href="/marketplace"
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          Browse All
        </Link>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <Link
            key={service._id}
            href={`/dashboard?service=${service._id}`}
            className={`block p-4 rounded-lg transition-all duration-200 ${
              selectedService === service._id
                ? "bg-blue-600/20 border border-blue-500/30"
                : "bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3
                className={`font-medium ${
                  selectedService === service._id
                    ? "text-blue-300"
                    : "text-white"
                }`}
              >
                {service.name}
              </h3>
              <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                {service.pricePerQuery} credits
              </span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-2 mb-2">
              {service.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {service.keywords.slice(0, 3).map((keyword) => (
                <span
                  key={keyword}
                  className="text-xs px-2 py-1 rounded-full bg-gray-600/50 text-gray-300"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <Link
          href="/marketplace/register"
          className="flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 text-sm font-medium"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Register Your Service
        </Link>
      </div>
    </div>
  );
}

/**
 * Enhanced chat interface wrapper with service context
 */
function EnhancedChatInterface({
  selectedService,
  services,
}: {
  selectedService?: string;
  services: McpServer[];
}) {
  const currentService = selectedService
    ? services.find((s) => s._id === selectedService)
    : null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat interface */}
      <div className="flex-1">
        <ChatInterface />
      </div>
    </div>
  );
}

/**
 * Dashboard content component
 */
async function DashboardContent({
  selectedService,
  userName,
}: {
  selectedService?: string;
  userName?: string;
}) {
  const services = await getAvailableServices();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background decoration */}
      <div className='absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%23374151\\" fill-opacity=\\"0.05\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"/&gt;%3C/g%3E%3C/g%3E%3C/svg%3E")] opacity-20'></div>

      <div className="relative z-10">
        <DashboardHeader userName={userName} />

        <div className="flex h-[calc(100vh-80px)]">
          <ServiceSidebar
            services={services}
            selectedService={selectedService}
          />
          <EnhancedChatInterface
            selectedService={selectedService}
            services={services}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * This is the main dashboard page for logged-in users.
 * It's a protected route that renders the main chat interface with service integration.
 */
export default async function DashboardPage(props: {
  searchParams: Promise<{ service?: string }>;
}) {
  // 1. Get the user's session on the server.
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  // 2. Check for an active login session.
  if (!session.isLoggedIn) {
    // 3. If the user is not logged in, redirect them to the login page.
    redirect("/login?redirect=/dashboard");
  }

  // 4. Properly await searchParams before accessing properties
  const searchParams = await props.searchParams;
  const selectedService = searchParams?.service;

  // 5. If the user is logged in, render the dashboard content.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-white">Loading dashboard...</div>
        </div>
      }
    >
      <DashboardContent
        selectedService={selectedService}
        userName={session.userId}
      />
    </Suspense>
  );
}

// app/marketplace/page.tsx
import Link from "next/link";
import { Suspense } from "react";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

// Define a type for the server data we expect from the API
interface McpServer {
  _id: string;
  name: string;
  description: string;
  pricePerQuery: number;
  keywords: string[];
}

/**
 * Fetches server data from our backend API.
 * This is a server-side fetch for fast page loads.
 */
async function getServers(): Promise<McpServer[]> {
  try {
    // Determine the base URL for fetching
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/marketplace/server-list`, {
      // Force no caching for immediate updates
      cache: "no-store",
      // Alternative: Use shorter revalidation for ISR
      // next: { revalidate: 5 },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch servers");
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching servers for marketplace page:", error);
    return []; // Return an empty array on error
  }
}

/**
 * Loading skeleton component
 */
function MarketplaceSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded mb-4 w-3/4"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-gray-700 rounded-full w-16"></div>
            <div className="h-6 bg-gray-700 rounded-full w-20"></div>
          </div>
          <div className="h-10 bg-gray-700 rounded mt-6"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Server card component with enhanced UX
 */
function ServerCard({
  server,
  isLoggedIn,
}: {
  server: McpServer;
  isLoggedIn: boolean;
}) {
  return (
    <div className="group bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-blue-500/10 hover:shadow-2xl hover:-translate-y-1">
      <div className="flex flex-col h-full">
        <div className="flex-grow">
          <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors duration-300">
            {server.name}
          </h2>
          <p className="text-gray-300 mb-4 leading-relaxed line-clamp-3">
            {server.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {server.keywords.map((kw, index) => (
              <span
                key={kw}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-300 ${
                  index % 3 === 0
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : index % 3 === 1
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="text-left">
              <p className="text-2xl font-bold text-white">
                {server.pricePerQuery}
              </p>
              <p className="text-sm text-gray-400">Credits / query</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </div>

          {isLoggedIn ? (
            <Link href={`/dashboard?service=${server._id}`}>
              <span className="block w-full text-center py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
                Try in Chat
              </span>
            </Link>
          ) : (
            <Link href="/login?redirect=/marketplace">
              <span className="block w-full text-center py-3 px-6 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg font-semibold hover:from-gray-700 hover:to-gray-800 transform hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
                Login to Use
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Main marketplace content component
 */
async function MarketplaceContent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const servers = await getServers();

  if (servers.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-gray-700 to-gray-800 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-white mb-2">
          No Services Available
        </h3>
        <p className="text-gray-400 max-w-md mx-auto mb-6">
          The marketplace is currently empty. New AI services will appear here
          as they become available.
        </p>
        <Link href="/marketplace/register">
          <span className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 cursor-pointer">
            Register Your Service
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {servers.map((server) => (
        <ServerCard key={server._id} server={server} isLoggedIn={isLoggedIn} />
      ))}
    </div>
  );
}

/**
 * Navigation header component
 */

/**
 * The main marketplace page that displays all available AI services.
 */
export default async function MarketplacePage() {
  // Check if user is logged in
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  const isLoggedIn = session.isLoggedIn || false;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Background decoration */}
        <div className='absolute inset-0 bg-[url(&apos;data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23374151" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/&gt;%3C/g%3E%3C/g%3E%3C/svg%3E&apos;)] opacity-20'></div>

        <div className="relative z-10 container mx-auto py-8">
          {/* Navigation Header */}
          {/* <MarketplaceHeader isLoggedIn={isLoggedIn} /> */}

          {/* Main Content */}
          <div className="px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-6">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-4">
                AI Marketplace
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
                Discover and integrate cutting-edge AI services from our
                community of developers. Power your applications with
                intelligent capabilities.
              </p>

              {isLoggedIn && (
                <div className="flex justify-center space-x-4">
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                  >
                    Go to Chat Dashboard
                  </Link>
                  <Link
                    href="/marketplace/register"
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-300"
                  >
                    List Your Service
                  </Link>
                </div>
              )}
            </div>

            {/* Services Grid */}
            <Suspense fallback={<MarketplaceSkeleton />}>
              <MarketplaceContent isLoggedIn={isLoggedIn} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

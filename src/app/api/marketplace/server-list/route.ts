// app/api/marketplace/server-list/route.ts
import { NextResponse } from "next/server";
import { getMcpServers } from "@/lib/mongodb";

/**
 * Fetches a list of all active MCP servers to display on the marketplace.
 * This is a public endpoint and does not require authentication.
 */
export async function GET() {
  try {
    const servers = await getMcpServers();

    // Add cache headers to ensure fresh data
    const response = NextResponse.json(servers);

    // Disable caching to ensure real-time updates
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("[List Servers Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch marketplace services." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}

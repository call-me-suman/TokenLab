import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { getMcpServerById } from "@/lib/mongodb"; // You'll need this to get server details

// Define the expected structure of the response from our Cloudflare Worker AI router.
interface AiRouterResponse {
  serverId: string;
}

/**
 * This endpoint only PREPARES the request - it finds the right server and returns
 * confirmation details. The actual execution happens in /api/mcp/[serverId]
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the request using iron-session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate the incoming prompt
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string." },
        { status: 400 }
      );
    }

    // 3. Call the external Intelligent Router (Cloudflare Worker)
    const routerWorkerUrl = process.env.ROUTER_WORKER_URL;
    if (!routerWorkerUrl) {
      console.error("ROUTER_WORKER_URL environment variable is not set.");
      return NextResponse.json(
        { error: "Application is not configured correctly." },
        { status: 500 }
      );
    }

    console.log(
      `[Router] Calling Cloudflare AI Worker with prompt: "${prompt}"`
    );
    const routerResponse = await fetch(routerWorkerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!routerResponse.ok) {
      const errorBody = await routerResponse.json();
      console.error("Error from AI Router Worker:", errorBody);
      return NextResponse.json(
        {
          error: "The AI router failed to process the request.",
          details: errorBody,
        },
        { status: routerResponse.status }
      );
    }

    const { serverId } = (await routerResponse.json()) as AiRouterResponse;
    console.log(`[Router] AI Worker selected server: ${serverId}`);

    // 4. Get server details from database for confirmation
    const mcpServer = await getMcpServerById(serverId);

    if (!mcpServer) {
      console.error(`Unknown serverId received from router: ${serverId}`);
      return NextResponse.json(
        { error: `The router returned an unknown service ID: ${serverId}` },
        { status: 400 }
      );
    }

    // 5. Return server details for user confirmation (NOT execute the request)
    return NextResponse.json({
      serverId: serverId,
      name: mcpServer.name,
      price: mcpServer.pricePerQuery,
      description: mcpServer.description || `${mcpServer.name} service`,
    });
  } catch (error) {
    console.error("[Chat Router Error]", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

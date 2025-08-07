// Create this new file at: app/api/chat/prepare/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { getMcpServers } from "@/lib/mongodb";

/**
 * This endpoint prepares a query by finding the best MCP server for a given prompt.
 * It returns the server's details for user confirmation without executing or charging.
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

    // 3. Find the best server using keyword matching
    console.log(`[Prepare] Received prompt: "${prompt}"`);
    const allServers = await getMcpServers();

    const lowerCasePrompt = prompt.toLowerCase();

    console.log(allServers);

    const targetServer = allServers.find((server) =>
      server.keywords.some((keyword: string) =>
        lowerCasePrompt.includes(keyword.toLowerCase())
      )
    );

    if (!targetServer) {
      console.log(`[Prepare] No server found for prompt.`);
      return NextResponse.json(
        { error: "Sorry, no service can handle that request." },
        { status: 404 }
      );
    }

    console.log(`[Prepare] Matched prompt to server: ${targetServer.name}`);

    // 4. Return the server's details for confirmation
    // We only send the necessary information to the frontend.
    return NextResponse.json({
      serverId: targetServer._id.toString(),
      name: targetServer.name,
      description: targetServer.description,
      price: targetServer.pricePerQuery,
    });
  } catch (error) {
    console.error("[Prepare API Error]", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

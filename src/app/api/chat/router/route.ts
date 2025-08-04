// import { NextRequest, NextResponse } from "next/server";
// import { getIronSession } from "iron-session";
// import { cookies } from "next/headers";
// import { sessionOptions, SessionData } from "@/lib/session"; // Your session management config
// import { getMcpServers } from "@/lib/mongodb"; // Your DB utility to fetch all servers

// /**
//  * This is the "brain" of the application. It receives a user's prompt
//  * and intelligently routes it to the correct internal MCP server proxy.
//  */
// export async function POST(req: NextRequest) {
//   try {
//     // 1. Authenticate the request using iron-session
//     const session = await getIronSession<SessionData>(
//       await cookies(),
//       sessionOptions
//     );
//     if (!session.isLoggedIn || !session.userId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // 2. Validate the incoming prompt
//     const { prompt } = await req.json();
//     if (!prompt || typeof prompt !== "string") {
//       return NextResponse.json(
//         { error: "Prompt is required and must be a string." },
//         { status: 400 }
//       );
//     }

//     // 3. Find the best server (Intelligent Routing Logic)
//     console.log(`[Router] Received prompt: "${prompt}"`);
//     const allServers = await getMcpServers();

//     // Convert prompt to lowercase for case-insensitive matching
//     const lowerCasePrompt = prompt.toLowerCase();

//     const targetServer = allServers.find((server) =>
//       server.keywords.some((keyword: string) =>
//         lowerCasePrompt.includes(keyword.toLowerCase())
//       )
//     );

//     if (!targetServer) {
//       console.log(`[Router] No server found for prompt.`);
//       return NextResponse.json(
//         {
//           error: "Sorry, I don't have a service that can handle that request.",
//         },
//         { status: 404 }
//       );
//     }

//     const serverId = targetServer._id.toString();
//     console.log(
//       `[Router] Matched prompt to server: ${targetServer.name} (ID: ${serverId})`
//     );

//     // 4. Make an INTERNAL call to the Proxy API
//     // This triggers the payment middleware and forwards the request.
//     // The session cookie is automatically forwarded on server-to-server requests.
//     const internalProxyUrl = new URL(
//       `/api/mcp/${serverId}`,
//       req.url
//     ).toString();

//     const proxyResponse = await fetch(internalProxyUrl, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         // We forward the cookies from the original request so the proxy can read the session
//         Cookie: req.headers.get("Cookie") || "",
//       },
//       body: JSON.stringify({ prompt }), // Forward the original prompt
//     });

//     // 5. Stream the final response back to the user
//     // The proxyResponse could be JSON, an image, audio, etc.
//     // We get the raw response body and headers and forward them directly.
//     const responseHeaders = new Headers(proxyResponse.headers);
//     const responseBody = proxyResponse.body;

//     return new NextResponse(responseBody, {
//       status: proxyResponse.status,
//       statusText: proxyResponse.statusText,
//       headers: responseHeaders,
//     });
//   } catch (error) {
//     console.error("[Chat Router Error]", error);
//     return NextResponse.json(
//       { error: "An internal server error occurred." },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session"; // Your session management config

// Define the expected structure of the response from our Cloudflare Worker AI router.
interface AiRouterResponse {
  serverId: string;
}

// A map to dispatch requests to the correct internal "seller" API.
const serviceMap = new Map<string, string>();
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

// Populate the service map with the full internal URLs
serviceMap.set("image-generator", `${baseUrl}/api/sellers/image-generator`);
serviceMap.set("text-summarizer", `${baseUrl}/api/sellers/text-summarizer`);
// Add other seller services here as you create them...

/**
 * This is the "orchestrator" of the application. It receives a user's prompt,
 * calls the external AI "brain" (Cloudflare Worker) to get a decision,
 * and then routes the request to the correct internal MCP server proxy.
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

    // 4. Dispatch the request to the correct internal seller API.
    const sellerApiUrl = serviceMap.get(serverId);

    if (!sellerApiUrl) {
      console.error(`Unknown serverId received from router: ${serverId}`);
      return NextResponse.json(
        { error: `The router returned an unknown service ID: ${serverId}` },
        { status: 400 }
      );
    }

    // 5. Make an INTERNAL call to the Proxy API
    const internalProxyUrl = new URL(
      `/api/mcp/${serverId}`,
      req.url
    ).toString();

    const proxyResponse = await fetch(internalProxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.get("Cookie") || "",
      },
      body: JSON.stringify({ prompt }),
    });

    // 6. Stream the final response back to the user
    const responseHeaders = new Headers(proxyResponse.headers);
    const responseBody = proxyResponse.body;

    return new NextResponse(responseBody, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Chat Router Error]", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

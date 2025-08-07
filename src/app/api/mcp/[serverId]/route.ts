import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import {
  getMcpServerById,
  deductUserBalance,
  incrementSellerUnpaidBalance,
  createTransaction,
} from "@/lib/mongodb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  try {
    // --- Step 1: Authentication (Middleware Part 1) ---
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

    // --- Step 2: Get Server Details ---
    const { serverId } = await params;
    const mcpServer = await getMcpServerById(serverId);

    if (!mcpServer) {
      return NextResponse.json(
        { error: "The requested MCP server does not exist." },
        { status: 404 }
      );
    }

    const price = mcpServer.pricePerQuery;

    // --- Step 3: Payment Deduction (Middleware Part 2) ---
    const updatedUserAccount = await deductUserBalance(userId, price);
    console.log("User account", updatedUserAccount, userId);

    if (!updatedUserAccount) {
      // This means the user had insufficient funds.
      return NextResponse.json(
        { error: "Payment Required: Insufficient balance." },
        { status: 402 }
      );
    }
    console.log(
      `[Payment] Deducted ${price} from user ${userId}. New balance: ${updatedUserAccount.account.balance}`
    );

    // --- Step 4: Log Transaction & Credit Seller (Post-Payment Logic) ---
    // These actions happen after a successful payment.
    await incrementSellerUnpaidBalance(serverId, price);
    await createTransaction({
      serverId: serverId,
      sellerId: mcpServer.ownerId.toString(),
      buyerId: userId,
      amount: price,
    });
    console.log(
      `[Payment] Credited ${price} to seller ${mcpServer.ownerId.toString()}`
    );

    // --- Step 5: Forward (Proxy) the Request to the Seller ---
    const { prompt } = await req.json();
    console.log(
      `[Proxy] Forwarding prompt to seller endpoint: ${mcpServer.endpointUrl}`
    );

    const sellerResponse = await fetch(mcpServer.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optional: Add marketplace signature for security
        "X-Marketplace-Request": "true",
        "X-User-Id": userId, // Pass user ID to seller if needed
      },
      body: JSON.stringify({ prompt }),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    // --- Step 6: Handle Different Response Types ---

    // Check if the seller's endpoint is reachable
    if (!sellerResponse.ok && sellerResponse.status >= 500) {
      console.error(`[Proxy] Seller endpoint error: ${sellerResponse.status}`);
      return NextResponse.json(
        { error: "The MCP server is currently unavailable." },
        { status: 503 }
      );
    }

    // --- Step 7: Stream Response Back to User ---
    // Copy headers but filter out problematic ones
    const responseHeaders = new Headers();

    // Copy safe headers
    const safeHeaders = [
      "content-type",
      "content-length",
      "content-disposition",
      "cache-control",
      "expires",
      "last-modified",
      "etag",
    ];

    safeHeaders.forEach((header) => {
      const value = sellerResponse.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    });

    // Add CORS headers if needed
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    const responseBody = sellerResponse.body;

    return new NextResponse(responseBody, {
      status: sellerResponse.status,
      statusText: sellerResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[MCP Proxy Error]", error);

    // Handle timeout specifically
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Request timeout: The MCP server took too long to respond." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

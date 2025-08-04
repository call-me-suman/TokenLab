// 2. THE PROXY API AND PAYMENT MIDDLEWARE
// Create this new file.
// Path: app/api/mcp/[serverId]/route.ts
// ========================================================================

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
  { params }: { params: { serverId: string } }
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
    const serverId = params.serverId;
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
        // You could add a secret header here to prove the request came from your marketplace
        // 'X-Marketplace-Signature': '...'
      },
      body: JSON.stringify({ prompt }),
    });

    // --- Step 6: Stream Response Back to User ---
    // Efficiently pipe the seller's response (JSON, image, audio, etc.) back to the original user.
    const responseHeaders = new Headers(sellerResponse.headers);
    const responseBody = sellerResponse.body;

    return new NextResponse(responseBody, {
      status: sellerResponse.status,
      statusText: sellerResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[MCP Proxy Error]", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

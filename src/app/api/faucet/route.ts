// Path: app/api/faucet/fund/route.ts

import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { createWalletClient, http, createPublicClient, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hyperionTestnet } from "@/lib/config"; // Your custom chain definition
import { hypnTokenAbi } from "@/lib/abi"; // Your HYPN token's ABI
import { sessionOptions, SessionData } from "@/lib/session";

// The fixed amount of HYPN to send with each click (e.g., 10 tokens)
// Using parseEther is a robust way to handle token decimals.
const FUNDING_AMOUNT = parseEther("10");

export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  try {
    // 1. Authentication Check: Ensure only logged-in users can use the faucet.
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 }
      );
    }

    // 2. --- DATABASE LOGIC for Rate Limiting ---
    // This is crucial to prevent a single user from draining your faucet wallet.
    /*
    const user = await db.user.findUnique({ where: { id: session.userId } });
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (user?.lastFundedAt && (now - new Date(user.lastFundedAt).getTime() < oneHour)) {
      return NextResponse.json(
        { error: 'You can only receive funds once per hour.' },
        { status: 429 } // 429 Too Many Requests
      );
    }
    */
    const userWalletAddress = session.siwe?.address;
    if (!userWalletAddress) {
      return NextResponse.json(
        { error: "User wallet address not found in session." },
        { status: 400 }
      );
    }

    // 3. Initialize the Faucet Wallet on the backend
    // The private key is securely read from environment variables on the server.
    const faucetAccount = privateKeyToAccount(
      process.env.FAUCET_WALLET_PRIVATE_KEY as `0x${string}`
    );

    const walletClient = createWalletClient({
      account: faucetAccount,
      chain: hyperionTestnet,
      transport: http(process.env.HYPERION_RPC_URL), // Use RPC URL from .env
    });

    const publicClient = createPublicClient({
      chain: hyperionTestnet,
      transport: http(process.env.HYPERION_RPC_URL),
    });

    // 4. Execute the token transfer
    console.log(
      `Attempting to send ${FUNDING_AMOUNT} HYPN to ${userWalletAddress}`
    );

    const { request } = await publicClient.simulateContract({
      account: faucetAccount,
      address: process.env.HYPN_TOKEN_CONTRACT_ADDRESS as `0x${string}`,
      abi: hypnTokenAbi,
      functionName: "transfer",
      args: [userWalletAddress, FUNDING_AMOUNT],
    });

    const txHash = await walletClient.writeContract(request);
    console.log(`Faucet transaction sent. Hash: ${txHash}`);

    // 5. --- DATABASE LOGIC to Update Rate Limit Timestamp ---
    // After a successful transaction, update the user's record.
    /*
    await db.user.update({
      where: { id: session.userId },
      data: { lastFundedAt: new Date() },
    });
    */

    // 6. Return a success message and the transaction hash
    return NextResponse.json({
      message: "10 HYPN sent successfully!",
      txHash: txHash,
    });
  } catch (error: any) {
    console.error("Faucet Error:", error);
    const errorMessage = error.message || "An internal server error occurred.";
    return NextResponse.json(
      { error: `Failed to send funds: ${errorMessage}` },
      { status: 500 }
    );
  }
}

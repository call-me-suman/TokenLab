import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers"; // Import the cookies function
import { SiweMessage } from "siwe";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: Request) {
  // Get the session from the request's cookies.
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  try {
    const { message, signature } = await req.json();

    const siweMessage = new SiweMessage(message);

    // Use SIWE's utility to verify the signature.
    // It will check the signature, domain, and other fields.
    const { data: fields } = await siweMessage.verify({
      signature,
      nonce: session.nonce, // CRITICAL: Compare against the nonce we stored in the session
    });

    // Explicitly check that the nonce matches the one in our session.
    if (fields.nonce !== session.nonce) {
      return NextResponse.json({ message: "Invalid nonce." }, { status: 422 });
    }

    // --- DATABASE LOGIC ---
    // The user's identity is now confirmed. Find or create them in your database.
    const userWalletAddress = fields.address;
    /*
    let user = await db.user.findUnique({ where: { walletAddress: userWalletAddress } });
    if (!user) {
      user = await db.user.create({ data: { walletAddress: userWalletAddress } });
    }
    const userId = user.id;
    */

    // Update the session to mark the user as authenticated.
    session.isLoggedIn = true;
    session.siwe = fields;
    // session.userId = userId; // Store the user's database ID
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verification failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

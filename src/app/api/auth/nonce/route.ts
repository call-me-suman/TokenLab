// app/api/auth/nonce/route.ts

import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { generateNonce } from "siwe";
import { sessionOptions, SessionData } from "../../../../lib/session";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // Create user session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    // Generate secure random nonce (from SIWE package)
    const nonce = generateNonce();

    // Store nonce in session for future verification
    session.nonce = nonce;
    await session.save();

    // Return nonce to frontend
    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Nonce generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate nonce" },
      { status: 500 }
    );
  }
}

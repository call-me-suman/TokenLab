// Path: app/api/auth/verify/route.ts

import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SiweMessage } from "siwe";
import { sessionOptions, SessionData } from "@/lib/session";
import { findOrCreateUser } from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  try {
    // Input validation
    const body = await req.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { ok: false, error: "Missing message or signature" },
        { status: 400 }
      );
    }

    // Check if nonce exists in session
    if (!session.nonce) {
      return NextResponse.json(
        {
          ok: false,
          error: "No nonce found in session. Please get a new nonce.",
        },
        { status: 400 }
      );
    }

    // Verify JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable is not set");
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const siweMessage = new SiweMessage(message);

    // Use SIWE's utility to verify the signature
    const { data: fields } = await siweMessage.verify({
      signature,
      nonce: session.nonce,
    });

    // Explicitly check that the nonce matches the one in our session
    if (fields.nonce !== session.nonce) {
      return NextResponse.json(
        { ok: false, error: "Invalid nonce" },
        { status: 422 }
      );
    }

    // Optional: Check message expiration and not-before times
    const now = new Date();
    if (fields.expirationTime && new Date(fields.expirationTime) < now) {
      return NextResponse.json(
        { ok: false, error: "Message has expired" },
        { status: 422 }
      );
    }

    if (fields.notBefore && new Date(fields.notBefore) > now) {
      return NextResponse.json(
        { ok: false, error: "Message is not yet valid" },
        { status: 422 }
      );
    }

    // --- DATABASE LOGIC ---
    // The user's identity is now confirmed. Find or create them in your database.
    let user;
    try {
      console.log(`Attempting to find or create user: ${fields.address}`);
      user = await findOrCreateUser(fields.address);
      console.log("findOrCreateUser result:", user);

      if (!user) {
        console.error(
          `findOrCreateUser returned null for address: ${fields.address}`
        );
        throw new Error("Could not find or create user in the database.");
      }
    } catch (dbError) {
      console.error("Database error in findOrCreateUser:", dbError);
      throw new Error("Database connection failed. Please try again.");
    }

    const userId = user._id.toString();

    // --- JWT CREATION ---
    const token = jwt.sign(
      { userId: userId, address: fields.address },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" } // Token expires in 1 day
    );

    // Update the session to mark the user as authenticated.
    session.isLoggedIn = true;
    session.siwe = fields;
    session.userId = userId; // Store the user's database ID in the session
    await session.save();

    // Return the token along with the success message
    return NextResponse.json({ ok: true, token: token });
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

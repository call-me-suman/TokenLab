// Create this file at: app/api/user/balance/route.ts

import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { findOrCreateUser } from "@/lib/mongodb";

export async function GET() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn || !session.siwe) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // We use findOrCreateUser which safely gets the user document
    const user = await findOrCreateUser(session.siwe.address);
    if (!user || !user.account) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    // Return the balance, formatted to a number
    return NextResponse.json({ balance: Number(user.account.balance) });
  } catch (error) {
    console.error("[Get Balance Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

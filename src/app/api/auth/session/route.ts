import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { SiweMessage } from "siwe";

// export interface SessionData {
//   nonce?: string;
//   siwe?: SiweMessage;
//   userId?: string; // This will hold the user's ID from your MongoDB database
//   isLoggedIn: boolean;
// }

export async function GET(req: Request) {
  const session = await getIronSession<SessionData>(
    req,
    NextResponse.next(),
    sessionOptions
  );
  console.log(session);

  if (session.isLoggedIn === true && session.siwe) {
    return NextResponse.json({
      isLoggedIn: true,
      address: session.siwe.address,
      chainId: session.siwe.chainId,
    });
  }

  return NextResponse.json({
    isLoggedIn: false,
  });
}

// Create this file at: app/api/marketplace/servers/route.ts

import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { createMcpServer } from "@/lib/mongodb"; // Import your new DB utility
import { SiweMessage } from "siwe";

// export interface SessionData {
//   nonce?: string;
//   siwe?: SiweMessage;
//   userId?: string; // This will hold the user's ID from your MongoDB database
//   isLoggedIn: boolean;
// }
export async function POST(req: Request) {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  try {
    // 1. Authentication Check: Ensure a user is logged in.
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to register a server." },
        { status: 401 }
      );
    }

    // 2. Parse and Validate Incoming Data
    const body = await req.json();
    const {
      name,
      description,
      keywords,
      endpointUrl,
      pricePerQuery,
      payoutAddress,
    } = body;

    // Basic validation to ensure required fields are present
    if (
      !name ||
      !description ||
      !keywords ||
      !endpointUrl ||
      !pricePerQuery ||
      !payoutAddress
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // More specific validation can be added here (e.g., check if URL is valid)

    // 3. Prepare Data for Database
    // The ownerId comes securely from the user's session, not from the request body.
    const serverData = {
      ownerId: session.userId,
      name,
      description,
      keywords,
      endpointUrl,
      pricePerQuery: Number(pricePerQuery), // Ensure price is a number
      payoutAddress,
    };

    // 4. Call the Database Utility Function
    // This uses the function you created and tested to save the data.
    const newServer = await createMcpServer(serverData);

    try {
      const workerurl = process.env.ROUTER_WORKER_URL;
      const admintoken = process.env.CLOUDFLARE_ADMIN_TOKEN;

      if (workerurl && admintoken) {
        const serverIdSlug = newServer.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

        console.log(
          "Syncing this server with the our intelligent router system ",
          serverIdSlug
        );

        // const name = newServer.name.replace(/ /g, "-");
        const workerPayload = {
          id: newServer._id,
          name: serverIdSlug, // The unique ID from our database
          description: newServer.description, // The description for the AI to analyze
          enabled: true,
          category: newServer.keywords[0] || "general", // You can enhance this later
        };
        const syncResponse = await fetch(`${workerurl}/admin/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${admintoken}`,
          },
          body: JSON.stringify(workerPayload),
        });
        if (!syncResponse.ok) {
          // Log an error if the sync fails, but don't fail the whole request
          const errorBody = await syncResponse.text();
          console.error(
            `[Sync Error] Failed to update Cloudflare Worker. Status: ${syncResponse.status}. Body: ${errorBody}`
          );
        } else {
          console.log(
            `[Sync Success] Cloudflare AI Router updated successfully.`
          );
        }
      }
    } catch (syncError) {
      console.error(
        "[Sync Error] An exception occurred while trying to update the Cloudflare Worker:",
        syncError
      );
    }
    // 5. Return a Success Response
    // Send back the newly created server data.
    return NextResponse.json(newServer, { status: 201 }); // 201 Created
  } catch (error) {
    console.error("Failed to create MCP server:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

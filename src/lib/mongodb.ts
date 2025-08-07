import dotenv from "dotenv";
dotenv.config(); // Load env vars first
// Create this file at: lib/mongodb.ts

import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";
import { formatUnits } from "viem";

// --- Configuration ---
const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = "mcp-marketplace"; // Your database name

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// --- Singleton Client ---
// This pattern prevents multiple connections to the database during development hot-reloads.
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Extend globalThis to include _mongoClientPromise for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(MONGODB_URI, { serverApi: ServerApiVersion.v1 });
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(MONGODB_URI, { serverApi: ServerApiVersion.v1 });
    clientPromise = client.connect();
  }
  return clientPromise;
}

// --- User & Account Functions ---

/**
 * Finds a user by their wallet address, creating them if they do not exist.
 * This is useful for the authentication flow.
 * @param walletAddress The user's EVM wallet address.
 * @returns The user document from the database.
 */
export async function findOrCreateUser(walletAddress: string) {
  const mongoClient = await getMongoClient();
  const usersCollection = mongoClient.db(DB_NAME).collection("users");

  console.log(
    `[DB] Attempting to find or create user: ${walletAddress.toLowerCase()}`
  );

  // First, try to find the user
  let user = await usersCollection.findOne({
    walletAddress: walletAddress.toLowerCase(),
  });

  if (user) {
    console.log(`[DB] User found:`, user);
    return user;
  }

  // If not found, create the user
  console.log(`[DB] User not found, creating new user`);
  const newUserData = {
    walletAddress: walletAddress.toLowerCase(),
    createdAt: new Date(),
    lastFundedAt: null,
    account: {
      balance: 0,
      updatedAt: new Date(),
    },
  };

  try {
    const insertResult = await usersCollection.insertOne(newUserData);
    console.log(`[DB] Insert result:`, insertResult);

    // Return the created user with the new _id
    const createdUser = {
      _id: insertResult.insertedId,
      ...newUserData,
    };

    console.log(`[DB] Created user:`, createdUser);
    return createdUser;
  } catch (insertError) {
    // Handle race condition - another request might have created the user
    console.log(
      `[DB] Insert failed (race condition?), trying to find again:`,
      insertError
    );
    user = await usersCollection.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (user) {
      console.log(`[DB] User found after insert failure:`, user);
      return user;
    }

    console.error(`[DB] Failed to create or find user:`, insertError);
    throw insertError;
  }
}

/**
 * Credits a user's account with a deposit amount from a blockchain transaction.
 * @param userAddress The user's EVM wallet address.
 * @param depositAmount The amount deposited as a BigInt from the blockchain event.
 */
export async function creditUserAccount(
  userAddress: string,
  depositAmount: bigint
) {
  const mongoClient = await getMongoClient();
  const usersCollection = mongoClient.db(DB_NAME).collection("users");
  const amountAsNumber = parseFloat(formatUnits(depositAmount, 18));

  const result = await usersCollection.updateOne(
    { walletAddress: userAddress.toLowerCase() },
    {
      $inc: { "account.balance": amountAsNumber },
      $set: { "account.updatedAt": new Date() },
    }
  );

  if (result.matchedCount === 0) {
    console.error(
      `[DB Error] Attempted to credit non-existent user: ${userAddress}`
    );
  } else {
    console.log(
      `[DB Success] Credited ${amountAsNumber} HYPN to user ${userAddress}`
    );
  }
  return result;
}
/**
 * Deducts an amount from a user's balance for a query.
 * @param userId The user's unique ID from your database.
 * @param amount The amount to deduct.
 * @returns The updated user document or null if balance is insufficient.
 */
export async function deductUserBalance(userId: string, amount: number) {
  const mongoClient = await getMongoClient();
  const usersCollection = mongoClient.db(DB_NAME).collection("users");

  try {
    // Atomically find the user and decrement their balance only if it's sufficient.
    const result = await usersCollection.findOneAndUpdate(
      {
        _id: new ObjectId(userId),
        "account.balance": { $gte: amount },
      },
      {
        $inc: { "account.balance": -amount },
        $set: { "account.updatedAt": new Date() },
      },
      {
        returnDocument: "after",
      }
    );

    // Handle different MongoDB driver versions
    // Older drivers: result.value
    // Newer drivers: result directly contains the document
    const updatedDocument = result?.value || result;

    if (!updatedDocument) {
      // This could mean either:
      // 1. User doesn't exist
      // 2. User has insufficient balance
      // Let's check which one it is for better debugging
      const userExists = await usersCollection.findOne({
        _id: new ObjectId(userId),
      });
      if (!userExists) {
        console.log(`[DEBUG] User ${userId} not found`);
      } else {
        console.log(
          `[DEBUG] User ${userId} has insufficient balance. Current: ${userExists.account?.balance}, Required: ${amount}`
        );
      }
      return null;
    }

    return updatedDocument;
  } catch (error) {
    console.error(
      `[ERROR] Failed to deduct balance for user ${userId}:`,
      error
    );
    return null;
  }
}

// --- MCP Server Functions ---

/**
 * Creates a new MCP Server record for a seller.
 * @param serverData The data for the new server.
 * @returns The newly created server document.
 */
export async function createMcpServer(serverData: {
  ownerId: string;
  name: string;
  description: string;
  keywords: string[];
  endpointUrl: string;
  pricePerQuery: number;
  payoutAddress: string;
}) {
  const mongoClient = await getMongoClient();
  const serversCollection = mongoClient.db(DB_NAME).collection("mcpServers");

  const docToInsert = {
    ...serverData,
    ownerId: new ObjectId(serverData.ownerId),
    unpaidBalance: 0,
    isActive: true,
    createdAt: new Date(),
  };

  const result = await serversCollection.insertOne(docToInsert);
  return { _id: result.insertedId, ...docToInsert };
}

/**
 * Retrieves a list of all active MCP servers.
 * @returns An array of MCP server documents.
 */
export async function getMcpServers() {
  const mongoClient = await getMongoClient();
  const serversCollection = mongoClient.db(DB_NAME).collection("mcpServers");
  return serversCollection.find({ isActive: true }).toArray();
}
export async function getMcpServerById(serverId: string) {
  const mongoClient = await getMongoClient();
  const serversCollection = mongoClient.db(DB_NAME).collection("mcpServers");

  // Ensure the serverId is a valid ObjectId before querying
  if (!ObjectId.isValid(serverId)) {
    return null;
  }

  return serversCollection.findOne({ _id: new ObjectId(serverId) });
}

/**
 * Creates a transaction record after a successful query.
 * @param txData The data for the transaction log.
 * @returns The result of the insert operation.
 */
export async function createTransaction(txData: {
  serverId: string;
  sellerId: string;
  buyerId: string;
  amount: number;
}) {
  const mongoClient = await getMongoClient();
  const transactionsCollection = mongoClient
    .db(DB_NAME)
    .collection("transactions");

  const docToInsert = {
    ...txData,
    serverId: new ObjectId(txData.serverId),
    sellerId: new ObjectId(txData.sellerId),
    buyerId: new ObjectId(txData.buyerId),
    timestamp: new Date(),
  };

  return transactionsCollection.insertOne(docToInsert);
}

/**
 * Updates an existing MCP Server's details.
 * @param serverId The ID of the server to update.
 * @param ownerId The ID of the user attempting the update, for security.
 * @param updateData The fields to update.
 * @returns The updated server document.
 */
export async function updateMcpServer(
  serverId: string,
  ownerId: string,
  updateData: { name?: string; description?: string; pricePerQuery?: number }
) {
  const mongoClient = await getMongoClient();
  const serversCollection = mongoClient.db(DB_NAME).collection("mcpServers");

  const result = await serversCollection.findOneAndUpdate(
    { _id: new ObjectId(serverId), ownerId: new ObjectId(ownerId) }, // Security check: only the owner can update
    { $set: updateData },
    { returnDocument: "after" }
  );

  return result ? result.value : null;
}

/**
 * Increments a seller's unpaid balance after a successful query.
 * @param serverId The ID of the server that was queried.
 * @param amount The amount to add to the unpaid balance.
 */
export async function incrementSellerUnpaidBalance(
  serverId: string,
  amount: number
) {
  const mongoClient = await getMongoClient();
  const serversCollection = mongoClient.db(DB_NAME).collection("mcpServers");

  return serversCollection.updateOne(
    { _id: new ObjectId(serverId) },
    { $inc: { unpaidBalance: amount } }
  );
}

// Create this file at: scripts/listen.ts

import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { hyperionTestnet } from "@/lib/config"; // Your custom chain definition

// --- Configuration ---
// These should be stored securely, e.g., in your .env.local file and loaded here.
const HYPERION_RPC_URL = process.env.HYPERION_RPC_URL;
const HYPN_TOKEN_CONTRACT_ADDRESS = process.env
  .HYPN_TOKEN_CONTRACT_ADDRESS as `0x${string}`;
const MARKETPLACE_TREASURY_WALLET_ADDRESS = process.env
  .MARKETPLACE_TREASURY_WALLET_ADDRESS as `0x${string}`;

if (
  !HYPERION_RPC_URL ||
  !HYPN_TOKEN_CONTRACT_ADDRESS ||
  !MARKETPLACE_TREASURY_WALLET_ADDRESS
) {
  throw new Error(
    "Missing required environment variables for the listener script."
  );
}

// --- Main Listener Logic ---

async function main() {
  console.log("Initializing blockchain listener...");

  // 1. Create a Public Client to connect to the Hyperion Testnet
  const publicClient = createPublicClient({
    chain: hyperionTestnet,
    transport: http(HYPERION_RPC_URL),
  });

  console.log(
    `Listening for HYPN deposits to: ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`
  );

  // 2. Watch for the 'Transfer' event on the HYPN token contract
  publicClient.watchContractEvent({
    address: HYPN_TOKEN_CONTRACT_ADDRESS,
    // We define the specific event we want to listen for.
    // This is the standard ABI for an ERC-20 Transfer event.
    abi: [
      {
        type: "event",
        name: "Transfer",
        inputs: [
          { name: "from", type: "address", indexed: true },
          { name: "to", type: "address", indexed: true },
          { name: "value", type: "uint256", indexed: false },
        ],
        anonymous: false,
      },
    ],
    eventName: "Transfer",
    // We only care about events where the 'to' address is our marketplace wallet.
    args: {
      to: MARKETPLACE_TREASURY_WALLET_ADDRESS,
    },
    // This callback function runs every time a new matching event is found.
    onLogs: (logs) => {
      console.log(`\n--- Deposit(s) Detected: ${logs.length} ---`);
      logs.forEach((log) => {
        const { from, to, value } = log as unknown as {
          from: string;
          to: string;
          value: bigint;
          transactionHash: string;
        };

        // The 'value' is a BigInt. We format it to a readable string.
        const formattedValue = formatUnits(value!, 18); // Assumes 18 decimals

        console.log(`  -> From: ${from}`);
        console.log(`  -> To: ${to}`);
        console.log(`  -> Amount: ${formattedValue} HYPN`);
        console.log(`  -> Transaction Hash: ${log.transactionHash}`);

        // 3. --- DATABASE LOGIC ---
        // This is where you connect to your database to credit the user's account.
        // You would have a function like `creditUserAccount(from, value)`.

        /*
                async function creditUserAccount(userAddress: string, depositAmount: bigint) {
                    try {
                        // Find the user by their wallet address
                        const user = await db.user.findUnique({ where: { walletAddress: userAddress } });
                        if (!user) {
                            console.error(`  [DB Error] User with address ${userAddress} not found.`);
                            return;
                        }

                        // Convert the BigInt amount to a Decimal type for Prisma
                        const amountAsDecimal = new Prisma.Decimal(formatUnits(depositAmount, 18));

                        // Add the deposit amount to their existing balance
                        await db.account.update({
                            where: { userId: user.id },
                            data: {
                                balance: {
                                    increment: amountAsDecimal,
                                }
                            }
                        });
                        console.log(`  [DB Success] Credited ${formattedValue} HYPN to user ${user.id}`);
                    } catch (dbError) {
                        console.error("  [DB Error] Failed to update user balance:", dbError);
                    }
                }

                // Call the database function
                creditUserAccount(from!, value!);
                */
      });
    },
    // Optional: Handle errors in the listener
    onError: (error) => {
      console.error("Listener Error:", error);
    },
  });
}

// Start the listener
main().catch((error) => {
  console.error("Failed to start listener:", error);
  process.exit(1);
});

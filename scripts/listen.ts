import { createPublicClient, http, formatEther, getAddress } from "viem";
import { hyperionTestnet } from "@/lib/config";
import { creditUserAccount } from "@/lib/mongodb";

// --- Configuration ---
// These must be in your .env.local file
const HYPERION_RPC_URL = process.env.HYPERION_RPC_URL as string;
const MARKETPLACE_TREASURY_WALLET_ADDRESS = process.env
  .MARKETPLACE_TREASURY_WALLET_ADDRESS as `0x${string}`;

if (!HYPERION_RPC_URL || !MARKETPLACE_TREASURY_WALLET_ADDRESS) {
  throw new Error(
    "Missing required environment variables for the listener script."
  );
}

// --- Callback Function: What to Do When We Detect a Deposit ---
async function handleNewDeposit(
  from: string,
  value: bigint,
  txHash: string,
  blockNumber: bigint
) {
  console.log(`\n💰 NEW tMETIS DEPOSIT DETECTED!`);
  console.log(`   From: ${from}`);
  console.log(`   To: ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`);
  console.log(`   Amount: ${formatEther(value)} tMETIS`);
  console.log(`   Tx Hash: ${txHash}`);
  console.log(`   Block: ${blockNumber}`);

  try {
    // This is where we delegate to the database utility
    // The creditUserAccount function handles all the complex database logic
    await creditUserAccount(from, value);
    console.log(
      `   ✅ Successfully credited ${formatEther(
        value
      )} tMETIS to account ${from}`
    );
  } catch (error) {
    console.error(`   ❌ Failed to credit account ${from}:`, error);
  }
}

// --- Main Listener Logic ---
async function main() {
  console.log(
    "🎯 Initializing FILTERED native tMETIS listener for Hyperion Testnet..."
  );
  console.log(`📡 RPC URL: ${HYPERION_RPC_URL}`);
  console.log(
    `🏦 Treasury Wallet (FILTER TARGET): ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`
  );
  console.log(
    `🔍 FILTERING RULE: Only transactions TO the treasury address will trigger our callback`
  );

  const publicClient = createPublicClient({
    chain: hyperionTestnet,
    transport: http(HYPERION_RPC_URL),
  });

  // Test connection
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Connected successfully. Current block: ${blockNumber}`);
  } catch (error) {
    console.error("❌ Failed to connect to RPC:", error);
    throw error;
  }

  console.log(`\n🚀 Starting filtered listener...`);
  console.log(`⏳ Waiting for tMETIS deposits to treasury address...`);

  // THE LISTENER: Watch blocks and filter for our specific transactions
  const unwatch = publicClient.watchBlocks({
    onBlock: async (block) => {
      try {
        // Get full block with all transactions
        const fullBlock = await publicClient.getBlock({
          blockNumber: block.number,
          includeTransactions: true,
        });

        if (!fullBlock.transactions || fullBlock.transactions.length === 0) {
          return; // No transactions in this block
        }

        console.log(
          `📦 Block ${block.number}: Scanning ${fullBlock.transactions.length} transactions...`
        );

        // FILTERING LOGIC: Check each transaction for deposits to our treasury
        for (const tx of fullBlock.transactions) {
          if (typeof tx === "string") continue; // Skip if just hash

          const transaction = tx as any;

          // THE CRITICAL FILTER: Only process transactions that meet ALL criteria:
          // 1. The 'to' address matches our treasury wallet exactly
          // 2. The transaction has value (amount > 0)
          // 3. There is a valid 'from' address
          if (
            transaction.to &&
            transaction.from &&
            getAddress(transaction.to) ===
              getAddress(MARKETPLACE_TREASURY_WALLET_ADDRESS) &&
            transaction.value > BigInt("0")
          ) {
            console.log(`🎯 FILTER MATCH! Transaction passes all criteria:`);
            console.log(`   ✓ TO address matches treasury: ${transaction.to}`);
            console.log(
              `   ✓ Has value: ${formatEther(transaction.value)} tMETIS`
            );
            console.log(`   ✓ Has sender: ${transaction.from}`);

            // EXECUTE CALLBACK: This is where we handle the deposit
            await handleNewDeposit(
              transaction.from,
              transaction.value,
              transaction.hash,
              block.number
            );
          }
          // If transaction doesn't match our filter, we silently ignore it
        }
      } catch (error) {
        console.error("❌ Error processing block:", error);
      }
    },
    onError: (error) => {
      console.error("❌ Block watcher error:", error);
    },
  });

  console.log(`✅ Filtered listener is now active!`);
  console.log(`📋 SUMMARY:`);
  console.log(`   • Watching: Every new block on Hyperion testnet`);
  console.log(
    `   • Filtering: Only transactions TO ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`
  );
  console.log(
    `   • Action: When match found → Execute handleNewDeposit() callback`
  );
  console.log(
    `   • Callback: Extract details → Delegate to creditUserAccount()`
  );

  return { unwatch };
}

// Graceful shutdown handling
let watchers: any = null;

process.on("SIGINT", () => {
  console.log("\n⏹️  Received SIGINT. Gracefully shutting down...");
  if (watchers) {
    watchers.unwatch?.();
  }
  console.log("✅ Listener stopped.");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n⏹️  Received SIGTERM. Gracefully shutting down...");
  if (watchers) {
    watchers.unwatch?.();
  }
  console.log("✅ Listener stopped.");
  process.exit(0);
});

// Start the listener
main()
  .then((result) => {
    watchers = result;
    console.log(`\n🎉 Filtered tMETIS deposit listener is running!`);
    console.log(
      `📨 Send tMETIS to ${MARKETPLACE_TREASURY_WALLET_ADDRESS} to test`
    );
    console.log(`⌨️  Press Ctrl+C to stop`);
  })
  .catch((error) => {
    console.error("❌ Failed to start listener:", error);
    process.exit(1);
  });

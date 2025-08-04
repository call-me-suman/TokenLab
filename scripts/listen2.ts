import { ethers } from "ethers";
import { creditUserAccount } from "@/lib/mongodb";

// --- Configuration ---
// These must be in your .env.local file
const HYPERION_RPC_URL =
  process.env.HYPERION_RPC_URL || "https://hyperion-testnet.metisdevops.link";
const MARKETPLACE_TREASURY_WALLET_ADDRESS = process.env
  .MARKETPLACE_TREASURY_WALLET_ADDRESS as string;

if (!MARKETPLACE_TREASURY_WALLET_ADDRESS) {
  throw new Error(
    "Missing required environment variables for the listener script."
  );
}

// --- Main Listener Logic ---

async function main(): Promise<{
  provider: ethers.JsonRpcProvider;
  balanceChecker: NodeJS.Timeout;
}> {
  console.log("Initializing native tMETIS listener for Hyperion Testnet...");
  console.log(`RPC URL: ${HYPERION_RPC_URL}`);
  console.log(`Treasury Wallet: ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`);

  // Create provider
  const provider = new ethers.JsonRpcProvider(HYPERION_RPC_URL);

  // Test connection
  try {
    const blockNumber = await provider.getBlockNumber();
    console.log(`Connected successfully. Current block: ${blockNumber}`);

    const network = await provider.getNetwork();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  } catch (error) {
    console.error("Failed to connect to RPC:", error);
    throw error;
  }

  console.log(
    `Listening for native tMETIS deposits to: ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`
  );

  // Method 1: Listen to all new blocks and check for transactions to treasury
  provider.on("block", async (blockNumber: number) => {
    try {
      console.log(`📦 Processing block ${blockNumber}...`);

      // Get full block with transactions
      const block = await provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) return;

      // Check each transaction in the block
      for (const tx of block.transactions) {
        if (typeof tx === "string") continue; // Skip if just hash

        const transaction = tx as ethers.TransactionResponse;

        // Check if transaction is to our treasury and has value
        if (
          transaction.to?.toLowerCase() ===
            MARKETPLACE_TREASURY_WALLET_ADDRESS.toLowerCase() &&
          transaction.value > 0
        ) {
          const valueInEther = ethers.formatEther(transaction.value);

          console.log(`\n💰 NATIVE tMETIS DEPOSIT DETECTED!`);
          console.log(`   From: ${transaction.from}`);
          console.log(`   To: ${transaction.to}`);
          console.log(`   Amount: ${valueInEther} tMETIS`);
          console.log(`   Tx Hash: ${transaction.hash}`);
          console.log(`   Block: ${blockNumber}`);
          console.log(
            `   Gas Price: ${
              transaction.gasPrice
                ? ethers.formatUnits(transaction.gasPrice, "gwei")
                : "N/A"
            } gwei`
          );

          // Credit user account - convert ethers BigNumber to viem-compatible BigInt
          try {
            const valueBigInt = BigInt(transaction.value.toString());
            await creditUserAccount(transaction.from!, valueBigInt);
            console.log(
              `   ✅ Successfully credited ${valueInEther} tMETIS to account ${transaction.from}`
            );
          } catch (error) {
            console.error(`   ❌ Failed to credit account:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error processing block:", error);
    }
  });

  // Method 2: Monitor balance changes as backup
  console.log("Setting up balance monitoring...");

  let lastBalance: bigint;
  try {
    const balance = await provider.getBalance(
      MARKETPLACE_TREASURY_WALLET_ADDRESS
    );
    lastBalance = BigInt(balance.toString());
    console.log(
      `Initial treasury balance: ${ethers.formatEther(balance)} tMETIS`
    );
  } catch (error) {
    console.error("Failed to get initial balance:", error);
    lastBalance = BigInt("0");
  }

  // Check balance every 30 seconds
  const balanceChecker = setInterval(async () => {
    try {
      const balanceResult = await provider.getBalance(
        MARKETPLACE_TREASURY_WALLET_ADDRESS
      );
      const currentBalance = BigInt(balanceResult.toString());

      if (currentBalance > lastBalance) {
        const difference = currentBalance - lastBalance;
        const differenceInEther = ethers.formatEther(difference.toString());

        console.log(`\n📈 Treasury Balance Increase Detected!`);
        console.log(
          `   Previous: ${ethers.formatEther(lastBalance.toString())} tMETIS`
        );
        console.log(
          `   Current: ${ethers.formatEther(currentBalance.toString())} tMETIS`
        );
        console.log(`   Increase: ${differenceInEther} tMETIS`);

        // Note: Balance monitoring can't identify the sender
        // This is supplementary to transaction monitoring

        lastBalance = currentBalance;
      }
    } catch (error) {
      console.error("Error checking balance:", error);
    }
  }, 30000); // Check every 30 seconds

  // Optional: Show network activity
  let blockCount = 0;
  provider.on("block", (blockNumber: number) => {
    blockCount++;
    if (blockCount % 10 === 0) {
      console.log(`📊 Processed ${blockCount} blocks. Current: ${blockNumber}`);
    }
  });

  console.log(
    "Native tMETIS listeners started successfully. Waiting for deposits..."
  );

  return { provider, balanceChecker };
}

// Graceful shutdown handling
let services: {
  provider: ethers.JsonRpcProvider;
  balanceChecker: NodeJS.Timeout;
} | null = null;

process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT. Gracefully shutting down...");
  if (services) {
    services.provider.removeAllListeners();
    clearInterval(services.balanceChecker);
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nReceived SIGTERM. Gracefully shutting down...");
  if (services) {
    services.provider.removeAllListeners();
    clearInterval(services.balanceChecker);
  }
  process.exit(0);
});

// Start the listener
main()
  .then((result) => {
    services = result;
    console.log(
      "Native tMETIS blockchain listener is running. Press Ctrl+C to stop."
    );
  })
  .catch((error) => {
    console.error("Failed to start native tMETIS listener:", error);
    process.exit(1);
  });

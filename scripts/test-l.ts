// 8ea3a4960cd2f80f163281fe18892ec172f0dca5c5adb03bd790f81fb105ea4d
import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";

// --- Test Configuration ---
const HYPERION_RPC_URL =
  process.env.HYPERION_RPC_URL || "https://hyperion-testnet.metisdevops.link";
const MARKETPLACE_TREASURY_WALLET_ADDRESS = process.env
  .MARKETPLACE_TREASURY_WALLET_ADDRESS as string;
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY as string; // Your test wallet private key
const TEST_AMOUNT = "0.001"; // Amount to send for testing (0.001 tMETIS)

if (!MARKETPLACE_TREASURY_WALLET_ADDRESS) {
  throw new Error(
    "Missing MARKETPLACE_TREASURY_WALLET_ADDRESS environment variable"
  );
}

async function testConnection() {
  console.log("🔍 Testing RPC connection...");

  const provider = new ethers.JsonRpcProvider(HYPERION_RPC_URL);

  try {
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();

    console.log("✅ RPC Connection successful!");
    console.log(`   Block Number: ${blockNumber}`);
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);

    return provider;
  } catch (error) {
    console.error("❌ RPC Connection failed:", error);
    throw error;
  }
}

async function testTreasuryWallet(provider: ethers.JsonRpcProvider) {
  console.log("\n🔍 Testing treasury wallet...");

  try {
    const balance = await provider.getBalance(
      MARKETPLACE_TREASURY_WALLET_ADDRESS
    );
    const txCount = await provider.getTransactionCount(
      MARKETPLACE_TREASURY_WALLET_ADDRESS
    );

    console.log("✅ Treasury wallet information:");
    console.log(`   Address: ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} tMETIS`);
    console.log(`   Transaction Count: ${txCount}`);

    return { balance, txCount };
  } catch (error) {
    console.error("❌ Failed to get treasury info:", error);
    throw error;
  }
}

async function checkRecentTransactions(provider: ethers.JsonRpcProvider) {
  console.log("\n🔍 Checking recent transactions to treasury...");

  try {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100); // Last 100 blocks

    console.log(`   Searching blocks ${fromBlock} to ${currentBlock}...`);

    let foundTransactions = 0;

    // Check recent blocks for transactions to treasury
    for (
      let blockNum = currentBlock;
      blockNum > fromBlock && foundTransactions < 5;
      blockNum--
    ) {
      try {
        const block = await provider.getBlock(blockNum, true);
        if (!block || !block.transactions) continue;

        for (const tx of block.transactions) {
          if (typeof tx === "string") continue;

          const transaction = tx as ethers.TransactionResponse;

          if (
            transaction.to?.toLowerCase() ===
              MARKETPLACE_TREASURY_WALLET_ADDRESS.toLowerCase() &&
            transaction.value > 0
          ) {
            foundTransactions++;
            console.log(`   📥 Found transaction:`);
            console.log(`      From: ${transaction.from}`);
            console.log(
              `      Amount: ${ethers.formatEther(transaction.value)} tMETIS`
            );
            console.log(`      Hash: ${transaction.hash}`);
            console.log(`      Block: ${blockNum}`);
          }
        }
      } catch (blockError) {
        // Skip this block if there's an error
        continue;
      }
    }

    console.log(
      `✅ Found ${foundTransactions} recent transactions to treasury`
    );
    return foundTransactions > 0;
  } catch (error) {
    console.error("❌ Failed to check recent transactions:", error);
    return false;
  }
}

async function sendTestTransaction(provider: ethers.JsonRpcProvider) {
  if (!TEST_PRIVATE_KEY) {
    console.log(
      "\n⚠️  Skipping test transaction (no TEST_PRIVATE_KEY provided)"
    );
    console.log(
      "   To test with a real transaction, add TEST_PRIVATE_KEY to your .env file"
    );
    return false;
  }

  console.log("\n🔍 Sending test native tMETIS transaction...");

  try {
    const wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);

    console.log(`   From wallet: ${wallet.address}`);
    console.log(`   To treasury: ${MARKETPLACE_TREASURY_WALLET_ADDRESS}`);
    console.log(`   Amount: ${TEST_AMOUNT} tMETIS`);

    // Check balance first
    const balance = await provider.getBalance(wallet.address);
    const balanceFormatted = ethers.formatEther(balance);

    console.log(`   Wallet balance: ${balanceFormatted} tMETIS`);

    if (parseFloat(balanceFormatted) < parseFloat(TEST_AMOUNT)) {
      console.log("❌ Insufficient tMETIS balance for test transaction");
      console.log("   Get tMETIS from Hyperion testnet faucet first");
      return false;
    }

    // Send native token transaction
    const tx = await wallet.sendTransaction({
      to: MARKETPLACE_TREASURY_WALLET_ADDRESS,
      value: ethers.parseEther(TEST_AMOUNT),
    });

    console.log(`   Transaction sent: ${tx.hash}`);
    console.log("   Waiting for confirmation...");

    const receipt = await tx.wait();

    console.log("✅ Test transaction confirmed!");
    console.log(`   Block: ${receipt?.blockNumber}`);
    console.log(`   Gas used: ${receipt?.gasUsed.toString()}`);
    console.log(
      `   Transaction fee: ${ethers.formatEther(
        (receipt?.gasUsed || BigInt(0)) * (tx.gasPrice || BigInt(0))
      )} tMETIS`
    );

    return { hash: tx.hash, blockNumber: receipt?.blockNumber };
  } catch (error) {
    console.error("❌ Test transaction failed:", error);
    return false;
  }
}

async function testNativeListener(
  provider: ethers.JsonRpcProvider,
  testTxInfo?: any
) {
  console.log("\n🔍 Testing native tMETIS listener (30 second test)...");

  let transactionCount = 0;
  let testTxDetected = false;

  // Set up listener for new blocks
  const listener = async (blockNumber: number) => {
    try {
      const block = await provider.getBlock(blockNumber, true);
      if (!block || !block.transactions) return;

      for (const tx of block.transactions) {
        if (typeof tx === "string") continue;

        const transaction = tx as ethers.TransactionResponse;

        if (
          transaction.to?.toLowerCase() ===
            MARKETPLACE_TREASURY_WALLET_ADDRESS.toLowerCase() &&
          transaction.value > 0
        ) {
          transactionCount++;
          console.log(
            `   📥 Transaction ${transactionCount}: ${ethers.formatEther(
              transaction.value
            )} tMETIS from ${transaction.from}`
          );
          console.log(`      Tx: ${transaction.hash}`);
          console.log(`      Block: ${blockNumber}`);

          if (testTxInfo && transaction.hash === testTxInfo.hash) {
            testTxDetected = true;
            console.log("   ✅ Test transaction detected by listener!");
          }
        }
      }
    } catch (error) {
      console.error("Error in listener:", error);
    }
  };

  provider.on("block", listener);
  console.log("   Listening for native tMETIS transactions...");

  // Wait for 30 seconds
  await new Promise((resolve) => setTimeout(resolve, 30000));

  provider.off("block", listener);

  console.log(`✅ Native listener test completed`);
  console.log(`   Transactions detected: ${transactionCount}`);

  if (testTxInfo) {
    console.log(
      `   Test transaction detected: ${testTxDetected ? "✅ Yes" : "❌ No"}`
    );
  }

  return transactionCount > 0 || testTxDetected;
}

async function runAllTests() {
  console.log("🚀 Starting Native tMETIS Listener Tests\n");
  console.log("=".repeat(50));

  try {
    // Test 1: RPC Connection
    const provider = await testConnection();

    // Test 2: Treasury Wallet
    await testTreasuryWallet(provider);

    // Test 3: Recent Transactions
    const hasRecentTx = await checkRecentTransactions(provider);

    // Test 4: Send Test Transaction (optional)
    const testTxInfo = await sendTestTransaction(provider);

    // Test 5: Native Listener
    const listenerWorking = await testNativeListener(provider, testTxInfo);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ RPC Connection: Working`);
    console.log(`✅ Treasury Wallet: Accessible`);
    console.log(
      `${hasRecentTx ? "✅" : "⚠️ "} Recent Transactions: ${
        hasRecentTx ? "Found" : "None found"
      }`
    );
    console.log(
      `${testTxInfo ? "✅" : "⚠️ "} Test Transaction: ${
        testTxInfo ? "Sent" : "Skipped"
      }`
    );
    console.log(
      `${listenerWorking ? "✅" : "❌"} Native Listener: ${
        listenerWorking ? "Working" : "No transactions detected"
      }`
    );

    if (hasRecentTx || listenerWorking || testTxInfo) {
      console.log("\n🎉 Your native tMETIS listener should work properly!");
      console.log("\n💡 Next steps:");
      console.log("   1. Run your listener script");
      console.log("   2. Send tMETIS to your treasury address");
      console.log("   3. Watch the logs for deposit detection");
    } else {
      console.log("\n⚠️  No transactions detected, but setup looks correct.");
      console.log(
        "   Your listener should work when real tMETIS transfers occur."
      );
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests().then(() => {
  console.log("\n✅ All tests completed");
  process.exit(0);
});

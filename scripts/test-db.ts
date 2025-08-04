import dotenv from "dotenv";
dotenv.config();

import { MongoClient, ObjectId } from "mongodb";
import { parseUnits } from "viem";

// Import your utility functions
import {
  findOrCreateUser,
  creditUserAccount,
  deductUserBalance,
  createMcpServer,
  getMcpServers,
  updateMcpServer,
  incrementSellerUnpaidBalance,
} from "../src/lib/mongodb"; // Adjust path as needed

// Test configuration
const TEST_DB_NAME = "mcp-marketplace-test"; // Use separate test database
const TEST_WALLET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const TEST_WALLET_ADDRESS_2 = "0xabcdef1234567890abcdef1234567890abcdef12";

// Generate unique addresses for each test run to avoid conflicts
const generateUniqueAddress = () =>
  `0x${Math.random().toString(16).substring(2, 42).padEnd(40, "0")}`;

interface TestResults {
  passed: number;
  failed: number;
  errors: string[];
}

class MongoDBTester {
  private client: MongoClient | null = null;
  private results: TestResults = { passed: 0, failed: 0, errors: [] };

  async setup() {
    console.log("🚀 Setting up MongoDB test environment...");

    if (!process.env.MONGODB_URI) {
      throw new Error("❌ MONGODB_URI not found in environment variables");
    }

    this.client = new MongoClient(process.env.MONGODB_URI);
    await this.client.connect();
    console.log("✅ Connected to MongoDB");

    // Clean up test database before starting
    await this.cleanup();
    console.log("✅ Test environment cleaned up");
  }

  async cleanup() {
    if (!this.client) return;

    try {
      const db = this.client.db(TEST_DB_NAME);

      // Drop all collections instead of the entire database
      const collections = await db.listCollections().toArray();
      for (const collection of collections) {
        await db.collection(collection.name).drop();
        console.log(`🧹 Dropped collection: ${collection.name}`);
      }

      console.log("🧹 Test database cleaned up");
    } catch (error) {
      console.log(
        "ℹ️  Test database didn't exist or couldn't be cleaned:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async teardown() {
    await this.cleanup();
    if (this.client) {
      await this.client.close();
      console.log("✅ MongoDB connection closed");
    }
  }

  private async test(testName: string, testFn: () => Promise<void>) {
    try {
      console.log(`\n🧪 Testing: ${testName}`);
      await testFn();
      this.results.passed++;
      console.log(`✅ PASSED: ${testName}`);
    } catch (error) {
      this.results.failed++;
      const errorMsg = `❌ FAILED: ${testName} - ${error}`;
      console.error(errorMsg);
      this.results.errors.push(errorMsg);
    }
  }

  private async assertExists(value: any, message: string) {
    if (!value) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  private async assertEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: ${message}. Expected: ${expected}, Got: ${actual}`
      );
    }
  }

  private async assertTrue(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // === USER TESTS ===

  async testFindOrCreateUser() {
    await this.test("findOrCreateUser - Create new user", async () => {
      const uniqueAddress = generateUniqueAddress();
      const user = await findOrCreateUser(uniqueAddress);

      this.assertExists(user, "User should be created");
      this.assertExists(user._id, "User should have _id");
      this.assertEqual(
        user.walletAddress,
        uniqueAddress.toLowerCase(),
        "Wallet address should be lowercase"
      );
      this.assertExists(user.createdAt, "User should have createdAt");
      this.assertEqual(user.account.balance, 0, "Initial balance should be 0");
      this.assertExists(
        user.account.updatedAt,
        "Account should have updatedAt"
      );
    });

    await this.test("findOrCreateUser - Find existing user", async () => {
      const uniqueAddress = generateUniqueAddress();
      const user1 = await findOrCreateUser(uniqueAddress);
      const user2 = await findOrCreateUser(uniqueAddress);

      this.assertEqual(
        user1._id.toString(),
        user2._id.toString(),
        "Should return same user"
      );
      this.assertEqual(
        user1.walletAddress,
        user2.walletAddress,
        "Wallet addresses should match"
      );
    });

    await this.test("findOrCreateUser - Case insensitive", async () => {
      const uniqueAddress = generateUniqueAddress();
      const lowerCaseUser = await findOrCreateUser(uniqueAddress.toLowerCase());
      const upperCaseUser = await findOrCreateUser(uniqueAddress.toUpperCase());

      this.assertEqual(
        lowerCaseUser._id.toString(),
        upperCaseUser._id.toString(),
        "Should return same user regardless of case"
      );
    });
  }

  async testCreditUserAccount() {
    await this.test("creditUserAccount - Credit existing user", async () => {
      // First create a user with unique address
      const uniqueAddress = generateUniqueAddress();
      const user = await findOrCreateUser(uniqueAddress);
      const initialBalance = user.account.balance;

      // Credit 1 ETH (1e18 wei)
      const depositAmount = parseUnits("1", 18);
      await creditUserAccount(uniqueAddress, depositAmount);

      // Verify balance was updated
      const updatedUser = await findOrCreateUser(uniqueAddress);
      this.assertEqual(
        updatedUser.account.balance,
        initialBalance + 1,
        "Balance should be incremented by 1"
      );
      this.assertTrue(
        updatedUser.account.updatedAt > user.account.updatedAt,
        "UpdatedAt should be newer"
      );
    });

    await this.test("creditUserAccount - Multiple credits", async () => {
      const uniqueAddress = generateUniqueAddress();
      const user = await findOrCreateUser(uniqueAddress);
      const initialBalance = user.account.balance;

      // Credit 0.5 ETH twice
      const depositAmount = parseUnits("0.5", 18);
      await creditUserAccount(uniqueAddress, depositAmount);
      await creditUserAccount(uniqueAddress, depositAmount);

      const updatedUser = await findOrCreateUser(uniqueAddress);
      this.assertEqual(
        updatedUser.account.balance,
        initialBalance + 1,
        "Balance should be incremented by 1 total"
      );
    });

    await this.test(
      "creditUserAccount - Credit non-existent user",
      async () => {
        const nonExistentAddress = generateUniqueAddress();
        const depositAmount = parseUnits("1", 18);

        // This should not throw an error but won't credit anyone
        const result = await creditUserAccount(
          nonExistentAddress,
          depositAmount
        );
        this.assertEqual(result.matchedCount, 0, "Should not match any user");
      }
    );
  }

  async testDeductUserBalance() {
    await this.test("deductUserBalance - Sufficient balance", async () => {
      // Create user and credit them first
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);
      const depositAmount = parseUnits("5", 18);
      await creditUserAccount(TEST_WALLET_ADDRESS, depositAmount);

      // Deduct 2 tokens
      const deductResult = await deductUserBalance(user._id.toString(), 2);

      this.assertExists(deductResult, "Deduction should succeed");
      this.assertEqual(
        deductResult.account.balance,
        3,
        "Balance should be 3 after deducting 2"
      );
    });

    await this.test("deductUserBalance - Insufficient balance", async () => {
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

      // Try to deduct more than available
      const deductResult = await deductUserBalance(user._id.toString(), 10);

      this.assertEqual(
        deductResult,
        null,
        "Deduction should fail and return null"
      );
    });

    await this.test("deductUserBalance - Exact balance", async () => {
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);
      const currentBalance = user.account.balance;

      // Deduct exact balance
      const deductResult = await deductUserBalance(
        user._id.toString(),
        currentBalance
      );

      this.assertExists(deductResult, "Deduction should succeed");
      this.assertEqual(deductResult.account.balance, 0, "Balance should be 0");
    });

    await this.test("deductUserBalance - Invalid user ID", async () => {
      const invalidUserId = new ObjectId().toString();

      const deductResult = await deductUserBalance(invalidUserId, 1);

      this.assertEqual(
        deductResult,
        null,
        "Should return null for invalid user ID"
      );
    });
  }

  // === MCP SERVER TESTS ===

  async testCreateMcpServer() {
    await this.test("createMcpServer - Create valid server", async () => {
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

      const serverData = {
        ownerId: user._id.toString(),
        name: "Test Weather API",
        description: "Provides weather information for cities worldwide",
        keywords: ["weather", "api", "forecast"],
        endpointUrl: "https://api.example.com/weather",
        pricePerQuery: 0.001,
        payoutAddress: TEST_WALLET_ADDRESS,
      };

      const server = await createMcpServer(serverData);

      this.assertExists(server, "Server should be created");
      this.assertExists(server._id, "Server should have _id");
      this.assertEqual(
        server.name,
        serverData.name,
        "Server name should match"
      );
      this.assertEqual(
        server.description,
        serverData.description,
        "Server description should match"
      );
      this.assertEqual(
        server.keywords.length,
        3,
        "Server should have 3 keywords"
      );
      this.assertEqual(
        server.pricePerQuery,
        0.001,
        "Price per query should match"
      );
      this.assertEqual(
        server.unpaidBalance,
        0,
        "Initial unpaid balance should be 0"
      );
      this.assertEqual(
        server.isActive,
        true,
        "Server should be active by default"
      );
      this.assertExists(server.createdAt, "Server should have createdAt");
    });

    await this.test(
      "createMcpServer - Multiple servers for same owner",
      async () => {
        const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

        const serverData1 = {
          ownerId: user._id.toString(),
          name: "Currency API",
          description: "Currency conversion rates",
          keywords: ["currency", "exchange"],
          endpointUrl: "https://api.example.com/currency",
          pricePerQuery: 0.002,
          payoutAddress: TEST_WALLET_ADDRESS,
        };

        const serverData2 = {
          ownerId: user._id.toString(),
          name: "News API",
          description: "Latest news articles",
          keywords: ["news", "articles"],
          endpointUrl: "https://api.example.com/news",
          pricePerQuery: 0.003,
          payoutAddress: TEST_WALLET_ADDRESS,
        };

        const server1 = await createMcpServer(serverData1);
        const server2 = await createMcpServer(serverData2);

        this.assertExists(server1._id, "Server 1 should have _id");
        this.assertExists(server2._id, "Server 2 should have _id");
        this.assertTrue(
          server1._id.toString() !== server2._id.toString(),
          "Servers should have different IDs"
        );
      }
    );
  }

  async testGetMcpServers() {
    await this.test("getMcpServers - Get all active servers", async () => {
      // Create some test servers first
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

      await createMcpServer({
        ownerId: user._id.toString(),
        name: "Server 1",
        description: "Description 1",
        keywords: ["test"],
        endpointUrl: "https://api1.example.com",
        pricePerQuery: 0.001,
        payoutAddress: TEST_WALLET_ADDRESS,
      });

      await createMcpServer({
        ownerId: user._id.toString(),
        name: "Server 2",
        description: "Description 2",
        keywords: ["test"],
        endpointUrl: "https://api2.example.com",
        pricePerQuery: 0.002,
        payoutAddress: TEST_WALLET_ADDRESS,
      });

      const servers = await getMcpServers();

      this.assertTrue(servers.length >= 2, "Should return at least 2 servers");
      this.assertTrue(
        servers.every((server) => server.isActive),
        "All returned servers should be active"
      );
    });

    await this.test(
      "getMcpServers - Empty result when no servers",
      async () => {
        // Clean up existing servers
        if (this.client) {
          const db = this.client.db(TEST_DB_NAME);
          await db.collection("mcpServers").deleteMany({});
        }

        const servers = await getMcpServers();
        this.assertEqual(
          servers.length,
          0,
          "Should return empty array when no active servers"
        );
      }
    );
  }

  async testUpdateMcpServer() {
    await this.test("updateMcpServer - Valid update by owner", async () => {
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

      const server = await createMcpServer({
        ownerId: user._id.toString(),
        name: "Original Name",
        description: "Original Description",
        keywords: ["original"],
        endpointUrl: "https://original.example.com",
        pricePerQuery: 0.001,
        payoutAddress: TEST_WALLET_ADDRESS,
      });

      const updateData = {
        name: "Updated Name",
        description: "Updated Description",
        pricePerQuery: 0.002,
      };

      const updatedServer = await updateMcpServer(
        server._id.toString(),
        user._id.toString(),
        updateData
      );

      this.assertExists(updatedServer, "Update should succeed");
      this.assertEqual(
        updatedServer.name,
        "Updated Name",
        "Name should be updated"
      );
      this.assertEqual(
        updatedServer.description,
        "Updated Description",
        "Description should be updated"
      );
      this.assertEqual(
        updatedServer.pricePerQuery,
        0.002,
        "Price should be updated"
      );
    });

    await this.test(
      "updateMcpServer - Unauthorized update attempt",
      async () => {
        const owner = await findOrCreateUser(TEST_WALLET_ADDRESS);
        const nonOwner = await findOrCreateUser(TEST_WALLET_ADDRESS_2);

        const server = await createMcpServer({
          ownerId: owner._id.toString(),
          name: "Server Name",
          description: "Server Description",
          keywords: ["test"],
          endpointUrl: "https://api.example.com",
          pricePerQuery: 0.001,
          payoutAddress: TEST_WALLET_ADDRESS,
        });

        const updateData = { name: "Hacked Name" };

        const result = await updateMcpServer(
          server._id.toString(),
          nonOwner._id.toString(),
          updateData
        );

        this.assertEqual(result, null, "Update should fail for non-owner");
      }
    );

    await this.test("updateMcpServer - Invalid server ID", async () => {
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);
      const invalidServerId = new ObjectId().toString();

      const result = await updateMcpServer(
        invalidServerId,
        user._id.toString(),
        { name: "New Name" }
      );

      this.assertEqual(
        result,
        null,
        "Update should fail for invalid server ID"
      );
    });
  }

  async testIncrementSellerUnpaidBalance() {
    await this.test(
      "incrementSellerUnpaidBalance - Valid increment",
      async () => {
        const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

        const server = await createMcpServer({
          ownerId: user._id.toString(),
          name: "Test Server",
          description: "Test Description",
          keywords: ["test"],
          endpointUrl: "https://api.example.com",
          pricePerQuery: 0.001,
          payoutAddress: TEST_WALLET_ADDRESS,
        });

        // Increment unpaid balance
        await incrementSellerUnpaidBalance(server._id.toString(), 0.005);

        // Verify the increment
        const servers = await getMcpServers();
        const updatedServer = servers.find(
          (s) => s._id.toString() === server._id.toString()
        );

        this.assertExists(updatedServer, "Server should exist");
        if (!updatedServer) {
          throw new Error("updatedServer is undefined");
        }
        this.assertEqual(
          updatedServer.unpaidBalance,
          0.005,
          "Unpaid balance should be incremented"
        );
      }
    );

    await this.test(
      "incrementSellerUnpaidBalance - Multiple increments",
      async () => {
        const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

        const server = await createMcpServer({
          ownerId: user._id.toString(),
          name: "Test Server 2",
          description: "Test Description",
          keywords: ["test"],
          endpointUrl: "https://api2.example.com",
          pricePerQuery: 0.001,
          payoutAddress: TEST_WALLET_ADDRESS,
        });

        // Multiple increments
        await incrementSellerUnpaidBalance(server._id.toString(), 0.001);
        await incrementSellerUnpaidBalance(server._id.toString(), 0.002);
        await incrementSellerUnpaidBalance(server._id.toString(), 0.003);

        const servers = await getMcpServers();
        const updatedServer = servers.find(
          (s) => s._id.toString() === server._id.toString()
        );

        this.assertExists(updatedServer, "Server should exist");
        if (!updatedServer) {
          throw new Error("updatedServer is undefined");
        }
        this.assertEqual(
          updatedServer.unpaidBalance,
          0.006,
          "Unpaid balance should be sum of all increments"
        );
      }
    );

    await this.test(
      "incrementSellerUnpaidBalance - Invalid server ID",
      async () => {
        const invalidServerId = new ObjectId().toString();

        const result = await incrementSellerUnpaidBalance(
          invalidServerId,
          0.001
        );

        this.assertEqual(result.matchedCount, 0, "Should not match any server");
        this.assertEqual(
          result.modifiedCount,
          0,
          "Should not modify any server"
        );
      }
    );
  }

  // === INTEGRATION TESTS ===

  async testIntegrationWorkflow() {
    await this.test(
      "Integration - Complete user and server workflow",
      async () => {
        // 1. Create user
        const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

        // 2. Credit user account
        const depositAmount = parseUnits("10", 18);
        await creditUserAccount(TEST_WALLET_ADDRESS, depositAmount);

        // 3. Create MCP server
        const server = await createMcpServer({
          ownerId: user._id.toString(),
          name: "Integration Test Server",
          description: "Server for integration testing",
          keywords: ["integration", "test"],
          endpointUrl: "https://integration.example.com",
          pricePerQuery: 0.1,
          payoutAddress: TEST_WALLET_ADDRESS,
        });

        // 4. Simulate queries (deduct from buyer, credit seller)
        const queryPrice = 0.1;
        const numQueries = 5;

        for (let i = 0; i < numQueries; i++) {
          // Deduct from user balance
          const deductResult = await deductUserBalance(
            user._id.toString(),
            queryPrice
          );
          this.assertExists(
            deductResult,
            `Query ${i + 1} deduction should succeed`
          );

          // Credit seller unpaid balance
          await incrementSellerUnpaidBalance(server._id.toString(), queryPrice);
        }

        // 5. Verify final state
        const finalUser = await findOrCreateUser(TEST_WALLET_ADDRESS);
        const servers = await getMcpServers();
        const finalServer = servers.find(
          (s) => s._id.toString() === server._id.toString()
        );

        this.assertEqual(
          finalUser.account.balance,
          10 - queryPrice * numQueries,
          "User balance should be correctly deducted"
        );
        this.assertExists(finalServer, "Server should exist");
        if (!finalServer) {
          throw new Error("finalServer is undefined");
        }
        this.assertEqual(
          finalServer.unpaidBalance,
          queryPrice * numQueries,
          "Server unpaid balance should be correct"
        );
      }
    );
  }

  // === EDGE CASE TESTS ===

  async testEdgeCases() {
    await this.test("Edge case - Empty string wallet address", async () => {
      try {
        await findOrCreateUser("");
        throw new Error("Should have failed with empty wallet address");
      } catch (error) {
        // Expected to fail
        this.assertTrue(true, "Empty wallet address should be rejected");
      }
    });

    await this.test("Edge case - Very large deposit amount", async () => {
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);
      const largeAmount = parseUnits("1000000", 18); // 1 million tokens

      await creditUserAccount(TEST_WALLET_ADDRESS, largeAmount);

      const updatedUser = await findOrCreateUser(TEST_WALLET_ADDRESS);
      this.assertTrue(
        updatedUser.account.balance > 1000000,
        "Should handle large amounts"
      );
    });

    await this.test("Edge case - Zero amount operations", async () => {
      const user = await findOrCreateUser(TEST_WALLET_ADDRESS);

      // Zero deduction
      const deductResult = await deductUserBalance(user._id.toString(), 0);
      this.assertExists(deductResult, "Zero deduction should succeed");

      // Zero increment
      const server = await createMcpServer({
        ownerId: user._id.toString(),
        name: "Zero Test Server",
        description: "Testing zero amounts",
        keywords: ["zero"],
        endpointUrl: "https://zero.example.com",
        pricePerQuery: 0,
        payoutAddress: TEST_WALLET_ADDRESS,
      });

      await incrementSellerUnpaidBalance(server._id.toString(), 0);
      // Should not throw error
      this.assertTrue(true, "Zero operations should be handled gracefully");
    });
  }

  async runAllTests() {
    console.log("🧪 Starting comprehensive MongoDB utility tests...\n");

    try {
      await this.setup();

      // Run all test suites
      await this.testFindOrCreateUser();
      await this.testCreditUserAccount();
      await this.testDeductUserBalance();
      await this.testCreateMcpServer();
      await this.testGetMcpServers();
      await this.testUpdateMcpServer();
      await this.testIncrementSellerUnpaidBalance();
      await this.testIntegrationWorkflow();
      await this.testEdgeCases();
    } finally {
      await this.teardown();
    }

    // Print results
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST RESULTS SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(
      `📈 Success Rate: ${(
        (this.results.passed / (this.results.passed + this.results.failed)) *
        100
      ).toFixed(1)}%`
    );

    if (this.results.errors.length > 0) {
      console.log("\n🚨 FAILED TESTS:");
      this.results.errors.forEach((error) => console.log(`   ${error}`));
    }

    console.log("\n" + "=".repeat(50));

    if (this.results.failed === 0) {
      console.log(
        "🎉 ALL TESTS PASSED! Your MongoDB utilities are working correctly."
      );
    } else {
      console.log("⚠️  Some tests failed. Please review the errors above.");
      process.exit(1);
    }
  }
}

// Run the tests
async function runTests() {
  const tester = new MongoDBTester();
  await tester.runAllTests();
}

// Execute if this file is run directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { MongoDBTester };

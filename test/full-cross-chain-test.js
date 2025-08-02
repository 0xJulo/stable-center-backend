const axios = require("axios");

const API_BASE = "http://localhost:3001/api/swap";

// Test configuration
const TEST_CONFIG = {
  amount: "1000000", // 1 USDC (smaller amount for testing)
  srcChainId: 1, // Ethereum
  dstChainId: 8453, // Base
  srcToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
  dstToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testQuote() {
  console.log("🔍 Step 1: Getting quote...");

  try {
    const queryParams = new URLSearchParams({
      amount: TEST_CONFIG.amount,
      srcChainId: TEST_CONFIG.srcChainId.toString(),
      dstChainId: TEST_CONFIG.dstChainId.toString(),
      srcToken: TEST_CONFIG.srcToken,
      dstToken: TEST_CONFIG.dstToken,
    });

    const response = await axios.get(`${API_BASE}/quote?${queryParams}`);

    if (response.data.success) {
      console.log("✅ Quote received successfully!");
      console.log(
        `📊 Expected output: ~${response.data.data.dstTokenAmount} wei`
      );
      console.log(`📊 Quote ID: ${response.data.data.quoteId}`);
      return response.data.data;
    } else {
      throw new Error("Quote request failed");
    }
  } catch (error) {
    console.error("❌ Quote error:", error.response?.data || error.message);
    throw error;
  }
}

async function testCompleteSwap() {
  console.log("\n🚀 Step 2: Creating and completing cross-chain swap...");

  try {
    const response = await axios.post(`${API_BASE}/cross-chain/complete`, {
      amount: TEST_CONFIG.amount,
      srcChainId: TEST_CONFIG.srcChainId,
      dstChainId: TEST_CONFIG.dstChainId,
      srcToken: TEST_CONFIG.srcToken,
      dstToken: TEST_CONFIG.dstToken,
    });

    if (response.data.success) {
      console.log("✅ Complete swap initiated successfully!");
      console.log(`📊 Order hash: ${response.data.data.hash}`);
      console.log(`📊 Status: ${response.data.data.status}`);

      if (response.data.data.finalStatus) {
        console.log(
          `📊 Final status: ${response.data.data.finalStatus.status}`
        );
        if (response.data.data.finalStatus.status === "Executed") {
          console.log("🎉 Cross-chain swap completed successfully!");
          console.log("💰 Check your Base wallet for the received tokens!");
          console.log(
            `📊 Transaction hash: ${
              response.data.data.finalStatus.fills?.[0]?.txHash || "N/A"
            }`
          );
        } else if (response.data.data.finalStatus.status === "Refunded") {
          console.log("💰 Order refunded - funds returned to your wallet");
        }
      }

      return response.data.data;
    } else {
      throw new Error("Complete swap request failed");
    }
  } catch (error) {
    console.error(
      "❌ Complete swap error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function testOrderStatus(orderHash) {
  console.log(`\n📊 Step 3: Checking order status for ${orderHash}...`);

  try {
    const response = await axios.get(`${API_BASE}/order-status/${orderHash}`);

    if (response.data.success) {
      const status = response.data.data.status;
      console.log(`📋 Order status: ${status.status}`);
      console.log(`📋 Validation: ${status.validation}`);
      console.log(`📋 Remaining amount: ${status.remainingMakerAmount}`);

      if (status.fills && status.fills.length > 0) {
        console.log(`📋 Fills count: ${status.fills.length}`);
        status.fills.forEach((fill, index) => {
          console.log(
            `  Fill ${index + 1}: ${fill.status} - ${
              fill.filledMakerAmount
            } wei`
          );
        });
      }

      return status;
    } else {
      throw new Error("Status check failed");
    }
  } catch (error) {
    console.error(
      "❌ Status check error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function monitorOrderCompletion(orderHash, maxWaitTime = 300000) {
  // 5 minutes
  console.log(`\n⏳ Step 5: Monitoring order completion for ${orderHash}...`);
  console.log(`⏰ Will monitor for up to ${maxWaitTime / 1000} seconds`);

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxWaitTime) {
    attempts++;
    console.log(`\n📊 Monitoring attempt ${attempts}...`);

    try {
      const status = await testOrderStatus(orderHash);

      if (status.status === "Executed") {
        console.log("🎉 Order executed successfully!");
        console.log("✅ Cross-chain swap completed!");
        return { success: true, status: "Executed" };
      } else if (status.status === "Refunded") {
        console.log("💰 Order refunded - funds returned to your wallet");
        return { success: true, status: "Refunded" };
      } else if (status.status === "Expired") {
        console.log("⏰ Order expired");
        return { success: true, status: "Expired" };
      } else {
        console.log(`⏳ Order still ${status.status}, waiting...`);
      }
    } catch (error) {
      console.error("❌ Monitoring error:", error.message);
    }

    // Wait 30 seconds before next check
    await sleep(30000);
  }

  console.log("⏰ Monitoring timeout reached");
  return { success: false, status: "Timeout" };
}

async function runFullTest() {
  console.log("🚀 Starting comprehensive cross-chain swap test...\n");
  console.log("📋 Test configuration:");
  console.log(
    `  Amount: ${TEST_CONFIG.amount} wei (${
      parseInt(TEST_CONFIG.amount) / 1000000
    } USDC)`
  );
  console.log(`  From: Ethereum (${TEST_CONFIG.srcChainId})`);
  console.log(`  To: Base (${TEST_CONFIG.dstChainId})`);
  console.log(`  Source token: ${TEST_CONFIG.srcToken}`);
  console.log(`  Destination token: ${TEST_CONFIG.dstToken}\n`);

  try {
    // Step 1: Get quote
    const quoteData = await testQuote();

    // Step 2: Perform complete swap (this already monitors and completes the order)
    const swapResult = await testCompleteSwap();

    // Final summary
    console.log("\n📊 Test Summary:");
    console.log("================");
    console.log(`✅ Quote: Success`);
    console.log(`✅ Order creation: Success`);
    console.log(`✅ Order submission: Success`);

    // Show final status from the complete swap result
    if (swapResult.finalStatus) {
      console.log(`✅ Order monitoring: Success`);
      console.log(`📋 Final status: ${swapResult.finalStatus.status}`);

      if (swapResult.finalStatus.status === "Executed") {
        console.log("\n🎉 SUCCESS: Cross-chain swap completed successfully!");
        console.log("💰 Check your Base wallet for the received tokens");
        if (
          swapResult.finalStatus.fills &&
          swapResult.finalStatus.fills.length > 0
        ) {
          console.log(
            `📊 Transaction hash: ${swapResult.finalStatus.fills[0].txHash}`
          );
        }
      } else if (swapResult.finalStatus.status === "Refunded") {
        console.log("\n💰 SUCCESS: Order refunded - your funds are safe");
        console.log("💡 Try with a different amount or timing");
      } else {
        console.log("\n⏳ Order still pending - check manually later");
      }
    } else {
      console.log("⚠️ No final status available");
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.log("\n💡 Troubleshooting tips:");
    console.log("  - Make sure your server is running (npm start)");
    console.log("  - Check your .env file has correct PRIVATE_KEY and RPC_URL");
    console.log("  - Ensure you have sufficient USDC balance");
    console.log("  - Try with a smaller amount if needed");
  }
}

// Run the full test
runFullTest().catch(console.error);

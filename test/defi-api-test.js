const axios = require("axios");

const API_BASE = "http://localhost:3001/api/defi";

// Test configuration
const TEST_CONFIG = {
  address: "0xBC3F74CECF1fA8270A6FAE935e974a5a9570D054",
  chainId: "1", // Ethereum
};

async function testPortfolioTokens() {
  console.log("📊 Testing portfolio tokens endpoint...");

  try {
    const queryParams = new URLSearchParams({
      addresses: TEST_CONFIG.address,
      chain_id: TEST_CONFIG.chainId,
    });

    const response = await axios.get(
      `${API_BASE}/portfolio/tokens?${queryParams}`
    );

    if (response.data.success) {
      console.log("✅ Portfolio tokens retrieved successfully!");
      console.log(`📊 Total tokens: ${response.data.data.result?.length || 0}`);

      if (response.data.data.result && response.data.data.result.length > 0) {
        console.log("💎 Token details:");
        response.data.data.result.forEach((token, index) => {
          console.log(
            `  ${index + 1}. ${token.contract_symbol} (${token.contract_name})`
          );
          console.log(`     Value: $${token.value_usd.toFixed(2)}`);
          console.log(
            `     Amount: ${token.underlying_tokens[0]?.amount || 0}`
          );
          console.log(
            `     Price: $${token.underlying_tokens[0]?.price_usd || 0}`
          );
        });
      }

      // Calculate total portfolio value
      const totalValue =
        response.data.data.result?.reduce(
          (sum, token) => sum + token.value_usd,
          0
        ) || 0;
      console.log(`💰 Total portfolio value: $${totalValue.toFixed(2)}`);

      return response.data.data;
    } else {
      throw new Error("Portfolio tokens request failed");
    }
  } catch (error) {
    console.error(
      "❌ Portfolio tokens error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function testPortfolioChart() {
  console.log("\n📈 Testing portfolio chart endpoint...");

  try {
    const queryParams = new URLSearchParams({
      addresses: TEST_CONFIG.address,
      chain_id: TEST_CONFIG.chainId,
      timerange: "1week",
      max_points: "30",
    });

    const response = await axios.get(
      `${API_BASE}/portfolio/chart?${queryParams}`
    );

    if (response.data.success) {
      console.log("✅ Portfolio chart data retrieved successfully!");
      console.log(
        `📊 Data points: ${response.data.data.dataPoints?.length || 0}`
      );
      console.log(
        `📈 Original points: ${response.data.data.summary.originalPoints}`
      );
      console.log(
        `📅 Time range: ${response.data.data.summary.timeRange.start} to ${response.data.data.summary.timeRange.end}`
      );
      console.log(
        `💰 Value range: $${response.data.data.summary.valueRange.min.toFixed(
          2
        )} - $${response.data.data.summary.valueRange.max.toFixed(2)}`
      );
      console.log(
        `💵 Current value: $${response.data.data.summary.valueRange.current.toFixed(
          2
        )}`
      );

      if (
        response.data.data.dataPoints &&
        response.data.data.dataPoints.length > 0
      ) {
        console.log("📊 Sample data points:");
        response.data.data.dataPoints.slice(0, 3).forEach((point, index) => {
          console.log(
            `  ${index + 1}. ${point.date}: $${point.value_usd.toFixed(2)}`
          );
        });
        if (response.data.data.dataPoints.length > 3) {
          console.log(
            `  ... and ${response.data.data.dataPoints.length - 3} more points`
          );
        }
      }

      return response.data.data;
    } else {
      throw new Error("Portfolio chart request failed");
    }
  } catch (error) {
    console.error(
      "❌ Portfolio chart error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function testHealthCheck() {
  console.log("\n🏥 Testing DeFi API health check...");

  try {
    const response = await axios.get(`${API_BASE}/health`);

    if (response.data.status === "OK") {
      console.log("✅ DeFi API health check passed!");
      console.log(`📋 Available endpoints:`, response.data.endpoints);
      return response.data;
    } else {
      throw new Error("Health check failed");
    }
  } catch (error) {
    console.error(
      "❌ Health check error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function runDefiApiTest() {
  console.log("🚀 Starting 1inch DeFi API test...\n");

  console.log("📋 Test configuration:");
  console.log(`  Address: ${TEST_CONFIG.address}`);
  console.log(`  Chain ID: ${TEST_CONFIG.chainId} (Ethereum)\n`);

  try {
    // Step 1: Health check
    await testHealthCheck();

    // Step 2: Portfolio tokens
    const portfolioTokens = await testPortfolioTokens();

    // Step 3: Portfolio chart
    const portfolioChart = await testPortfolioChart();

    console.log("\n🎉 All DeFi API tests completed successfully!");
    console.log("✅ 1inch DeFi API integration is working!");

    // Summary
    console.log("\n📊 Test Summary:");
    console.log("================");
    console.log(`✅ Health check: Success`);
    console.log(`✅ Portfolio tokens: Success`);
    console.log(`✅ Portfolio chart: Success`);

    if (portfolioTokens?.result) {
      const totalValue = portfolioTokens.result.reduce(
        (sum, token) => sum + token.value_usd,
        0
      );
      console.log(`💰 Current portfolio value: $${totalValue.toFixed(2)}`);
      console.log(`📊 Number of tokens: ${portfolioTokens.result.length}`);
    }

    if (portfolioChart?.summary) {
      console.log(
        `📈 Chart data points: ${portfolioChart.summary.totalPoints}`
      );
      console.log(
        `📅 Chart time range: ${portfolioChart.summary.timeRange.start} to ${portfolioChart.summary.timeRange.end}`
      );
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\n💡 Troubleshooting tips:");
    console.error("  - Make sure your server is running (npm start)");
    console.error("  - Check your .env file has correct FUSION_AUTH_KEY");
    console.error(
      "  - Ensure the address has some tokens on the specified chain"
    );
    console.error(
      "  - Verify your 1inch API key is valid and has sufficient credits"
    );
    process.exit(1);
  }
}

// Run the test
runDefiApiTest().catch(console.error);

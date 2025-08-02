import express from "express";
import {
  getPortfolioTokens,
  getPortfolioChart,
  processChartData,
  CHAIN_IDS,
} from "../lib/defi-utils";

const router = express.Router();

// Get portfolio tokens snapshot
router.get("/portfolio/tokens", async (req, res) => {
  const { addresses, chain_id } = req.query;

  console.log("📊 Portfolio tokens request received:");
  console.log("Query params:", { addresses, chain_id });

  if (!addresses) {
    return res.status(400).json({
      success: false,
      error: "Addresses parameter is required",
    });
  }

  if (!chain_id) {
    return res.status(400).json({
      success: false,
      error: "Chain ID parameter is required",
    });
  }

  try {
    const result = await getPortfolioTokens(
      addresses as string | string[],
      chain_id as string
    );

    console.log("✅ Portfolio tokens retrieved successfully");

    res.status(200).json({
      success: true,
      data: result,
      message: "Portfolio tokens retrieved successfully",
    });
  } catch (error: any) {
    console.error("❌ Error getting portfolio tokens:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get portfolio chart data
router.get("/portfolio/chart", async (req, res) => {
  const {
    addresses,
    chain_id,
    timerange = "1week",
    max_points = "50",
  } = req.query;

  console.log("📈 Portfolio chart request received:");
  console.log("Query params:", { addresses, chain_id, timerange, max_points });

  if (!addresses) {
    return res.status(400).json({
      success: false,
      error: "Addresses parameter is required",
    });
  }

  if (!chain_id) {
    return res.status(400).json({
      success: false,
      error: "Chain ID parameter is required",
    });
  }

  try {
    const rawData = await getPortfolioChart(
      addresses as string | string[],
      chain_id as string,
      timerange as string
    );

    // Process the data for optimal chart visualization
    const processedData = processChartData(
      rawData,
      parseInt(max_points as string)
    );

    console.log("✅ Portfolio chart data retrieved and processed successfully");
    console.log(
      `📊 Processed ${processedData.summary.totalPoints} points from ${processedData.summary.originalPoints} original points`
    );

    res.status(200).json({
      success: true,
      data: processedData,
      message: "Portfolio chart data retrieved successfully",
    });
  } catch (error: any) {
    console.error("❌ Error getting portfolio chart data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get supported chains
router.get("/chains", async (req, res) => {
  console.log("🔗 Supported chains request received");

  res.status(200).json({
    success: true,
    data: {
      chains: Object.entries(CHAIN_IDS).map(([name, id]) => ({
        name,
        id,
        displayName: name.charAt(0) + name.slice(1).toLowerCase(),
      })),
    },
    message: "Supported chains retrieved successfully",
  });
});

// Health check for DeFi API
router.get("/health", async (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "1inch DeFi API is running",
    endpoints: [
      "GET /portfolio/tokens - Get portfolio tokens snapshot",
      "GET /portfolio/chart - Get portfolio value over time (supports: 1day, 1week, 1month, 3months, 1year)",
      "GET /chains - Get supported chains",
    ],
  });
});

export default router;

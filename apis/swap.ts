import express from "express";
import {
  createFusionOrder,
  createCompleteFusionOrder,
  getQuote,
} from "../1inch_fusion_order/createOrder";

const router = express.Router();

// Generic cross-chain swap endpoint with simulation support
router.post("/cross-chain", async (req, res) => {
  const {
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
    simulate = false,
  } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Amount is required" });
  }

  if (!srcChainId || !dstChainId) {
    return res
      .status(400)
      .json({ error: "Source and destination chain IDs are required" });
  }

  try {
    const result = await createFusionOrder({
      amount,
      srcTokenAddress: srcToken,
      dstTokenAddress: dstToken,
      srcChainId,
      dstChainId,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: simulate
        ? "Order simulated successfully"
        : "Order created successfully",
    });
  } catch (err) {
    console.error("Error creating cross-chain swap:", err);
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

// Complete cross-chain swap with monitoring endpoint
router.post("/cross-chain/complete", async (req, res) => {
  const {
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
    simulate = false,
  } = req.body;

  if (!amount) {
    return res.status(400).json({ error: "Amount is required" });
  }

  if (!srcChainId || !dstChainId) {
    return res
      .status(400)
      .json({ error: "Source and destination chain IDs are required" });
  }

  try {
    const result = await createCompleteFusionOrder({
      amount: amount as string,
      srcChainId: Number(srcChainId),
      dstChainId: Number(dstChainId),
      srcTokenAddress: srcToken as string,
      dstTokenAddress: dstToken as string,
    });

    // Extract only the necessary data, converting BigInts to strings
    const responseData = {
      hash: result.hash,
      status: result.status,
      finalStatus: {
        status: result.finalStatus.status,
        orderHash: result.finalStatus.orderHash,
        srcChainId: result.finalStatus.srcChainId,
        dstChainId: result.finalStatus.dstChainId,
        validation: result.finalStatus.validation,
        remainingMakerAmount:
          result.finalStatus.remainingMakerAmount?.toString() || "0",
        deadline: result.finalStatus.deadline,
        createdAt: result.finalStatus.createdAt,
        cancelable: result.finalStatus.cancelable,
        // Convert fills to safe format
        fills:
          result.finalStatus.fills?.map((fill: any) => ({
            txHash: fill.txHash,
            filledMakerAmount: fill.filledMakerAmount?.toString() || "0",
            filledAuctionTakerAmount:
              fill.filledAuctionTakerAmount?.toString() || "0",
            status: fill.status,
          })) || [],
      },
    };

    res.status(200).json({
      success: true,
      data: responseData,
      message: simulate
        ? "Order simulation completed"
        : "Order completed successfully",
    });
  } catch (err) {
    console.error("Error creating complete cross-chain swap:", err);
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

// Get quote for cross-chain swap
router.get("/quote", async (req, res) => {
  const { amount, srcToken, dstToken, srcChainId, dstChainId } = req.query;

  console.log("🔍 Quote request received:");
  console.log("Query params:", {
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
  });

  if (!amount || !srcChainId || !dstChainId) {
    return res.status(400).json({
      error: "Amount, source chain ID, and destination chain ID are required",
    });
  }

  try {
    // Use the new getQuote function to get a quote without creating an order
    const { getQuote } = await import("../1inch_fusion_order/createOrder");

    const result = await getQuote({
      amount: amount as string,
      srcChainId: Number(srcChainId),
      dstChainId: Number(dstChainId),
      srcTokenAddress: srcToken as string,
      dstTokenAddress: dstToken as string,
    });

    console.log("✅ Quote received successfully");

    // Extract only the basic data, avoiding complex objects that might contain BigInts
    const quoteData = {
      srcChainId: Number(srcChainId),
      dstChainId: Number(dstChainId),
      srcTokenAddress: result.srcToken,
      dstTokenAddress: result.dstToken,
      amount: amount as string,
      srcTokenAmount: result.quote.srcTokenAmount.toString(),
      dstTokenAmount: result.quote.dstTokenAmount.toString(),
      quoteId: result.quote.quoteId,
    };

    res.status(200).json({
      success: true,
      data: quoteData,
      message: "Quote retrieved successfully",
    });
  } catch (err: any) {
    console.error("❌ Error getting quote:");
    console.error("Error details:", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Get order status
router.get("/order-status/:orderHash", async (req, res) => {
  const { orderHash } = req.params;

  console.log("📊 Order status request received:");
  console.log("Order hash:", orderHash);

  if (!orderHash) {
    return res.status(400).json({
      success: false,
      error: "Order hash is required",
    });
  }

  try {
    // Import the 1inch SDK to check order status
    const { getOrderStatus } = await import(
      "../1inch_fusion_order/createOrder"
    );

    const status = await getOrderStatus(orderHash);

    console.log("✅ Order status retrieved successfully");

    res.status(200).json({
      success: true,
      data: {
        status,
      },
      message: "Order status retrieved successfully",
    });
  } catch (err: any) {
    console.error("❌ Error getting order status:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;

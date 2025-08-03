/**
 * Secure Swap API - 1inch Fusion Compliant
 * 
 * READ-ONLY API that follows 1inch non-custodial security standards:
 * - No private key usage
 * - No order creation (frontend responsibility)
 * - Only provides quotes and status information
 * 
 * FRONTEND SHOULD:
 * - Initialize 1inch SDK directly with user's wallet
 * - Create and submit orders using user's private key
 * - Use this API only for quotes and status checks
 */

import express from "express";
import {
  getQuoteOnly,
  getOrderStatusOnly,
  getSupportedChains,
  getChainTokens,
  isSupportedChain,
  type QuoteRequest,
} from "../1inch_fusion_order/quoteService";

const router = express.Router();

/**
 * Get cross-chain swap quote
 * READ-ONLY: Does not create orders or use private keys
 */
router.get("/quote", async (req: express.Request, res: express.Response) => {
  const { amount, srcToken, dstToken, srcChainId, dstChainId, walletAddress } = req.query;

  console.log("🔍 Quote request received (READ-ONLY):");
  console.log("Query params:", {
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
    walletAddress,
  });

  // Validate required parameters
  if (!amount || !srcChainId || !dstChainId) {
    return res.status(400).json({
      success: false,
      error: "Amount, source chain ID, and destination chain ID are required",
    });
  }

  // Validate chain IDs
  const srcChain = Number(srcChainId);
  const dstChain = Number(dstChainId);

  if (!isSupportedChain(srcChain) || !isSupportedChain(dstChain)) {
    return res.status(400).json({
      success: false,
      error: "Unsupported chain ID. Use /supported-chains to see available chains.",
    });
  }

  try {
    const quoteRequest: QuoteRequest = {
      amount: amount as string,
      srcChainId: srcChain,
      dstChainId: dstChain,
      srcTokenAddress: srcToken as string,
      dstTokenAddress: dstToken as string,
      walletAddress: walletAddress as string,
    };

    const quote = await getQuoteOnly(quoteRequest);

    console.log("✅ Quote provided successfully (READ-ONLY)");

    res.status(200).json({
      success: true,
      data: quote,
      message: "Quote retrieved successfully. Use frontend SDK to create orders.",
      security_note: "This backend does not create orders. Use 1inch SDK in frontend with user's wallet.",
    });
  } catch (err: any) {
    console.error("❌ Error getting quote:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Get order status by hash
 * READ-ONLY: Checks status of orders created by frontend
 */
router.get("/order-status/:orderHash", async (req: express.Request, res: express.Response) => {
  const { orderHash } = req.params;

  console.log("📊 Order status request (READ-ONLY):", orderHash);

  if (!orderHash) {
    return res.status(400).json({
      success: false,
      error: "Order hash is required",
    });
  }

  try {
    const status = await getOrderStatusOnly(orderHash);

    console.log("✅ Order status provided successfully (READ-ONLY)");

    res.status(200).json({
      success: true,
      data: status,
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

/**
 * Get supported chains and tokens
 * Static configuration information
 */
router.get("/supported-chains", async (req: express.Request, res: express.Response) => {
  try {
    const supportedChains = getSupportedChains();

    res.status(200).json({
      success: true,
      data: supportedChains,
      message: "Supported chains retrieved successfully",
    });
  } catch (err: any) {
    console.error("❌ Error getting supported chains:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Get tokens for a specific chain
 */
router.get("/chains/:chainId/tokens", async (req: express.Request, res: express.Response) => {
  const { chainId } = req.params;
  const chainIdNum = Number(chainId);

  if (!chainId || isNaN(chainIdNum)) {
    return res.status(400).json({
      success: false,
      error: "Valid chain ID is required",
    });
  }

  if (!isSupportedChain(chainIdNum)) {
    return res.status(400).json({
      success: false,
      error: "Unsupported chain ID",
    });
  }

  try {
    const tokens = getChainTokens(chainIdNum);

    res.status(200).json({
      success: true,
      data: {
        chainId: chainIdNum,
        tokens,
      },
      message: "Chain tokens retrieved successfully",
    });
  } catch (err: any) {
    console.error("❌ Error getting chain tokens:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Health check endpoint
 */
router.get("/health", async (req: express.Request, res: express.Response) => {
  res.status(200).json({
    success: true,
    message: "Secure Swap API is running (READ-ONLY mode)",
    architecture: "Non-custodial - orders created in frontend",
    security_compliance: "1inch Fusion standards",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Security information endpoint
 */
router.get("/security-info", async (req: express.Request, res: express.Response) => {
  res.status(200).json({
    success: true,
    data: {
      architecture: "Non-custodial",
      backend_role: "READ-ONLY (quotes and status only)",
      order_creation: "Frontend responsibility using user's wallet",
      private_keys: "Never stored or used by backend",
      compliance: "1inch Fusion security standards",
      sdk_location: "Frontend (React/Next.js)",
      user_control: "Full - user maintains custody of funds",
    },
    message: "This backend follows 1inch non-custodial security principles",
  });
});

/**
 * Deprecated endpoints notice
 */
router.all("/cross-chain*", async (req: express.Request, res: express.Response) => {
  res.status(410).json({
    success: false,
    error: "DEPRECATED: Custodial endpoints removed for security compliance",
    message: "Use frontend 1inch SDK for order creation",
    migration_guide: {
      old_flow: "Backend creates orders (INSECURE)",
      new_flow: "Frontend SDK creates orders (SECURE)",
      compliance: "1inch non-custodial standards",
    },
    available_endpoints: [
      "GET /quote - Get swap quotes",
      "GET /order-status/:hash - Check order status", 
      "GET /supported-chains - Get chain configuration",
      "GET /chains/:id/tokens - Get chain tokens",
    ],
  });
});

router.all("/prepare-order*", async (req: express.Request, res: express.Response) => {
  res.status(410).json({
    success: false,
    error: "DEPRECATED: Order preparation moved to frontend for security",
    message: "Initialize 1inch SDK in frontend with user's wallet",
    security_reason: "Backend should never handle order creation",
  });
});

router.all("/submit-signed-order*", async (req: express.Request, res: express.Response) => {
  res.status(410).json({
    success: false,
    error: "DEPRECATED: Order submission moved to frontend for security",
    message: "Submit orders directly from frontend using 1inch SDK",
    security_reason: "User wallet should interact directly with 1inch",
  });
});

export default router;
import express from "express";
import {
  createFusionOrder,
  createCompleteFusionOrder,
  getQuote,
  submitPreparedOrder,
} from "../1inch_fusion_order/createOrder";
import {
  generateSwapMessage,
  verifyUserSignature,
  generateNonce,
  validateTimestamp,
  isValidEthereumAddress,
  createOrderPreparationHash,
  storePreparedOrder,
  consumePreparedOrder,
  validateSignedOrderRequest,
  type SignedOrderRequest,
} from "../lib/auth-utils";

const router = express.Router();

// Non-custodial flow endpoints

// Prepare order endpoint - generates order data for user to approve
router.post("/prepare-order", async (req: express.Request, res: express.Response) => {
  const {
    userWalletAddress,
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
  } = req.body;

  console.log("🔄 Preparing non-custodial order...");
  console.log("Request data:", {
    userWalletAddress,
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
  });

  // Validate required fields
  if (!userWalletAddress || !isValidEthereumAddress(userWalletAddress)) {
    return res.status(400).json({
      success: false,
      error: "Valid user wallet address is required",
    });
  }

  if (!amount || !srcChainId || !dstChainId) {
    return res.status(400).json({
      success: false,
      error: "Amount, source chain ID, and destination chain ID are required",
    });
  }

  try {
    // Generate nonce and timestamp for this preparation
    const nonce = generateNonce();
    const timestamp = Date.now();

    const orderParams = {
      amount,
      srcChainId: Number(srcChainId),
      dstChainId: Number(dstChainId),
      srcTokenAddress: srcToken,
      dstTokenAddress: dstToken,
    };

    // Create order preparation (non-custodial mode)
    const orderResult = await createFusionOrder({
      amount,
      srcChainId: Number(srcChainId),
      dstChainId: Number(dstChainId),
      srcTokenAddress: srcToken,
      dstTokenAddress: dstToken,
      userWalletAddress,
      useUserWallet: true, // Non-custodial mode
    });

    // Generate message for user to sign
    const messageToSign = generateSwapMessage(
      userWalletAddress,
      orderParams,
      timestamp,
      nonce
    );

    // Create preparation hash for linking phases
    const preparationHash = createOrderPreparationHash(
      userWalletAddress,
      orderParams,
      timestamp,
      nonce
    );

    // Store preparation data temporarily
    storePreparedOrder(preparationHash, {
      orderHash: orderResult.hash,
      userWalletAddress,
      preparationData: {
        order: orderResult.order,
        quoteId: orderResult.quoteId,
        secrets: orderResult.secrets,
        secretHashes: orderResult.secretHashes,
        srcChainId: orderParams.srcChainId,
        amount: orderParams.amount,
        srcTokenAddress: orderParams.srcTokenAddress,
        dstTokenAddress: orderParams.dstTokenAddress,
        dstChainId: orderParams.dstChainId,
      },
      timestamp,
      nonce,
    });

    console.log("✅ Order prepared successfully");
    console.log("Preparation hash:", preparationHash);

    res.status(200).json({
      success: true,
      data: {
        preparationHash,
        messageToSign,
        timestamp,
        nonce,
        orderHash: orderResult.hash,
        approvalInfo: orderResult.approvalInfo,
        quote: {
          srcTokenAmount: orderResult.quote.srcTokenAmount.toString(),
          dstTokenAmount: orderResult.quote.dstTokenAmount.toString(),
          quoteId: orderResult.quoteId,
        },
      },
      message: "Order prepared. Please sign the message and submit with your signature.",
    });
  } catch (err) {
    console.error("❌ Error preparing order:", err);
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

// Submit signed order endpoint - executes order after user approval
router.post("/submit-signed-order", async (req: express.Request, res: express.Response) => {
  const {
    preparationHash,
    userWalletAddress,
    signature,
    timestamp,
    nonce,
  } = req.body;

  console.log("🔄 Submitting signed order...");
  console.log("Request data:", {
    preparationHash,
    userWalletAddress,
    signature: signature ? "***provided***" : "missing",
    timestamp,
    nonce,
  });

  // Validate required fields
  if (!preparationHash || !userWalletAddress || !signature || !timestamp || !nonce) {
    return res.status(400).json({
      success: false,
      error: "All fields are required: preparationHash, userWalletAddress, signature, timestamp, nonce",
    });
  }

  try {
    // Retrieve prepared order data
    const preparedOrder = consumePreparedOrder(preparationHash);
    if (!preparedOrder) {
      return res.status(404).json({
        success: false,
        error: "Prepared order not found or expired",
      });
    }

    // Verify the user wallet matches
    if (preparedOrder.userWalletAddress.toLowerCase() !== userWalletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "User wallet address mismatch",
      });
    }

    // Validate timestamp
    if (!validateTimestamp(timestamp)) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired timestamp",
      });
    }

    // Reconstruct the original message and verify signature
    const orderParams = {
      amount: preparedOrder.preparationData.amount,
      srcChainId: preparedOrder.preparationData.srcChainId,
      dstChainId: preparedOrder.preparationData.dstChainId,
      srcTokenAddress: preparedOrder.preparationData.srcTokenAddress,
      dstTokenAddress: preparedOrder.preparationData.dstTokenAddress,
    };

    const expectedMessage = generateSwapMessage(
      userWalletAddress,
      orderParams,
      timestamp,
      nonce
    );

    const isValidSignature = await verifyUserSignature(
      expectedMessage,
      signature,
      userWalletAddress
    );

    if (!isValidSignature) {
      return res.status(403).json({
        success: false,
        error: "Invalid signature",
      });
    }

    // Submit the prepared order to 1inch network
    const submitResult = await submitPreparedOrder({
      order: preparedOrder.preparationData.order,
      quoteId: preparedOrder.preparationData.quoteId,
      srcChainId: preparedOrder.preparationData.srcChainId,
      secretHashes: preparedOrder.preparationData.secretHashes,
    });

    console.log("✅ Signed order submitted successfully");

    res.status(200).json({
      success: true,
      data: {
        orderHash: preparedOrder.orderHash,
        status: submitResult.status,
        secrets: preparedOrder.preparationData.secrets,
        userWalletAddress: preparedOrder.userWalletAddress,
      },
      message: "Order submitted successfully. Monitor order status for completion.",
    });
  } catch (err) {
    console.error("❌ Error submitting signed order:", err);
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

// Legacy custodial endpoints (maintained for backward compatibility)

// Generic cross-chain swap endpoint with simulation support
router.post("/cross-chain", async (req: express.Request, res: express.Response) => {
  const {
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
    userWalletAddress = "0x0000000000000000000000000000000000000000", // Default for backward compatibility
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
      userWalletAddress,
      useUserWallet: false, // Custodial mode for backward compatibility
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
router.post("/cross-chain/complete", async (req: express.Request, res: express.Response) => {
  const {
    amount,
    srcToken,
    dstToken,
    srcChainId,
    dstChainId,
    userWalletAddress = "0x0000000000000000000000000000000000000000", // Default for backward compatibility
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
      userWalletAddress,
      useUserWallet: false, // Custodial mode for backward compatibility
    });

    // Extract only the necessary data, converting BigInts to strings
    // Only include finalStatus if it exists (custodial mode)
    const responseData: any = {
      hash: result.hash,
      status: result.status,
    };

    if ((result as any).finalStatus) {
      const finalStatus = (result as any).finalStatus;
      responseData.finalStatus = {
        status: finalStatus.status,
        orderHash: finalStatus.orderHash,
        srcChainId: finalStatus.srcChainId,
        dstChainId: finalStatus.dstChainId,
        validation: finalStatus.validation,
        remainingMakerAmount:
          finalStatus.remainingMakerAmount?.toString() || "0",
        deadline: finalStatus.deadline,
        createdAt: finalStatus.createdAt,
        cancelable: finalStatus.cancelable,
        // Convert fills to safe format
        fills:
          finalStatus.fills?.map((fill: any) => ({
            txHash: fill.txHash,
            filledMakerAmount: fill.filledMakerAmount?.toString() || "0",
            filledAuctionTakerAmount:
              fill.filledAuctionTakerAmount?.toString() || "0",
            status: fill.status,
          })) || [],
      };
    }

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
router.get("/quote", async (req: express.Request, res: express.Response) => {
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
router.get("/order-status/:orderHash", async (req: express.Request, res: express.Response) => {
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

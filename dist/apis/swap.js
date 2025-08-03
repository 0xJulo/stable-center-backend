"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const createOrder_1 = require("../1inch_fusion_order/createOrder");
const auth_utils_1 = require("../lib/auth-utils");
const router = express_1.default.Router();
// Non-custodial flow endpoints
// Prepare order endpoint - generates order data for user to approve
router.post("/prepare-order", async (req, res) => {
    const { userWalletAddress, amount, srcToken, dstToken, srcChainId, dstChainId, } = req.body;
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
    if (!userWalletAddress || !(0, auth_utils_1.isValidEthereumAddress)(userWalletAddress)) {
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
        const nonce = (0, auth_utils_1.generateNonce)();
        const timestamp = Date.now();
        const orderParams = {
            amount,
            srcChainId: Number(srcChainId),
            dstChainId: Number(dstChainId),
            srcTokenAddress: srcToken,
            dstTokenAddress: dstToken,
        };
        // Create order preparation (non-custodial mode)
        const orderResult = await (0, createOrder_1.createFusionOrder)({
            amount,
            srcChainId: Number(srcChainId),
            dstChainId: Number(dstChainId),
            srcTokenAddress: srcToken,
            dstTokenAddress: dstToken,
            userWalletAddress,
            useUserWallet: true, // Non-custodial mode
        });
        // Generate message for user to sign
        const messageToSign = (0, auth_utils_1.generateSwapMessage)(userWalletAddress, orderParams, timestamp, nonce);
        // Create preparation hash for linking phases
        const preparationHash = (0, auth_utils_1.createOrderPreparationHash)(userWalletAddress, orderParams, timestamp, nonce);
        // Store preparation data temporarily
        (0, auth_utils_1.storePreparedOrder)(preparationHash, {
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
    }
    catch (err) {
        console.error("❌ Error preparing order:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});
// Submit signed order endpoint - executes order after user approval
router.post("/submit-signed-order", async (req, res) => {
    const { preparationHash, userWalletAddress, signature, timestamp, nonce, } = req.body;
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
        const preparedOrder = (0, auth_utils_1.consumePreparedOrder)(preparationHash);
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
        if (!(0, auth_utils_1.validateTimestamp)(timestamp)) {
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
        const expectedMessage = (0, auth_utils_1.generateSwapMessage)(userWalletAddress, orderParams, timestamp, nonce);
        const isValidSignature = await (0, auth_utils_1.verifyUserSignature)(expectedMessage, signature, userWalletAddress);
        if (!isValidSignature) {
            return res.status(403).json({
                success: false,
                error: "Invalid signature",
            });
        }
        // Submit the prepared order to 1inch network
        const submitResult = await (0, createOrder_1.submitPreparedOrder)({
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
    }
    catch (err) {
        console.error("❌ Error submitting signed order:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});
// Legacy custodial endpoints (maintained for backward compatibility)
// Generic cross-chain swap endpoint with simulation support
router.post("/cross-chain", async (req, res) => {
    const { amount, srcToken, dstToken, srcChainId, dstChainId, userWalletAddress = "0x0000000000000000000000000000000000000000", // Default for backward compatibility
    simulate = false, } = req.body;
    if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
    }
    if (!srcChainId || !dstChainId) {
        return res
            .status(400)
            .json({ error: "Source and destination chain IDs are required" });
    }
    try {
        const result = await (0, createOrder_1.createFusionOrder)({
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
    }
    catch (err) {
        console.error("Error creating cross-chain swap:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});
// Complete cross-chain swap with monitoring endpoint
router.post("/cross-chain/complete", async (req, res) => {
    const { amount, srcToken, dstToken, srcChainId, dstChainId, userWalletAddress = "0x0000000000000000000000000000000000000000", // Default for backward compatibility
    simulate = false, } = req.body;
    if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
    }
    if (!srcChainId || !dstChainId) {
        return res
            .status(400)
            .json({ error: "Source and destination chain IDs are required" });
    }
    try {
        const result = await (0, createOrder_1.createCompleteFusionOrder)({
            amount: amount,
            srcChainId: Number(srcChainId),
            dstChainId: Number(dstChainId),
            srcTokenAddress: srcToken,
            dstTokenAddress: dstToken,
            userWalletAddress,
            useUserWallet: false, // Custodial mode for backward compatibility
        });
        // Extract only the necessary data, converting BigInts to strings
        // Only include finalStatus if it exists (custodial mode)
        const responseData = {
            hash: result.hash,
            status: result.status,
        };
        if (result.finalStatus) {
            const finalStatus = result.finalStatus;
            responseData.finalStatus = {
                status: finalStatus.status,
                orderHash: finalStatus.orderHash,
                srcChainId: finalStatus.srcChainId,
                dstChainId: finalStatus.dstChainId,
                validation: finalStatus.validation,
                remainingMakerAmount: finalStatus.remainingMakerAmount?.toString() || "0",
                deadline: finalStatus.deadline,
                createdAt: finalStatus.createdAt,
                cancelable: finalStatus.cancelable,
                // Convert fills to safe format
                fills: finalStatus.fills?.map((fill) => ({
                    txHash: fill.txHash,
                    filledMakerAmount: fill.filledMakerAmount?.toString() || "0",
                    filledAuctionTakerAmount: fill.filledAuctionTakerAmount?.toString() || "0",
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
    }
    catch (err) {
        console.error("Error creating complete cross-chain swap:", err);
        res.status(500).json({
            success: false,
            error: err.message,
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
        const { getQuote } = await Promise.resolve().then(() => __importStar(require("../1inch_fusion_order/createOrder")));
        const result = await getQuote({
            amount: amount,
            srcChainId: Number(srcChainId),
            dstChainId: Number(dstChainId),
            srcTokenAddress: srcToken,
            dstTokenAddress: dstToken,
        });
        console.log("✅ Quote received successfully");
        // Extract only the basic data, avoiding complex objects that might contain BigInts
        const quoteData = {
            srcChainId: Number(srcChainId),
            dstChainId: Number(dstChainId),
            srcTokenAddress: result.srcToken,
            dstTokenAddress: result.dstToken,
            amount: amount,
            srcTokenAmount: result.quote.srcTokenAmount.toString(),
            dstTokenAmount: result.quote.dstTokenAmount.toString(),
            quoteId: result.quote.quoteId,
        };
        res.status(200).json({
            success: true,
            data: quoteData,
            message: "Quote retrieved successfully",
        });
    }
    catch (err) {
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
        const { getOrderStatus } = await Promise.resolve().then(() => __importStar(require("../1inch_fusion_order/createOrder")));
        const status = await getOrderStatus(orderHash);
        console.log("✅ Order status retrieved successfully");
        res.status(200).json({
            success: true,
            data: {
                status,
            },
            message: "Order status retrieved successfully",
        });
    }
    catch (err) {
        console.error("❌ Error getting order status:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=swap.js.map
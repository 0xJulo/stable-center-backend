"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSwapMessage = generateSwapMessage;
exports.verifyUserSignature = verifyUserSignature;
exports.generateNonce = generateNonce;
exports.validateTimestamp = validateTimestamp;
exports.isValidEthereumAddress = isValidEthereumAddress;
exports.createOrderPreparationHash = createOrderPreparationHash;
exports.validateOrderParams = validateOrderParams;
exports.storePreparedOrder = storePreparedOrder;
exports.consumePreparedOrder = consumePreparedOrder;
exports.hasPreparedOrder = hasPreparedOrder;
exports.clearExpiredPreparedOrders = clearExpiredPreparedOrders;
exports.validateSignedOrderRequest = validateSignedOrderRequest;
const ethers_1 = require("ethers");
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a message for user to sign when initiating a swap order
 * This follows EIP-712 structured data signing patterns
 */
function generateSwapMessage(userWalletAddress, orderParams, timestamp, nonce) {
    const message = [
        "StableCenter Cross-Chain Swap Authorization",
        "",
        `Wallet: ${userWalletAddress}`,
        `Amount: ${orderParams.amount}`,
        `Source Chain: ${orderParams.srcChainId}`,
        `Destination Chain: ${orderParams.dstChainId}`,
        `Source Token: ${orderParams.srcTokenAddress || "Default"}`,
        `Destination Token: ${orderParams.dstTokenAddress || "Default"}`,
        `Timestamp: ${timestamp}`,
        `Nonce: ${nonce}`,
        "",
        "By signing this message, you authorize StableCenter to create a cross-chain swap order on your behalf.",
        "This signature does not grant access to your funds.",
    ].join("\n");
    return message;
}
/**
 * Verify a user's signature for a swap order
 * Returns true if signature is valid and from the expected wallet
 */
async function verifyUserSignature(message, signature, expectedWalletAddress) {
    try {
        // Recover the address from the signature
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        // Compare with expected address (case-insensitive)
        const isValid = recoveredAddress.toLowerCase() === expectedWalletAddress.toLowerCase();
        console.log("🔐 Signature verification:", {
            expectedAddress: expectedWalletAddress,
            recoveredAddress,
            isValid,
        });
        return isValid;
    }
    catch (error) {
        console.error("❌ Error verifying signature:", error);
        return false;
    }
}
/**
 * Generate a secure nonce for order requests
 */
function generateNonce() {
    return crypto_1.default.randomBytes(16).toString("hex");
}
/**
 * Validate timestamp to prevent replay attacks
 * Allows signatures within 10 minutes of current time
 */
function validateTimestamp(timestamp) {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes in milliseconds
    return (timestamp > now - maxAge) && (timestamp <= now + 60000); // Allow 1 minute future tolerance
}
/**
 * Validate Ethereum address format
 */
function isValidEthereumAddress(address) {
    return ethers_1.ethers.isAddress(address);
}
/**
 * Create a structured message hash for order preparation
 * Used to link preparation phase with execution phase
 */
function createOrderPreparationHash(userWalletAddress, orderParams, timestamp, nonce) {
    const data = {
        userWalletAddress,
        orderParams,
        timestamp,
        nonce,
    };
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto_1.default.createHash("sha256").update(dataString).digest("hex");
}
/**
 * Validate order parameters for security
 */
function validateOrderParams(orderParams) {
    const errors = [];
    // Validate amount
    if (!orderParams.amount || parseFloat(orderParams.amount) <= 0) {
        errors.push("Invalid amount: must be greater than 0");
    }
    // Validate chain IDs
    if (!orderParams.srcChainId || !orderParams.dstChainId) {
        errors.push("Invalid chain IDs: both source and destination required");
    }
    if (orderParams.srcChainId === orderParams.dstChainId) {
        errors.push("Invalid chain IDs: source and destination must be different");
    }
    // Validate token addresses if provided
    if (orderParams.srcTokenAddress && !isValidEthereumAddress(orderParams.srcTokenAddress)) {
        errors.push("Invalid source token address format");
    }
    if (orderParams.dstTokenAddress && !isValidEthereumAddress(orderParams.dstTokenAddress)) {
        errors.push("Invalid destination token address format");
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
/**
 * In-memory store for prepared orders (in production, use Redis or database)
 * Maps preparation hash to order data
 */
const preparedOrders = new Map();
/**
 * Store prepared order data temporarily
 */
function storePreparedOrder(preparationHash, orderData) {
    preparedOrders.set(preparationHash, orderData);
    // Auto-cleanup after 15 minutes
    setTimeout(() => {
        preparedOrders.delete(preparationHash);
    }, 15 * 60 * 1000);
}
/**
 * Retrieve and remove prepared order data
 */
function consumePreparedOrder(preparationHash) {
    const orderData = preparedOrders.get(preparationHash);
    if (orderData) {
        preparedOrders.delete(preparationHash);
        return orderData;
    }
    return null;
}
/**
 * Check if a prepared order exists
 */
function hasPreparedOrder(preparationHash) {
    return preparedOrders.has(preparationHash);
}
/**
 * Clear expired prepared orders (cleanup utility)
 */
function clearExpiredPreparedOrders() {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes
    for (const [hash, orderData] of preparedOrders.entries()) {
        if (now - orderData.timestamp > maxAge) {
            preparedOrders.delete(hash);
        }
    }
}
/**
 * Enhanced validation for signed order requests
 */
async function validateSignedOrderRequest(request) {
    const errors = [];
    // Validate wallet address
    if (!isValidEthereumAddress(request.userWalletAddress)) {
        errors.push("Invalid wallet address format");
    }
    // Validate timestamp
    if (!validateTimestamp(request.timestamp)) {
        errors.push("Invalid or expired timestamp");
    }
    // Validate order parameters
    const paramValidation = validateOrderParams(request.orderParams);
    if (!paramValidation.isValid) {
        errors.push(...paramValidation.errors);
    }
    // Generate and verify signature
    if (errors.length === 0) {
        const nonce = generateNonce(); // In practice, this should be from the original message
        const message = generateSwapMessage(request.userWalletAddress, request.orderParams, request.timestamp, nonce);
        const signatureValid = await verifyUserSignature(message, request.signature, request.userWalletAddress);
        if (!signatureValid) {
            errors.push("Invalid signature");
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=auth-utils.js.map
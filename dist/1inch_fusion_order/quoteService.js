"use strict";
/**
 * 1inch Fusion Quote Service
 *
 * READ-ONLY service for getting cross-chain swap quotes.
 * This service does NOT create orders or handle private keys.
 *
 * SECURITY COMPLIANCE:
 * - No private key usage (non-custodial principle)
 * - No order creation (user wallet responsibility)
 * - Only provides quotes and chain information
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TOKENS = exports.SUPPORTED_CHAINS = exports.NetworkEnum = void 0;
exports.getQuoteOnly = getQuoteOnly;
exports.getOrderStatusOnly = getOrderStatusOnly;
exports.getSupportedChains = getSupportedChains;
exports.isSupportedChain = isSupportedChain;
exports.getChainTokens = getChainTokens;
const dotenv_1 = __importDefault(require("dotenv"));
// Chain constants (previously from SDK)
exports.NetworkEnum = {
    ETHEREUM: 1,
    COINBASE: 8453,
    AVALANCHE: 43114,
    BINANCE: 56,
};
dotenv_1.default.config({ path: "../.env" });
// Validate environment variables (only auth key needed for quotes)
const authKey = process.env.FUSION_AUTH_KEY;
if (!authKey) {
    throw new Error("FUSION_AUTH_KEY environment variable is required for quotes");
}
// Chain IDs supported by 1inch Fusion
exports.SUPPORTED_CHAINS = {
    ETHEREUM: exports.NetworkEnum.ETHEREUM,
    BASE: exports.NetworkEnum.COINBASE,
    AVALANCHE: exports.NetworkEnum.AVALANCHE,
    BSC: exports.NetworkEnum.BINANCE,
};
// Default token addresses for different chains
exports.DEFAULT_TOKENS = {
    [exports.SUPPORTED_CHAINS.ETHEREUM]: {
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    },
    [exports.SUPPORTED_CHAINS.BASE]: {
        USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        USDT: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
        WETH: "0x4200000000000000000000000000000000000006",
    },
    [exports.SUPPORTED_CHAINS.AVALANCHE]: {
        USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
        WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    },
    [exports.SUPPORTED_CHAINS.BSC]: {
        USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
};
/**
 * Get a cross-chain swap quote from 1inch Fusion API
 * This is a READ-ONLY operation that doesn't require private keys
 */
async function getQuoteOnly(request) {
    const { amount, srcChainId, dstChainId, srcTokenAddress, dstTokenAddress, walletAddress = "0x0000000000000000000000000000000000000000", // Default for quotes
     } = request;
    // Validate parameters
    if (!amount || parseFloat(amount) <= 0) {
        throw new Error("Invalid amount: must be greater than 0");
    }
    if (!srcChainId || !dstChainId) {
        throw new Error("Source and destination chain IDs are required");
    }
    if (srcChainId === dstChainId) {
        throw new Error("Source and destination chains must be different");
    }
    // Get default tokens if not provided
    const finalSrcToken = srcTokenAddress || getDefaultToken(srcChainId, "USDC");
    const finalDstToken = dstTokenAddress || getDefaultToken(dstChainId, "USDC");
    if (!finalSrcToken || !finalDstToken) {
        throw new Error("Could not determine token addresses for the specified chains");
    }
    console.log("🔍 Getting quote (READ-ONLY):");
    console.log({
        amount,
        srcChainId,
        dstChainId,
        srcToken: finalSrcToken,
        dstToken: finalDstToken,
        walletAddress,
    });
    try {
        // Make direct API call to 1inch Fusion for quote
        const quotePayload = {
            amount,
            srcChainId,
            dstChainId,
            enableEstimate: true,
            srcTokenAddress: finalSrcToken,
            dstTokenAddress: finalDstToken,
            walletAddress,
        };
        const response = await fetch("https://api.1inch.dev/fusion-plus/quoter/v1.0/quote", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${authKey}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(quotePayload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`1inch API error (${response.status}): ${errorText}`);
        }
        const quoteData = await response.json();
        console.log("✅ Quote received successfully");
        return {
            srcChainId,
            dstChainId,
            srcTokenAddress: finalSrcToken,
            dstTokenAddress: finalDstToken,
            amount,
            srcTokenAmount: quoteData.srcTokenAmount?.toString() || amount,
            dstTokenAmount: quoteData.dstTokenAmount?.toString() || "0",
            quoteId: quoteData.quoteId || "",
            presets: quoteData.presets || {},
            estimatedGas: quoteData.estimatedGas?.toString(),
        };
    }
    catch (error) {
        console.error("❌ Error getting quote:", error);
        throw new Error(`Failed to get quote: ${error.message}`);
    }
}
/**
 * Get order status from 1inch Fusion API
 * READ-ONLY operation for checking order progress
 */
async function getOrderStatusOnly(orderHash) {
    if (!orderHash) {
        throw new Error("Order hash is required");
    }
    console.log("📊 Getting order status (READ-ONLY):", orderHash);
    try {
        const response = await fetch(`https://api.1inch.dev/fusion-plus/orders/v1.0/order/status/${orderHash}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${authKey}`,
                Accept: "application/json",
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`1inch API error (${response.status}): ${errorText}`);
        }
        const statusData = await response.json();
        console.log("✅ Order status retrieved successfully");
        return statusData;
    }
    catch (error) {
        console.error("❌ Error getting order status:", error);
        throw new Error(`Failed to get order status: ${error.message}`);
    }
}
/**
 * Get supported chains and their configurations
 * Static information for frontend
 */
function getSupportedChains() {
    return {
        chains: exports.SUPPORTED_CHAINS,
        tokens: exports.DEFAULT_TOKENS,
    };
}
/**
 * Helper function to get default token for a chain
 */
function getDefaultToken(chainId, tokenType = "USDC") {
    const chainTokens = exports.DEFAULT_TOKENS[chainId];
    if (chainTokens && chainTokens[tokenType]) {
        return chainTokens[tokenType];
    }
    return null;
}
/**
 * Validate if a chain is supported
 */
function isSupportedChain(chainId) {
    return Object.values(exports.SUPPORTED_CHAINS).includes(chainId);
}
/**
 * Get token information for a specific chain
 */
function getChainTokens(chainId) {
    if (!isSupportedChain(chainId)) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return exports.DEFAULT_TOKENS[chainId] || {};
}
//# sourceMappingURL=quoteService.js.map
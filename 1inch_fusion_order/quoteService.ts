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

import dotenv from "dotenv";

// Chain constants (previously from SDK)
export const NetworkEnum = {
  ETHEREUM: 1,
  COINBASE: 8453,
  AVALANCHE: 43114,
  BINANCE: 56,
} as const;

dotenv.config({ path: "../.env" });

// Validate environment variables (only auth key needed for quotes)
const authKey = process.env.FUSION_AUTH_KEY;

if (!authKey) {
  throw new Error("FUSION_AUTH_KEY environment variable is required for quotes");
}

// Chain IDs supported by 1inch Fusion
export const SUPPORTED_CHAINS = {
  ETHEREUM: NetworkEnum.ETHEREUM,
  BASE: NetworkEnum.COINBASE,
  AVALANCHE: NetworkEnum.AVALANCHE,
  BSC: NetworkEnum.BINANCE,
} as const;

// Default token addresses for different chains
export const DEFAULT_TOKENS = {
  [SUPPORTED_CHAINS.ETHEREUM]: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  [SUPPORTED_CHAINS.BASE]: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    WETH: "0x4200000000000000000000000000000000000006",
  },
  [SUPPORTED_CHAINS.AVALANCHE]: {
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  },
  [SUPPORTED_CHAINS.BSC]: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  },
} as const;

export interface QuoteRequest {
  amount: string;
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress?: string;
  dstTokenAddress?: string;
  walletAddress?: string; // Optional for quote estimation
}

export interface QuoteResponse {
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string;
  srcTokenAmount: string;
  dstTokenAmount: string;
  quoteId: string;
  presets?: {
    fast?: {
      secretsCount: number;
      [key: string]: any;
    };
  };
  estimatedGas?: string;
}

/**
 * Get a cross-chain swap quote from 1inch Fusion API
 * This is a READ-ONLY operation that doesn't require private keys
 */
export async function getQuoteOnly(request: QuoteRequest): Promise<QuoteResponse> {
  const {
    amount,
    srcChainId,
    dstChainId,
    srcTokenAddress,
    dstTokenAddress,
    walletAddress = "0x0000000000000000000000000000000000000000", // Default for quotes
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

    const response = await fetch(
      "https://api.1inch.dev/fusion-plus/quoter/v1.0/quote",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(quotePayload),
      }
    );

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
  } catch (error) {
    console.error("❌ Error getting quote:", error);
    throw new Error(`Failed to get quote: ${(error as Error).message}`);
  }
}

/**
 * Get order status from 1inch Fusion API
 * READ-ONLY operation for checking order progress
 */
export async function getOrderStatusOnly(orderHash: string): Promise<any> {
  if (!orderHash) {
    throw new Error("Order hash is required");
  }

  console.log("📊 Getting order status (READ-ONLY):", orderHash);

  try {
    const response = await fetch(
      `https://api.1inch.dev/fusion-plus/orders/v1.0/order/status/${orderHash}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`1inch API error (${response.status}): ${errorText}`);
    }

    const statusData = await response.json();
    console.log("✅ Order status retrieved successfully");
    
    return statusData;
  } catch (error) {
    console.error("❌ Error getting order status:", error);
    throw new Error(`Failed to get order status: ${(error as Error).message}`);
  }
}

/**
 * Get supported chains and their configurations
 * Static information for frontend
 */
export function getSupportedChains() {
  return {
    chains: SUPPORTED_CHAINS,
    tokens: DEFAULT_TOKENS,
  };
}

/**
 * Helper function to get default token for a chain
 */
function getDefaultToken(
  chainId: number,
  tokenType: "USDC" | "USDT" | "WETH" | "WAVAX" | "WBNB" = "USDC"
): string | null {
  const chainTokens = DEFAULT_TOKENS[chainId as keyof typeof DEFAULT_TOKENS];
  if (chainTokens && chainTokens[tokenType as keyof typeof chainTokens]) {
    return chainTokens[tokenType as keyof typeof chainTokens];
  }
  return null;
}

/**
 * Validate if a chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAINS).includes(chainId as any);
}

/**
 * Get token information for a specific chain
 */
export function getChainTokens(chainId: number) {
  if (!isSupportedChain(chainId)) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  return DEFAULT_TOKENS[chainId as keyof typeof DEFAULT_TOKENS] || {};
}
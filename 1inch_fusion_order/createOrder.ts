import {
  HashLock,
  NetworkEnum,
  OrderStatus,
  PresetEnum,
  PrivateKeyProviderConnector,
  SDK,
} from "@1inch/cross-chain-sdk";
import Web3 from "web3";
import { ethers } from "ethers";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";

// ERC-20 ABI for approve function
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

dotenv.config({ path: "../../.env" });

// Validate environment variables
const privateKey = process.env.PRIVATE_KEY;
const authKey = process.env.FUSION_AUTH_KEY;
const rpcUrl = process.env.RPC_URL;

if (!privateKey) {
  throw new Error("PRIVATE_KEY environment variable is required");
}

if (!authKey) {
  throw new Error("FUSION_AUTH_KEY environment variable is required");
}

if (!rpcUrl) {
  throw new Error("RPC_URL environment variable is required");
}

// Validate private key format
if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
  throw new Error(
    "PRIVATE_KEY must be a valid 32-byte hex string starting with '0x' (64 hex characters + '0x' prefix)"
  );
}

const rpc = rpcUrl;
const source = "stablescenter";

const web3 = new Web3(rpc);

// Validate private key by trying to create an account
let walletAddress: string;
try {
  walletAddress = web3.eth.accounts.privateKeyToAccount(privateKey).address;
} catch (error) {
  throw new Error(`Invalid PRIVATE_KEY: ${(error as Error).message}`);
}

const sdk = new SDK({
  url: "https://api.1inch.dev/fusion-plus",
  authKey,
  blockchainProvider: new PrivateKeyProviderConnector(privateKey, web3 as any),
  httpProvider: {
    get: async (url: string) => {
      console.log("🌐 HTTP GET Request:", url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: "application/json",
        },
      });
      console.log("🌐 HTTP GET Response Status:", response.status);
      const data = await response.json();
      console.log("🌐 HTTP GET Response Data Keys:", Object.keys(data));
      return data;
    },
    post: async (url: string, data: unknown) => {
      console.log("🌐 HTTP POST Request:", url);
      console.log("🌐 HTTP POST Request Data Keys:", Object.keys(data as any));
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });
      console.log("🌐 HTTP POST Response Status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("🌐 HTTP POST Error Response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Check if response has content
      const responseText = await response.text();
      console.log("🌐 HTTP POST Response Text:", responseText);

      if (!responseText || responseText.trim() === "") {
        console.log(
          "🌐 HTTP POST Response: Empty response (this is normal for successful submissions)"
        );
        return { success: true, status: response.status };
      }

      try {
        const responseData = JSON.parse(responseText);
        console.log(
          "🌐 HTTP POST Response Data Keys:",
          Object.keys(responseData)
        );
        return responseData;
      } catch (parseError) {
        console.log("🌐 HTTP POST Response Parse Error:", parseError);
        console.log("🌐 HTTP POST Raw Response:", responseText);
        throw new Error(`Failed to parse response: ${responseText}`);
      }
    },
  },
});

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to check and approve token allowance
async function ensureTokenAllowance(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
): Promise<void> {
  console.log("🔐 Checking token allowance...");
  console.log("  - Token:", tokenAddress);
  console.log("  - Spender:", spenderAddress);
  console.log("  - Amount:", amount);

  const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);

  // Check current allowance
  const currentAllowance = await tokenContract.methods
    .allowance(walletAddress, spenderAddress)
    .call({ from: walletAddress });

  console.log("  - Current allowance:", currentAllowance);
  console.log("  - Required amount:", amount);

  if (BigInt(currentAllowance as any) >= BigInt(amount)) {
    console.log("✅ Sufficient allowance already exists");
    return;
  }

  console.log("⚠️ Insufficient allowance, approving...");

  // Approve maximum amount (unlimited allowance)
  const maxAmount =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2^256 - 1

  const approveTx = await tokenContract.methods
    .approve(spenderAddress, maxAmount)
    .send({ from: walletAddress, gas: "100000" });

  console.log("✅ Token approval successful");
  console.log("  - Transaction hash:", approveTx.transactionHash);
}

// Chain IDs
const CHAIN_IDS = {
  ETHEREUM: NetworkEnum.ETHEREUM,
  BASE: NetworkEnum.COINBASE,
  AVALANCHE: NetworkEnum.AVALANCHE,
  BSC: NetworkEnum.BINANCE,
};

// Default token addresses for different chains
const DEFAULT_TOKENS = {
  [CHAIN_IDS.ETHEREUM]: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on Ethereum
  },
  [CHAIN_IDS.BASE]: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    USDT: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // USDT on Base
    WETH: "0x4200000000000000000000000000000000000006", // WETH on Base
  },
  [CHAIN_IDS.AVALANCHE]: {
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC on Avalanche
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT on Avalanche
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // Wrapped AVAX
  },
  [CHAIN_IDS.BSC]: {
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on BSC
    USDT: "0x55d398326f99059fF775485246999027B3197955", // USDT on BSC
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB on BSC
  },
};

export async function getQuote({
  amount,
  srcChainId,
  dstChainId,
  srcTokenAddress,
  dstTokenAddress,
}: {
  amount: string;
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress?: string;
  dstTokenAddress?: string;
}) {
  try {
    console.log("🔍 Getting quote for cross-chain swap...");
    console.log("Parameters:", {
      amount,
      srcChainId,
      dstChainId,
      srcTokenAddress,
      dstTokenAddress,
    });

    // Validate chain IDs
    if (!srcChainId || !dstChainId) {
      throw new Error("Source and destination chain IDs are required");
    }

    if (srcChainId === dstChainId) {
      throw new Error(
        "Source and destination chain IDs must be different for cross-chain swaps"
      );
    }

    // Use default tokens if not provided, based on the source chain
    let finalSrcToken = srcTokenAddress;
    let finalDstToken = dstTokenAddress;

    // Helper function to get default token for a chain
    const getDefaultTokenForChain = (
      chainId: number,
      tokenType: "USDC" | "USDT" | "WETH" | "WAVAX" = "USDC"
    ) => {
      const chainTokens =
        DEFAULT_TOKENS[chainId as keyof typeof DEFAULT_TOKENS];
      if (chainTokens && chainTokens[tokenType]) {
        return chainTokens[tokenType];
      }
      return null;
    };

    if (!finalSrcToken) {
      const defaultToken = getDefaultTokenForChain(srcChainId);
      if (defaultToken) {
        finalSrcToken = defaultToken;
      } else {
        throw new Error(
          `Source token address is required for chain ID ${srcChainId}. No default token available.`
        );
      }
    }

    if (!finalDstToken) {
      const defaultToken = getDefaultTokenForChain(dstChainId);
      if (defaultToken) {
        finalDstToken = defaultToken;
      } else {
        throw new Error(
          `Destination token address is required for chain ID ${dstChainId}. No default token available.`
        );
      }
    }

    console.log(
      `Getting quote for cross-chain swap from chain ${srcChainId} to chain ${dstChainId}`
    );
    console.log(`Source token: ${finalSrcToken}`);
    console.log(`Destination token: ${finalDstToken}`);
    console.log(`Amount: ${amount}`);
    console.log(`Wallet address: ${walletAddress}`);

    // Validate parameters
    if (!finalSrcToken || !finalDstToken) {
      throw new Error("Invalid token addresses");
    }

    if (!amount || parseFloat(amount) <= 0) {
      throw new Error("Invalid amount");
    }

    console.log("✅ Parameters validated successfully");

    // Get quote using the SDK
    const quotePayload = {
      amount,
      srcChainId,
      dstChainId,
      enableEstimate: true,
      srcTokenAddress: finalSrcToken,
      dstTokenAddress: finalDstToken,
      walletAddress,
    };

    console.log("📤 Getting quote - Quote payload:");
    console.log(JSON.stringify(quotePayload, null, 2));

    const quote = await sdk.getQuote(quotePayload);

    console.log("✅ Quote received:", {
      srcTokenAmount: quote.srcTokenAmount.toString(),
      dstTokenAmount: quote.dstTokenAmount.toString(),
      quoteId: quote.quoteId,
    });

    return {
      quote,
      srcToken: finalSrcToken,
      dstToken: finalDstToken,
    };
  } catch (error) {
    console.error("❌ Error getting quote:");
    console.error("Error details:", error);
    console.error("Error message:", (error as Error).message);
    console.error("Error stack:", (error as Error).stack);

    // Check if it's an API error
    if (error instanceof Error) {
      if (error.message.includes("HTTP")) {
        console.error("This is an HTTP error from the 1inch API");
      }
      if (error.message.includes("BigInt")) {
        console.error(
          "This is a BigInt conversion error - likely invalid API response"
        );
      }
    }

    throw new Error(`Failed to get quote: ${(error as Error).message}`);
  }
}

export async function createFusionOrder({
  amount,
  srcChainId,
  dstChainId,
  srcTokenAddress,
  dstTokenAddress,
  userWalletAddress = "0x0000000000000000000000000000000000000000", // Default for quotes
}: {
  amount: string;
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress?: string;
  dstTokenAddress?: string;
  userWalletAddress?: string;
}) {
  try {
    // Validate chain IDs
    if (!srcChainId || !dstChainId) {
      throw new Error("Source and destination chain IDs are required");
    }

    if (srcChainId === dstChainId) {
      throw new Error(
        "Source and destination chain IDs must be different for cross-chain swaps"
      );
    }

    // Use default tokens if not provided, based on the source chain
    let finalSrcToken = srcTokenAddress;
    let finalDstToken = dstTokenAddress;

    // Helper function to get default token for a chain
    const getDefaultTokenForChain = (
      chainId: number,
      tokenType: "USDC" | "USDT" | "WETH" | "WAVAX" = "USDC"
    ) => {
      const chainTokens =
        DEFAULT_TOKENS[chainId as keyof typeof DEFAULT_TOKENS];
      if (chainTokens && chainTokens[tokenType]) {
        return chainTokens[tokenType];
      }
      return null;
    };

    if (!finalSrcToken) {
      const defaultToken = getDefaultTokenForChain(srcChainId);
      if (defaultToken) {
        finalSrcToken = defaultToken;
      } else {
        throw new Error(
          `Source token address is required for chain ID ${srcChainId}. No default token available.`
        );
      }
    }

    if (!finalDstToken) {
      const defaultToken = getDefaultTokenForChain(dstChainId);
      if (defaultToken) {
        finalDstToken = defaultToken;
      } else {
        throw new Error(
          `Destination token address is required for chain ID ${dstChainId}. No default token available.`
        );
      }
    }

    console.log(
      `Creating cross-chain order from chain ${srcChainId} to chain ${dstChainId}`
    );
    console.log(`Source token: ${finalSrcToken}`);
    console.log(`Destination token: ${finalDstToken}`);
    console.log(`Amount: ${amount}`);
    console.log(`User wallet: ${userWalletAddress}`);

    // Get quote
    const quotePayload = {
      amount,
      srcChainId,
      dstChainId,
      enableEstimate: true,
      srcTokenAddress: finalSrcToken,
      dstTokenAddress: finalDstToken,
      walletAddress,
    };

    console.log("📤 Creating fusion order - Quote payload:");
    console.log(JSON.stringify(quotePayload, null, 2));

    const quote = await sdk.getQuote(quotePayload);

    const preset = PresetEnum.fast;

    // Generate secrets
    const secrets = Array.from({
      length: quote.presets[preset].secretsCount,
    }).map(() => "0x" + randomBytes(32).toString("hex"));

    const hashLock =
      secrets.length === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets));

    const secretHashes = secrets.map((s) => HashLock.hashSecret(s));

    // Create order
    const { hash, quoteId, order } = await sdk.createOrder(quote, {
      walletAddress,
      hashLock,
      preset,
      source,
      secretHashes,
    });

    console.log("✅ Order created successfully");
    console.log("📋 Order hash:", hash);
    console.log("📋 Quote ID:", quoteId);

    // Submit order
    console.log("🔄 Calling sdk.submitOrder()...");
    const _orderInfo = await sdk.submitOrder(
      quote.srcChainId,
      order as any,
      quoteId,
      secretHashes
    );
    console.log("✅ Order submitted successfully");

    return {
      hash,
      secrets,
      secretHashes,
      quote,
      status: "submitted",
      // Return approval info for frontend
      approvalInfo: {
        tokenAddress: finalSrcToken,
        spenderAddress: "0x111111125421ca6dc452d289314280a0f8842a65", // aggregation router v6
        amount: amount,
      },
    };
  } catch (error) {
    console.error("Error creating fusion order:", error);
    throw new Error(
      `Failed to create fusion order: ${(error as Error).message}`
    );
  }
}

export async function getOrderStatus(hash: string): Promise<any> {
  try {
    console.log(`Getting order status for hash: ${hash}`);

    // Make direct HTTP call to 1inch API
    const response = await fetch(
      `https://api.1inch.dev/fusion-plus/orders/v1.0/order/status/${hash}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`1inch API responded with status: ${response.status}`);
    }

    const statusResponse = await response.json();
    console.log("Order status:", statusResponse);
    return statusResponse;
  } catch (error) {
    console.error("Error getting order status:", error);
    throw new Error(`Failed to get order status: ${(error as Error).message}`);
  }
}

export async function monitorOrderStatus(
  hash: string,
  secrets: string[]
): Promise<any> {
  try {
    console.log(`Monitoring order status for hash: ${hash}`);

    // Submit secrets for deployed escrows
    while (true) {
      const secretsToShare = await sdk.getReadyToAcceptSecretFills(hash);

      if (secretsToShare.fills.length) {
        for (const { idx } of secretsToShare.fills) {
          await sdk.submitSecret(hash, secrets[idx]);
          console.log({ idx }, "shared secret");
        }
      }

      // Check if order finished
      const statusResponse = await getOrderStatus(hash);
      const status = statusResponse.status;

      if (
        status === "executed" ||
        status === "expired" ||
        status === "refunded"
      ) {
        break;
      }

      await sleep(1000);
    }

    const statusResponse = await getOrderStatus(hash);
    console.log("Final order status:", statusResponse);
    return statusResponse;
  } catch (error) {
    console.error("Error monitoring order status:", error);
    throw new Error(
      `Failed to monitor order status: ${(error as Error).message}`
    );
  }
}

export async function createCompleteFusionOrder({
  amount,
  srcChainId,
  dstChainId,
  srcTokenAddress,
  dstTokenAddress,
}: {
  amount: string;
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress?: string;
  dstTokenAddress?: string;
}) {
  try {
    // Create the order
    const orderResult = await createFusionOrder({
      amount,
      srcChainId,
      dstChainId,
      srcTokenAddress,
      dstTokenAddress,
    });

    // Monitor the order status until completion
    const finalStatus = await monitorOrderStatus(
      orderResult.hash,
      orderResult.secrets
    );

    return {
      ...orderResult,
      finalStatus,
    };
  } catch (error) {
    console.error("Error in complete fusion order:", error);
    throw error;
  }
}

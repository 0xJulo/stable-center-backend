const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");

console.log(
  "🔧 Setting up environment variables for 1inch Cross-Chain Swap...\n"
);

// Check if .env file exists
if (fs.existsSync(envPath)) {
  console.log("✅ .env file already exists");
} else {
  console.log("📝 Creating .env file...");
  fs.writeFileSync(envPath, "");
}

console.log("\n📋 Required environment variables:");
console.log("1. PRIVATE_KEY - Your wallet private key (0x... format)");
console.log("2. FUSION_AUTH_KEY - Your 1inch Fusion+ API key");
console.log("3. RPC_URL - Your Ethereum RPC endpoint (e.g., Alchemy, Infura)");
console.log("\n💡 Example .env file:");
console.log(
  "PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
);
console.log("FUSION_AUTH_KEY=your_1inch_fusion_api_key_here");
console.log("RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_alchemy_key");

console.log("\n⚠️  Important notes:");
console.log("- Keep your PRIVATE_KEY secure and never share it");
console.log("- Use a dedicated wallet for testing");
console.log(
  "- The RPC_URL should support eth_sendTransaction (Alchemy, Infura, etc.)"
);
console.log("- Get your FUSION_AUTH_KEY from https://portal.1inch.dev/");

console.log("\n🚀 After setting up your .env file, run:");
console.log("npm install");
console.log("npm run dev");

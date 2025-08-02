const { spawn } = require("child_process");
const path = require("path");

console.log("🚀 Cross-Chain Swap Test Runner");
console.log("================================\n");

// Check if server is running
async function checkServer() {
  const axios = require("axios");
  try {
    await axios.get("http://localhost:3001/health");
    console.log("✅ Server is running on port 3001");
    return true;
  } catch (error) {
    console.log("❌ Server is not running on port 3001");
    return false;
  }
}

// Start server if not running
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log("🔄 Starting server...");

    const server = spawn("npm", ["start"], {
      cwd: __dirname,
      stdio: "pipe",
    });

    let serverReady = false;

    server.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(output.trim());

      if (output.includes("Cross-chain swap API server running")) {
        serverReady = true;
        setTimeout(() => {
          console.log("✅ Server started successfully");
          resolve(server);
        }, 2000);
      }
    });

    server.stderr.on("data", (data) => {
      console.error("Server error:", data.toString());
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error("Server startup timeout"));
      }
    }, 10000);
  });
}

// Run the full test
async function runTest() {
  try {
    // Check if server is running
    const serverRunning = await checkServer();

    let server;
    if (!serverRunning) {
      server = await startServer();
    }

    // Wait a moment for server to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("\n🧪 Running full cross-chain swap test...\n");

    // Run the test
    const test = spawn("node", ["full-cross-chain-test.js"], {
      cwd: __dirname,
      stdio: "inherit",
    });

    test.on("close", (code) => {
      console.log(`\n📊 Test completed with exit code ${code}`);

      if (server) {
        console.log("🔄 Stopping server...");
        server.kill();
      }

      process.exit(code);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the test
runTest();

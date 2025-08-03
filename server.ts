import express from "express";
import dotenv from "dotenv";
import secureSwapRouter from "./apis/secureSwap";
import defiRouter from "./apis/defi";

// Load environment variables
dotenv.config({ path: ".env" });

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || "development";

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS middleware - configure for production
app.use((req, res, next) => {
  // In production, you should specify your frontend domain instead of "*"
  const allowedOrigins =
    NODE_ENV === "production"
      ? [process.env.FRONTEND_URL || "https://your-frontend-domain.com"]
      : ["*"];

  const origin = req.headers.origin;
  if (
    allowedOrigins.includes("*") ||
    (origin && allowedOrigins.includes(origin))
  ) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Request logging middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${
        res.statusCode
      } - ${duration}ms`
    );
  });
  next();
});

// Health check endpoint
app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    message: "Secure Cross-chain Swap API is running (1inch Compliant)",
    version: "2.0.0",
    architecture: "Non-custodial READ-ONLY",
    security_compliance: "1inch Fusion standards",
    frontend_sdk_required: true,
  });
});

// API routes - Secure endpoints (1inch compliant)
app.use("/api/v2/swap", secureSwapRouter); // New secure API
app.use("/api/defi", defiRouter);

// Legacy endpoints - return deprecation notice without importing unsafe code
app.use("/api/swap", (req: express.Request, res: express.Response) => {
  res.status(410).json({
    success: false,
    error: "DEPRECATED: Legacy swap endpoints removed for security compliance",
    message: "Use /api/v2/swap endpoints with frontend 1inch SDK instead",
    migration: {
      "old": "/api/swap/* (INSECURE - used backend private keys)",
      "new": "/api/v2/swap/* (SECURE - frontend SDK only)",
      "compliance": "1inch non-custodial security standards"
    },
    available_endpoints: [
      "GET /api/v2/swap/quote",
      "GET /api/v2/swap/order-status/:hash",
      "GET /api/v2/swap/supported-chains",
      "GET /api/v2/swap/security-info"
    ]
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);

    // Don't expose internal errors in production
    const errorMessage =
      NODE_ENV === "production" ? "Internal server error" : err.message;

    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
      ...(NODE_ENV === "development" && { stack: err.stack }),
    });
  }
);

// 404 handler
app.use("*", (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cross-chain swap API server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

export default app;

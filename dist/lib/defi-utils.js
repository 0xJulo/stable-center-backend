"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHAIN_IDS = void 0;
exports.makeDefiApiRequest = makeDefiApiRequest;
exports.getPortfolioTokens = getPortfolioTokens;
exports.getPortfolioChart = getPortfolioChart;
exports.formatUSD = formatUSD;
exports.getTimeRange = getTimeRange;
exports.getInterval = getInterval;
exports.processChartData = processChartData;
exports.getTimeRangeForChart = getTimeRangeForChart;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: "../.env" });
// 1inch DeFi API configuration
const DEFI_API_BASE = "https://api.1inch.dev";
const DEFI_AUTH_KEY = process.env.FUSION_AUTH_KEY;
// Helper function to make authenticated requests to 1inch DeFi API
async function makeDefiApiRequest(endpoint, params = {}) {
    if (!DEFI_AUTH_KEY) {
        throw new Error("DEFI_AUTH_KEY is required for DeFi API calls");
    }
    const url = `${DEFI_API_BASE}${endpoint}`;
    const config = {
        headers: {
            Authorization: `Bearer ${DEFI_AUTH_KEY}`,
        },
        params,
        paramsSerializer: {
            indexes: null,
        },
    };
    try {
        const response = await axios_1.default.get(url, config);
        return response.data;
    }
    catch (error) {
        console.error("1inch DeFi API Error:", error.response?.data || error.message);
        throw new Error(`DeFi API request failed: ${error.response?.data?.message || error.message}`);
    }
}
// Get portfolio tokens snapshot
async function getPortfolioTokens(addresses, chainId) {
    const addressArray = Array.isArray(addresses) ? addresses : [addresses];
    return makeDefiApiRequest("/portfolio/portfolio/v5.0/tokens/snapshot", {
        addresses: addressArray,
        chain_id: chainId,
    });
}
// Get portfolio chart data
async function getPortfolioChart(addresses, chainId, timerange = "1week", useCache = false) {
    const addressArray = Array.isArray(addresses) ? addresses : [addresses];
    return makeDefiApiRequest("/portfolio/portfolio/v5.0/general/chart", {
        addresses: addressArray,
        chain_id: chainId,
        timerange,
        use_cache: useCache.toString(),
    });
}
// Helper function to format USD values
function formatUSD(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}
// Helper function to get time range for different periods
function getTimeRange(period) {
    const end = Math.floor(Date.now() / 1000);
    const now = new Date();
    let start;
    switch (period) {
        case "1d":
            start = end - 24 * 60 * 60;
            break;
        case "7d":
            start = end - 7 * 24 * 60 * 60;
            break;
        case "30d":
            start = end - 30 * 24 * 60 * 60;
            break;
        case "90d":
            start = end - 90 * 24 * 60 * 60;
            break;
        case "1y":
            start = end - 365 * 24 * 60 * 60;
            break;
        default:
            start = end - 7 * 24 * 60 * 60; // Default to 7 days
    }
    return { start, end };
}
// Helper function to get interval based on period
function getInterval(period) {
    switch (period) {
        case "1d":
            return "1h";
        case "7d":
            return "1d";
        case "30d":
            return "1d";
        case "90d":
            return "1d";
        case "1y":
            return "1w";
        default:
            return "1d";
    }
}
// Process chart data for optimal visualization
function processChartData(rawData, maxPoints = 50) {
    const { result } = rawData;
    if (!result || result.length === 0) {
        return {
            dataPoints: [],
            summary: {
                totalPoints: 0,
                originalPoints: 0,
                timeRange: { start: "", end: "" },
                valueRange: { min: 0, max: 0, current: 0 },
            },
        };
    }
    // Filter out zero values and sort by timestamp
    const validData = result
        .filter((point) => point.value_usd > 0)
        .sort((a, b) => a.timestamp - b.timestamp);
    if (validData.length === 0) {
        return {
            dataPoints: [],
            summary: {
                totalPoints: 0,
                originalPoints: result.length,
                timeRange: { start: "", end: "" },
                valueRange: { min: 0, max: 0, current: 0 },
            },
        };
    }
    // Calculate value range
    const values = validData.map((point) => point.value_usd);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const currentValue = validData[validData.length - 1].value_usd;
    // Determine sampling strategy based on data size
    let processedData;
    if (validData.length <= maxPoints) {
        // No need to sample, use all data
        processedData = validData;
    }
    else {
        // Sample data to reduce points while preserving trends
        const step = Math.ceil(validData.length / maxPoints);
        processedData = [];
        for (let i = 0; i < validData.length; i += step) {
            processedData.push(validData[i]);
        }
        // Always include the last point
        if (processedData[processedData.length - 1] !==
            validData[validData.length - 1]) {
            processedData.push(validData[validData.length - 1]);
        }
    }
    // Convert timestamps to readable dates
    const dataPoints = processedData.map((point) => ({
        timestamp: point.timestamp,
        value_usd: point.value_usd,
        date: new Date(point.timestamp * 1000).toISOString().split("T")[0],
    }));
    const startDate = new Date(validData[0].timestamp * 1000)
        .toISOString()
        .split("T")[0];
    const endDate = new Date(validData[validData.length - 1].timestamp * 1000)
        .toISOString()
        .split("T")[0];
    return {
        dataPoints,
        summary: {
            totalPoints: dataPoints.length,
            originalPoints: result.length,
            timeRange: {
                start: startDate,
                end: endDate,
            },
            valueRange: {
                min: minValue,
                max: maxValue,
                current: currentValue,
            },
        },
    };
}
// Get optimal time range for different periods
function getTimeRangeForChart(timerange) {
    const end = Math.floor(Date.now() / 1000);
    let start;
    switch (timerange) {
        case "1day":
            start = end - 24 * 60 * 60;
            break;
        case "1week":
            start = end - 7 * 24 * 60 * 60;
            break;
        case "1month":
            start = end - 30 * 24 * 60 * 60;
            break;
        case "3months":
            start = end - 90 * 24 * 60 * 60;
            break;
        case "1year":
            start = end - 365 * 24 * 60 * 60;
            break;
        default:
            start = end - 7 * 24 * 60 * 60; // Default to 1 week
    }
    return { start, end };
}
// Chain ID constants
exports.CHAIN_IDS = {
    ETHEREUM: "1",
    BASE: "8453",
    AVALANCHE: "43114",
    BSC: "56",
    POLYGON: "137",
    ARBITRUM: "42161",
    OPTIMISM: "10",
};
//# sourceMappingURL=defi-utils.js.map
# Stable Center Backend API

A cross-chain swap API backend with 1inch Fusion integration, providing DeFi portfolio management and cross-chain token swapping capabilities.

## Features

- 🔄 Cross-chain token swaps using 1inch Fusion
- 📊 DeFi portfolio tracking and analytics
- 🌐 Multi-chain support (Ethereum, Base, Avalanche, BSC)
- 🔒 Secure environment variable management
- 🐳 Docker support for easy deployment
- 📈 Real-time portfolio chart data

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- 1inch Fusion API key
- Ethereum RPC endpoint (Alchemy, Infura, etc.)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd stable-center-backend
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
npm run setup
```

4. Edit the `.env` file with your credentials:

```env
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
FUSION_AUTH_KEY=your_1inch_fusion_api_key_here
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_alchemy_key
```

5. Run the development server:

```bash
npm run dev
```

## API Endpoints

### Health Check

- `GET /health` - API health status

### Cross-Chain Swaps

- `POST /api/swap/cross-chain` - Create a cross-chain swap order
- `POST /api/swap/cross-chain/complete` - Create and monitor a complete swap

### DeFi Portfolio

- `GET /api/defi/portfolio/tokens` - Get portfolio tokens snapshot
- `GET /api/defi/portfolio/chart` - Get portfolio chart data

## Production Deployment

### Using Docker

1. Build and run with Docker Compose:

```bash
docker-compose up -d
```

2. Or build manually:

```bash
docker build -t stable-center-backend .
docker run -p 3001:3001 --env-file .env stable-center-backend
```

### Manual Deployment

1. Build the application:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

### Environment Variables

#### Required

- `PRIVATE_KEY` - Wallet private key (0x format)
- `FUSION_AUTH_KEY` - 1inch Fusion API key
- `RPC_URL` - Ethereum RPC endpoint

#### Optional

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend domain for CORS

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:start` - Build and start production server
- `npm run test` - Run cross-chain swap tests
- `npm run test:defi` - Run DeFi API tests
- `npm run lint` - Type check the codebase

### Project Structure

```
├── apis/                 # API route handlers
│   ├── swap.ts          # Cross-chain swap endpoints
│   └── defi.ts          # DeFi portfolio endpoints
├── lib/                  # Utility libraries
│   └── defi-utils.ts    # DeFi API utilities
├── 1inch_fusion_order/  # 1inch Fusion integration
│   └── createOrder.ts   # Order creation and management
├── test/                # Test files
├── server.ts            # Main server file
└── package.json         # Dependencies and scripts
```

## Security

- Never commit your `.env` file
- Use a dedicated wallet for testing
- Keep your private keys secure
- Set `NODE_ENV=production` in production
- Configure CORS properly for your frontend domain

## Support

For issues and questions, please check the 1inch documentation or create an issue in this repository.

## License

ISC

# Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Environment Variables

- [ ] `PRIVATE_KEY` - Valid wallet private key (0x format)
- [ ] `FUSION_AUTH_KEY` - Valid 1inch Fusion API key
- [ ] `RPC_URL` - Working Ethereum RPC endpoint
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL` - Your frontend domain for CORS
- [ ] `PORT` - Server port (optional, defaults to 3001)

### ✅ Security

- [ ] `.env` file is in `.gitignore`
- [ ] Private keys are secure and not committed
- [ ] Using dedicated wallet for production
- [ ] CORS is properly configured for your frontend domain

### ✅ Dependencies

- [ ] All dependencies installed (`npm install`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No TypeScript errors (`npm run lint`)

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Build Docker image:**

```bash
docker build -t stable-center-backend .
```

2. **Run with Docker Compose:**

```bash
docker-compose up -d
```

3. **Or run manually:**

```bash
docker run -d \
  --name stable-center-backend \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  stable-center-backend
```

### Option 2: Manual Deployment

1. **Build the application:**

```bash
npm run build
```

2. **Start the server:**

```bash
npm start
```

3. **Or use PM2 for process management:**

```bash
npm install -g pm2
pm2 start dist/server.js --name "stable-center-backend"
pm2 save
pm2 startup
```

### Option 3: Cloud Platform Deployment

#### Heroku

```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set PRIVATE_KEY=your_private_key
heroku config:set FUSION_AUTH_KEY=your_fusion_key
heroku config:set RPC_URL=your_rpc_url
git push heroku main
```

#### Railway

```bash
railway login
railway init
railway up
```

#### Render

- Connect your GitHub repository
- Set environment variables in the dashboard
- Deploy automatically on push

## Post-Deployment Verification

### ✅ Health Check

```bash
curl https://your-domain.com/health
```

Expected response:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "message": "Cross-chain swap API is running",
  "version": "1.0.0"
}
```

### ✅ API Endpoints Test

```bash
# Test swap endpoint
curl -X POST https://your-domain.com/api/swap/cross-chain \
  -H "Content-Type: application/json" \
  -d '{"amount":"1000000","srcChainId":1,"dstChainId":8453}'

# Test DeFi endpoint
curl "https://your-domain.com/api/defi/portfolio/tokens?addresses=0x123&chain_id=1"
```

### ✅ Monitoring

- [ ] Server logs are being captured
- [ ] Error monitoring is set up
- [ ] Performance monitoring is configured
- [ ] Health checks are passing

## Environment Variables Reference

### Required Variables

```env
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
FUSION_AUTH_KEY=your_1inch_fusion_api_key_here
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_alchemy_key
```

### Optional Variables

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

## Troubleshooting

### Common Issues

1. **Port already in use:**

   - Change PORT environment variable
   - Check if another service is using the port

2. **CORS errors:**

   - Verify FRONTEND_URL is set correctly
   - Check if frontend domain matches exactly

3. **API key errors:**

   - Verify FUSION_AUTH_KEY is valid
   - Check 1inch portal for API key status

4. **RPC connection issues:**
   - Verify RPC_URL is accessible
   - Check if RPC provider is working

### Logs

```bash
# Docker logs
docker logs stable-center-backend

# PM2 logs
pm2 logs stable-center-backend

# Direct logs
tail -f /var/log/stable-center-backend.log
```

## Security Best Practices

1. **Environment Variables:**

   - Never commit `.env` files
   - Use secure secret management
   - Rotate keys regularly

2. **Network Security:**

   - Use HTTPS in production
   - Configure firewall rules
   - Limit access to necessary ports

3. **Application Security:**

   - Keep dependencies updated
   - Monitor for vulnerabilities
   - Use security headers

4. **Monitoring:**
   - Set up error tracking
   - Monitor API usage
   - Track performance metrics

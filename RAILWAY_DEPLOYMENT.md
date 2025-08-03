# 🚀 Railway Deployment Guide - Secure 1inch Backend

## 🔒 Pre-Deployment Security Check

✅ **SAFE TO DEPLOY**: This backend is 1inch compliant and contains:
- ❌ **NO private keys**
- ❌ **NO wallet credentials** 
- ❌ **NO sensitive data**
- ✅ **READ-ONLY operations only**

---

## 📋 Railway Deployment Steps

### 1. Connect Repository to Railway

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Connect this repository
railway link
```

### 2. Set Environment Variables

**Required Variables:**
```bash
# Set your 1inch Fusion API key
railway variables set FUSION_AUTH_KEY=your_1inch_api_key_here

# Set production environment
railway variables set NODE_ENV=production

# Set your frontend URL for CORS
railway variables set FRONTEND_URL=https://your-frontend-domain.com
```

**Optional Variables:**
```bash
# Port (Railway will set automatically if not specified)
railway variables set PORT=3001
```

### 3. Deploy

```bash
# Deploy to Railway
railway up
```

---

## 🔧 Environment Variables Setup

### Required
- `FUSION_AUTH_KEY` - Your 1inch Fusion API key from [1inch Developer Portal](https://portal.1inch.dev)

### Optional  
- `NODE_ENV` - Set to "production" (Railway sets this automatically)
- `FRONTEND_URL` - Your frontend domain for CORS (e.g., "https://your-app.vercel.app")
- `PORT` - Server port (Railway sets this automatically)

### ❌ NOT NEEDED (Security Compliant)
- ~~`PRIVATE_KEY`~~ - **REMOVED** (security violation)
- ~~`RPC_URL`~~ - **REMOVED** (not needed for READ-ONLY backend)

---

## 🌐 Frontend Integration

After deployment, update your frontend to use the Railway backend:

### Environment Variables (Frontend)
```bash
# In your frontend .env.local
NEXT_PUBLIC_BACKEND_URL=https://your-railway-backend.railway.app
NEXT_PUBLIC_FUSION_AUTH_KEY=your_1inch_api_key_here
```

### API Usage (Frontend)
```typescript
// Get quotes from Railway backend
const quote = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v2/swap/quote?amount=1000000&srcChainId=1&dstChainId=8453`);

// Check order status
const status = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v2/swap/order-status/${orderHash}`);
```

---

## 🔍 Health Check & Testing

### Railway Health Check
Railway will automatically monitor: `https://your-app.railway.app/health`

Expected response:
```json
{
  "status": "OK",
  "message": "Secure Cross-chain Swap API is running (1inch Compliant)",
  "version": "2.0.0",
  "architecture": "Non-custodial READ-ONLY",
  "security_compliance": "1inch Fusion standards",
  "frontend_sdk_required": true
}
```

### Test Endpoints
```bash
# Test quote endpoint
curl "https://your-app.railway.app/api/v2/swap/quote?amount=1000000&srcChainId=1&dstChainId=8453"

# Test security info
curl "https://your-app.railway.app/api/v2/swap/security-info"

# Test supported chains
curl "https://your-app.railway.app/api/v2/swap/supported-chains"
```

---

## 🛡️ Security Features (Production Ready)

### CORS Configuration
- Production: Only allows your frontend domain
- Development: Allows all origins for testing

### Error Handling
- Production: Generic error messages (security)
- Development: Detailed errors for debugging

### Request Logging
- All API requests logged with timestamps
- No sensitive data in logs

---

## 📊 Monitoring & Logs

### Railway Logs
```bash
# View deployment logs
railway logs

# Follow real-time logs  
railway logs --follow
```

### Key Metrics to Monitor
- Health check status
- API response times
- Error rates
- Memory usage

---

## 🔄 Updating the Backend

### Deploy Updates
```bash
# Build and deploy
railway up

# Or enable auto-deploy from Git
# (Railway will deploy on every push to main)
```

### Rolling Back
```bash
# View deployments
railway status

# Rollback if needed (use Railway dashboard)
```

---

## 🚨 Troubleshooting

### Common Issues

**Issue**: "FUSION_AUTH_KEY environment variable is required"
**Solution**: Set the environment variable in Railway dashboard or CLI

**Issue**: CORS errors from frontend
**Solution**: Set `FRONTEND_URL` environment variable to your frontend domain

**Issue**: Health check failing
**Solution**: Check logs with `railway logs` - likely environment variable issue

### Environment Variable Commands
```bash
# List all variables
railway variables

# Set variable
railway variables set KEY=value

# Delete variable  
railway variables delete KEY
```

---

## ✅ Deployment Checklist

- [ ] Railway account created
- [ ] Repository connected to Railway
- [ ] `FUSION_AUTH_KEY` environment variable set
- [ ] `FRONTEND_URL` environment variable set (for CORS)
- [ ] Deployment successful (check health endpoint)
- [ ] Frontend updated with Railway backend URL
- [ ] API endpoints tested and working
- [ ] Legacy endpoints returning deprecation notices

---

**🔒 SECURITY STATUS**: Production Ready - No sensitive data
**🚀 DEPLOYMENT STATUS**: Ready for Railway
**✅ 1INCH COMPLIANCE**: Fully compliant
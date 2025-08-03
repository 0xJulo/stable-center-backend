# 🚀 Vercel Backend Deployment Guide

## 🎯 Why Deploy to Vercel?

✅ **Same Platform**: Your frontend is already on Vercel  
✅ **Serverless**: Auto-scaling, pay per request  
✅ **Free Tier**: Generous limits for your lightweight backend  
✅ **Easy Setup**: Simple configuration  
✅ **Global CDN**: Fast worldwide performance  

---

## 📋 Step-by-Step Vercel Deployment

### **Step 1: Commit Backend Changes**

```bash
cd /Users/justinlogue/Documents/GitHub/stable-center-backend

# Add the new Vercel configuration files
git add .
git commit -m "Configure backend for Vercel serverless deployment"
git push origin main
```

### **Step 2: Deploy to Vercel**

#### **Option A: Vercel Dashboard (Recommended)**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your `stable-center-backend` repository
4. **Framework Preset**: Choose "Other" (Vercel will auto-detect)
5. **Root Directory**: Leave as `.` (root)
6. Click **"Deploy"**

#### **Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project's name? stable-center-backend
# - In which directory is your code located? ./
```

### **Step 3: Set Environment Variables**

In the Vercel dashboard:
1. Go to your project → **Settings** → **Environment Variables**
2. Add these variables:

```
FUSION_AUTH_KEY = U4chEfFsoayAB7ZPYEH67E9klDWeRpZt
FRONTEND_URL = https://stable-center.vercel.app
NODE_ENV = production
```

### **Step 4: Get Your Vercel Backend URL**

After deployment, you'll get a URL like:
```
https://stable-center-backend.vercel.app
```

### **Step 5: Update Frontend Configuration**

Edit `/Users/justinlogue/Documents/GitHub/stable-center/.env.local`:

```bash
# Update with your Vercel backend URL
NEXT_PUBLIC_BACKEND_URL=https://stable-center-backend.vercel.app

# Keep your existing 1inch API key
NEXT_PUBLIC_FUSION_AUTH_KEY=U4chEfFsoayAB7ZPYEH67E9klDWeRpZt

# Your frontend URL
NEXT_PUBLIC_FRONTEND_URL=https://stable-center.vercel.app
```

### **Step 6: Test the Deployment**

```bash
# Test health endpoint
curl https://stable-center-backend.vercel.app/health

# Test quote endpoint
curl "https://stable-center-backend.vercel.app/api/v2/swap/quote?amount=1000000&srcChainId=1&dstChainId=8453"

# Test security info
curl https://stable-center-backend.vercel.app/api/v2/swap/security-info
```

---

## 🔧 Vercel Configuration Details

### **vercel.json Explained**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.ts"
    }
  ]
}
```

- **@vercel/node**: Handles TypeScript compilation automatically
- **Routes**: All requests go to your Express server
- **Serverless**: Each request spawns a new function instance

### **Serverless Benefits**
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **Cost-effective**: Pay only for actual usage
- ✅ **Global deployment**: Edge locations worldwide
- ✅ **Zero maintenance**: No server management needed

---

## 💰 Vercel Free Tier Limits

### **Free Plan Includes:**
- **100GB bandwidth** per month
- **1000 serverless function invocations** per day
- **Custom domains**
- **Automatic HTTPS**
- **Edge network**

### **Your Backend Usage (Estimated):**
- ✅ **Very lightweight** (READ-ONLY operations)
- ✅ **No database** (no additional costs)
- ✅ **Simple API calls** (low bandwidth)
- ✅ **Well within free limits**

---

## 🌐 Domain Configuration

### **Custom Domain (Optional)**
1. In Vercel dashboard → **Settings** → **Domains**
2. Add domain like `api.stable-center.com`
3. Update DNS records as instructed
4. Update frontend `.env.local` with custom domain

### **Subdomain Setup**
```bash
# Example custom domain
NEXT_PUBLIC_BACKEND_URL=https://api.stable-center.com
```

---

## 🔍 Monitoring & Debugging

### **Vercel Dashboard Features**
- **Functions**: View serverless function logs
- **Analytics**: Request metrics and performance
- **Deployments**: Deployment history and rollbacks
- **Edge Network**: Global performance stats

### **Logs Access**
```bash
# Using Vercel CLI
vercel logs https://stable-center-backend.vercel.app
```

---

## 🚀 Frontend Integration

### **Update API Calls in Frontend**
```typescript
// In your React/Next.js components
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

// Get quotes (READ-ONLY)
const getQuote = async () => {
  const response = await fetch(
    `${backendUrl}/api/v2/swap/quote?amount=1000000&srcChainId=1&dstChainId=8453`
  );
  return response.json();
};

// Check order status (READ-ONLY)
const getOrderStatus = async (orderHash: string) => {
  const response = await fetch(
    `${backendUrl}/api/v2/swap/order-status/${orderHash}`
  );
  return response.json();
};
```

---

## ✅ Deployment Checklist

- [ ] Backend repository configured for Vercel
- [ ] Project deployed to Vercel
- [ ] Environment variables set in Vercel dashboard
- [ ] Vercel backend URL obtained
- [ ] Frontend `.env.local` updated with Vercel backend URL
- [ ] Health endpoint returning "1inch Compliant" message
- [ ] Quote endpoint working
- [ ] CORS allowing your frontend domain
- [ ] Frontend successfully calling Vercel backend

---

## 🔄 Auto-Deploy Setup

Vercel automatically deploys when you push to your main branch:

```bash
# Make changes to backend
git add .
git commit -m "Update backend API"
git push origin main

# Vercel automatically deploys the changes
```

---

**🚀 RESULT**: Your secure 1inch backend will be running on Vercel serverless infrastructure, perfectly integrated with your frontend!

**URL Structure**:
- Frontend: `https://stable-center.vercel.app`
- Backend: `https://stable-center-backend.vercel.app`
# 🚀 Deployment Options

This secure 1inch Fusion backend can be deployed to multiple platforms. Choose the one that best fits your needs:

## 🎯 Platform Comparison

| Platform | Type | Best For | Cost | Setup |
|----------|------|----------|------|-------|
| **Vercel** | Serverless | Frontend devs, auto-scaling | Free tier generous | Easy |
| **Railway** | Traditional | Simple deployment, persistent apps | $5/month free | Easy |
| **Docker** | Container | Local dev, custom infrastructure | Varies | Medium |

---

## 🌐 Vercel (Recommended for Frontend Devs)

**Perfect if you're already using Vercel for your frontend**

### Pros:
- ✅ Serverless auto-scaling
- ✅ Same platform as frontend
- ✅ Global CDN
- ✅ Zero maintenance

### Setup:
```bash
# See detailed guide
cat VERCEL_DEPLOYMENT.md
```

### Quick Deploy:
1. Import repo to Vercel dashboard
2. Set environment variables
3. Deploy automatically

---

## 🚂 Railway (Great for Traditional Deployment)

**Perfect for developers who prefer traditional server deployment**

### Pros:
- ✅ Always-on server
- ✅ Simple configuration
- ✅ Great for learning
- ✅ Persistent connections

### Setup:
```bash
# See detailed guide
cat RAILWAY_DEPLOYMENT.md
```

### Quick Deploy:
```bash
railway login
railway link
railway variables set FUSION_AUTH_KEY=your_key
railway up
```

---

## 🐳 Docker (For Custom Infrastructure)

**Perfect for self-hosting or custom deployment needs**

### Pros:
- ✅ Full control
- ✅ Self-hosting
- ✅ Local development
- ✅ Any cloud provider

### Setup:
```bash
# Local development
docker-compose up

# Production build
docker build -t stable-center-backend .
docker run -p 3001:3001 stable-center-backend
```

---

## 🔧 Environment Variables (All Platforms)

### Required:
```bash
FUSION_AUTH_KEY=your_1inch_api_key
FRONTEND_URL=https://stable-center.vercel.app
```

### Optional:
```bash
NODE_ENV=production
PORT=3001
```

---

## 🎯 Which Should You Choose?

### Choose **Vercel** if:
- Your frontend is on Vercel
- You want serverless auto-scaling
- You prefer minimal maintenance
- You're building for production

### Choose **Railway** if:
- You want a traditional server experience
- You need persistent connections
- You prefer simpler mental model
- You're learning deployment

### Choose **Docker** if:
- You want full control
- You're self-hosting
- You have custom infrastructure needs
- You're deploying to multiple environments

---

## 🔒 Security Note

**All deployment options are secure and 1inch compliant:**
- ❌ No private keys stored
- ✅ READ-ONLY operations only
- ✅ Non-custodial architecture
- ✅ Environment variables properly secured

---

## 📚 Platform-Specific Guides

- **Vercel**: See `VERCEL_DEPLOYMENT.md`
- **Railway**: See `RAILWAY_DEPLOYMENT.md`
- **Docker**: See `Dockerfile` and `docker-compose.yml`
- **General**: See `CLAUDE.md` for architecture details

---

**🎯 Recommendation**: If your frontend is on Vercel, use Vercel for the backend too. It keeps everything in one ecosystem and provides excellent developer experience.
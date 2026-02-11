# Complete Deployment Guide: CORE on Vercel

## 📋 Project Overview
- **Frontend**: Next.js on Vercel (Optimal)
- **Backend**: Node.js/Express on Vercel Serverless or Railway/Render
- **Database**: MongoDB Atlas (Cloud)
- **Tech Stack**: TypeScript, React, Express, MongoDB, Tailwind CSS

---

## 🎯 Deployment Strategy

### **Option A: Full Vercel (Frontend + Backend Serverless)** ⭐ Recommended for Small-Medium Apps
- Frontend: Vercel (Native Next.js support)
- Backend: Vercel Serverless Functions
- Pros: Single platform, automatic SSL, global CDN
- Cons: Serverless limitations (10s timeout on Hobby plan)

### **Option B: Hybrid (Vercel Frontend + Separate Backend)**
- Frontend: Vercel
- Backend: Railway/Render/Fly.io (keeps Express server as-is)
- Pros: Full backend control, no serverless limitations
- Cons: Multiple platforms to manage

**This guide covers BOTH options.**

---

## PART 1: MONGODB ATLAS SETUP (Same as Hostinger)

### Step 1.1: Create MongoDB Atlas Cluster
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create account and verify email
3. Click "Create" → Choose "M0 Free Tier"
4. **Cluster Settings**:
   - Cloud Provider: AWS
   - Region: Choose closest region (us-east-1 for USA, ap-south-1 for India)
   - Cluster Name: `core-prod`

### Step 1.2: Database Access
1. Go to "Database Access" → "Add Database User"
2. Username: `core_admin`
3. Password: Generate strong password (save it!)
4. Built-in Role: `Atlas Admin`

### Step 1.3: Network Access
1. Go to "Network Access" → "Add IP Address"
2. Choose: **Allow from Anywhere** (`0.0.0.0/0`)
   - Required for Vercel's dynamic IPs

### Step 1.4: Get MongoDB URI
1. Click "Databases" → "Connect" → "Drivers"
2. Copy connection string:
   ```
   mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/CORE?retryWrites=true&w=majority
   ```
3. Replace `PASSWORD` with your actual password
4. **Save this URI** for environment variables

---

## PART 2: PREPARE YOUR PROJECT

### Step 2.1: Update Git Repository Structure

Your current structure should be:
```
CORE/
├── backend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    ├── package.json
    └── next.config.ts
```

### Step 2.2: Push to GitHub (if not already)

```bash
# In your local CORE directory
cd "c:\Users\aksha\Desktop\Kareer Studio\CORE"

# Initialize git (if not done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/CORE.git

# Push
git push -u origin main
```

---

## OPTION A: FULL VERCEL DEPLOYMENT

## PART 3A: DEPLOY FRONTEND TO VERCEL

### Step 3A.1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### Step 3A.2: Deploy Frontend via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository (`CORE`)
5. **Configure Project**:

   **Framework Preset**: Next.js
   
   **Root Directory**: `frontend`
   
   **Build Settings**:
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install`

6. **Environment Variables** (click "Add"):
   ```
   NEXT_PUBLIC_API_URL = https://your-backend.vercel.app/api
   ```
   ⚠️ We'll update this after deploying the backend

7. Click **"Deploy"**
8. Wait 2-3 minutes for deployment
9. You'll get a URL like: `https://core-frontend-xyz.vercel.app`

### Step 3A.3: Add Custom Domain (Optional)

1. In Vercel Dashboard → Your Project → "Settings" → "Domains"
2. Add domain: `core.admitra.io`
3. Follow DNS instructions from Vercel
4. Add CNAME record in your domain registrar:
   ```
   Type: CNAME
   Name: core
   Value: cname.vercel-dns.com
   ```

---

## PART 4A: DEPLOY BACKEND TO VERCEL SERVERLESS

### Step 4A.1: Create `vercel.json` in Backend Directory

```bash
# Create vercel.json in backend folder
cd backend
```

Create file `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 4A.2: Update Backend Entry Point

Vercel serverless requires a different approach. Update `backend/src/server.ts`:

**Add at the end of file**:
```typescript
// Export for Vercel serverless
export default app;
```

### Step 4A.3: Deploy Backend to Vercel

**Option 1: Via Dashboard**
1. Go to Vercel Dashboard
2. Click "Add New Project"
3. Import same `CORE` repository
4. **Configure**:
   - Framework Preset: Other
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Environment Variables**:
   ```
   PORT=5000
   NODE_ENV=production
   MONGO_URI=mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/CORE?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-production
   JWT_EXPIRES_IN=7d
   EMAIL_ADDRESS=your-email@gmail.com
   EMAIL_PASSWORD=your-gmail-app-password
   EMAIL_VERIFICATION_URL=https://core.admitra.io/verify-email
   PASSWORD_RESET_URL=https://core.admitra.io/reset-password
   FRONTEND_URL=https://core.admitra.io
   ```

6. Click **"Deploy"**
7. You'll get URL: `https://core-backend-xyz.vercel.app`

**Option 2: Via CLI**
```bash
cd backend
vercel

# Follow prompts:
# Set up and deploy? Yes
# Link to existing project? No
# Project name? core-backend
# Directory? ./
# Override settings? No
```

### Step 4A.4: Update Frontend Environment Variable

1. Go to Frontend project in Vercel
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL`:
   ```
   NEXT_PUBLIC_API_URL=https://core-backend-xyz.vercel.app/api
   ```
4. Save and **Redeploy** frontend

---

## OPTION B: HYBRID DEPLOYMENT (RECOMMENDED FOR PRODUCTION)

## PART 3B: DEPLOY BACKEND TO RAILWAY (Alternative to Vercel Backend)

### Why Railway for Backend?
- ✅ Always-running server (not serverless)
- ✅ No timeout limitations
- ✅ PostgreSQL/Redis if needed later
- ✅ Free $5/month credit
- ✅ Easy deployment

### Step 3B.1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Verify email

### Step 3B.2: Deploy Backend on Railway

1. Click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select your `CORE` repository
4. **Configure Service**:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### Step 3B.3: Add Environment Variables in Railway

Click "Variables" tab and add:
```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/CORE?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_VERIFICATION_URL=https://core.admitra.io/verify-email
PASSWORD_RESET_URL=https://core.admitra.io/reset-password
FRONTEND_URL=https://core.admitra.io
```

### Step 3B.4: Get Backend URL

1. After deployment, click "Settings" → "Networking"
2. Click "Generate Domain"
3. You'll get: `https://core-backend-production.up.railway.app`
4. **Save this URL**

### Step 3B.5: Add Custom Domain (Optional)

1. Railway → Settings → Networking
2. Add custom domain: `api.core.admitra.io`
3. Add CNAME in your DNS:
   ```
   Type: CNAME
   Name: api
   Value: core-backend-production.up.railway.app
   ```

---

## PART 4B: DEPLOY FRONTEND TO VERCEL (With Railway Backend)

### Step 4B.1: Deploy Frontend

1. Go to [vercel.com](https://vercel.com)
2. "Add New Project" → Import `CORE` repo
3. **Configure**:
   - Root Directory: `frontend`
   - Framework: Next.js
   
4. **Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=https://core-backend-production.up.railway.app/api
   ```
   (Use your Railway backend URL)

5. Click **"Deploy"**

### Step 4B.2: Add Custom Domain

1. Vercel → Your Project → Settings → Domains
2. Add: `core.admitra.io`
3. Update DNS:
   ```
   Type: CNAME
   Name: core
   Value: cname.vercel-dns.com
   ```

---

## PART 5: ALTERNATIVE - RENDER FOR BACKEND

### Step 5.1: Sign Up for Render

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Verify email

### Step 5.2: Create Web Service

1. Dashboard → "New +" → "Web Service"
2. Connect your GitHub repository
3. **Configure**:
   - Name: `core-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Free (or $7/month for always-on)

### Step 5.3: Add Environment Variables

Scroll to "Environment Variables" section and add all variables (same as Railway above)

### Step 5.4: Deploy

Click "Create Web Service" and wait 3-5 minutes.

You'll get URL: `https://core-backend.onrender.com`

⚠️ **Free tier sleeps after 15 min of inactivity** - Upgrade to $7/month for 24/7 uptime

---

## PART 6: DATABASE OPTIMIZATION FOR VERCEL

### Add Database Indexes (Critical for Performance)

Create `backend/src/scripts/createIndexes.ts`:

```typescript
import mongoose from 'mongoose';
import Program from '../models/Program';
import Student from '../models/Student';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const createIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ Connected to MongoDB');

    // Create indexes
    await Program.collection.createIndex({ studentId: 1, isSelectedByStudent: 1 });
    await Program.collection.createIndex({ createdBy: 1, createdAt: -1 });
    await Program.collection.createIndex({ country: 1, studyLevel: 1 });
    await Student.collection.createIndex({ userId: 1 });
    await User.collection.createIndex({ email: 1 });

    console.log('✅ Indexes created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createIndexes();
```

Add to `backend/package.json`:
```json
"scripts": {
  "create:indexes": "ts-node src/scripts/createIndexes.ts"
}
```

Run locally once:
```bash
cd backend
npm run create:indexes
```

---

## PART 7: SEED DATABASE

### Seed Forms and Documents

**Option 1: Run Locally (Easiest)**
```bash
cd backend

# Update .env with production MongoDB URI
# Then run:
npm run seed:forms
npm run seed:documents
```

**Option 2: Run on Railway/Render**

Railway:
1. Go to your backend service
2. Click "Settings" → "Custom Start Command"
3. Temporarily change to: `npm run seed:forms && npm start`
4. Redeploy
5. Change back to `npm start` after seeding

---

## PART 8: CORS CONFIGURATION

### Update Backend CORS (Important!)

In `backend/src/server.ts`, update CORS configuration:

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'https://core.admitra.io',
    'https://core-frontend-xyz.vercel.app', // Your Vercel preview URL
    'http://localhost:3000', // For local development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

Commit and push to trigger redeployment.

---

## PART 9: TESTING & VERIFICATION

### Test Backend API
```bash
# Via browser or curl
curl https://your-backend-url.railway.app/

# Expected: "API is running!" or similar
```

### Test Frontend
1. Visit: `https://core.admitra.io` (or your Vercel URL)
2. Try logging in
3. Check browser console (F12) for errors
4. Verify API calls work

### Check Logs

**Vercel Logs**:
1. Dashboard → Your Project → "Deployments"
2. Click latest deployment → "View Function Logs"

**Railway Logs**:
1. Dashboard → Your Service → "Logs" tab
2. Real-time logs shown

---

## PART 10: ENVIRONMENT COMPARISON

| Feature | Vercel Frontend | Vercel Backend | Railway/Render |
|---------|----------------|----------------|----------------|
| **Cost (Free Tier)** | Unlimited | Limited | $5/month credit |
| **Always-On** | ✅ Yes | ❌ Serverless | ✅ Yes |
| **Timeout** | N/A | 10s (Hobby) | None |
| **WebSocket** | ✅ Yes | ⚠️ Limited | ✅ Yes |
| **Custom Domain** | ✅ Free | ✅ Free | ✅ Free |
| **Auto SSL** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Global CDN** | ✅ Yes | ✅ Yes | ❌ Single region |
| **Best For** | Frontend | Simple APIs | Full backend |

---

## PART 11: DEPLOYMENT COMMANDS SUMMARY

### Push Code Updates

```bash
# Make changes locally
cd "c:\Users\aksha\Desktop\Kareer Studio\CORE"

# Add and commit
git add .
git commit -m "Your update message"

# Push to trigger auto-deployment
git push origin main
```

Both Vercel and Railway will auto-deploy on push! 🚀

### Manual Redeployment

**Vercel**:
```bash
cd frontend
vercel --prod
```

**Railway**: Push to GitHub triggers auto-deploy

### View Logs

**Vercel**:
```bash
vercel logs core-frontend
```

**Railway**: Check dashboard logs tab

---

## PART 12: PRICING (Updated Jan 2026)

### Vercel Pricing
- **Hobby (Free)**:
  - Unlimited deployments
  - 100GB bandwidth/month
  - Serverless functions: 100 GB-hours
  - Good for: Small apps, portfolios

- **Pro ($20/month)**:
  - Higher limits
  - Team collaboration
  - Analytics
  - Good for: Growing apps

### Railway Pricing
- **Free Trial**: $5 credit/month
- **Pay As You Go**: ~$5-15/month for small app
- **Pro ($20/month)**: Higher limits

### Render Pricing
- **Free**: With sleep (15 min inactivity)
- **Starter ($7/month)**: Always-on
- **Standard ($25/month)**: More resources

### Recommended Setup for Production
- **Frontend**: Vercel Hobby (Free) → $0
- **Backend**: Railway ($10-15/month)
- **Database**: MongoDB Atlas M0 (Free) or M10 ($57/month)
- **Total**: ~$10-15/month (can scale to $100+ for high traffic)

---

## PART 13: COMMON ISSUES & SOLUTIONS

### Issue: API Not Connecting

**Solution**:
1. Check `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Verify backend is deployed and running
3. Check CORS settings in backend
4. Look at browser console for exact error

### Issue: MongoDB Connection Failed

**Solution**:
1. Verify `MONGO_URI` in environment variables
2. Check MongoDB Atlas Network Access (allow 0.0.0.0/0)
3. Verify database user credentials

### Issue: Environment Variables Not Working

**Solution**:
1. Vercel: Variables need redeployment to take effect
2. Railway: Auto-restarts on variable change
3. Check variable names match exactly (case-sensitive)

### Issue: Build Failed

**Solution**:
1. Check build logs in dashboard
2. Verify `package.json` scripts are correct
3. Check TypeScript errors locally first
4. Ensure all dependencies in package.json

### Issue: Vercel Serverless Timeout

**Symptoms**: "Task timed out after 10 seconds"

**Solution**:
- Upgrade to Vercel Pro (60s timeout), OR
- Move backend to Railway/Render (no timeout)

---

## PART 14: DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] MongoDB Atlas cluster created
- [ ] Database user and network access configured
- [ ] Code pushed to GitHub
- [ ] Environment variables documented
- [ ] Frontend builds successfully locally
- [ ] Backend builds successfully locally

### Vercel Setup
- [ ] Account created and GitHub connected
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed (Vercel/Railway/Render)
- [ ] Environment variables configured
- [ ] Custom domains added (optional)
- [ ] SSL working (auto by Vercel)

### Post-Deployment
- [ ] Database seeded
- [ ] Indexes created
- [ ] Frontend loading correctly
- [ ] Backend API responding
- [ ] Authentication working
- [ ] File uploads working
- [ ] CORS configured properly
- [ ] Email sending tested

---

## PART 15: RECOMMENDED: OPTION B (VERCEL + RAILWAY)

For your CORE application, I recommend:

✅ **Frontend → Vercel** (Perfect for Next.js)
✅ **Backend → Railway** (Better for Express APIs)
✅ **Database → MongoDB Atlas** (Already using)

**Why?**
- No serverless timeout issues
- Full backend control
- WebSocket support if needed later
- Better for file uploads
- Real-time logging
- Only ~$10-15/month

---

## PART 16: NEXT STEPS AFTER DEPLOYMENT

1. **Monitor Performance**
   - Vercel Analytics (enable in dashboard)
   - Railway Metrics (CPU/Memory)
   - MongoDB Atlas Performance Advisor

2. **Set Up CI/CD**
   - Already automatic with Git push!
   - Consider GitHub Actions for tests

3. **Add Monitoring**
   - Sentry for error tracking
   - LogRocket for session replay
   - Uptime monitoring (UptimeRobot)

4. **Optimize**
   - Enable Next.js Image Optimization
   - Add API response caching
   - Implement rate limiting

5. **Backup Strategy**
   - MongoDB Atlas automatic backups (enabled by default)
   - Download backups monthly
   - Git commits are code backups

---

## SUPPORT & RESOURCES

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **MongoDB Atlas**: [docs.mongodb.com/atlas](https://docs.mongodb.com/atlas)

---

## QUICK START (TL;DR)

```bash
# 1. Push to GitHub
git add . && git commit -m "Deploy" && git push origin main

# 2. Deploy Frontend
# Go to vercel.com → Import Repo → Set root to "frontend" → Deploy

# 3. Deploy Backend  
# Go to railway.app → New Project → Deploy from GitHub → Set root to "backend"

# 4. Update Frontend API URL
# Vercel Dashboard → Settings → Environment Variables → NEXT_PUBLIC_API_URL

# 5. Seed Database (locally)
cd backend
npm run seed:forms
npm run seed:documents

# Done! 🎉
```

---

**Last Updated**: January 23, 2026
**Version**: 1.0


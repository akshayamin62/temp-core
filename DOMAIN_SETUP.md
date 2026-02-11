# Domain Setup for CORE Application

## Your Domain Configuration

Your application will use the domain: **core.admitra.io**

---

## 🌐 Domain Structure

### Main Website (Frontend)
- **Primary URL**: `https://core.admitra.io`
- **With WWW**: `https://www.core.admitra.io` (redirects to primary)
- **Purpose**: User-facing Next.js application

### API Backend
- **API URL**: `https://api.core.admitra.io`
- **Purpose**: Express.js backend API
- **Full API Path**: `https://api.core.admitra.io/api`

---

## 📋 DNS Records to Configure

You need to add these DNS records in your domain registrar (where you purchased admitra.io):

### Record 1: Main Domain
```
Type: A
Name: core
Value: YOUR_HOSTINGER_IP_ADDRESS
TTL: 3600
```

### Record 2: WWW Subdomain
```
Type: A
Name: www.core
Value: YOUR_HOSTINGER_IP_ADDRESS
TTL: 3600
```

### Record 3: API Subdomain
```
Type: A
Name: api.core
Value: YOUR_HOSTINGER_IP_ADDRESS
TTL: 3600
```

---

## 🔐 SSL Certificates

The deployment guide includes Let's Encrypt SSL certificates for:
- `core.admitra.io`
- `www.core.admitra.io`
- `api.core.admitra.io`

These will be automatically obtained using Certbot during deployment.

---

## 🔧 Environment Variables Summary

### Backend `.env`
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/CORE?retryWrites=true&w=majority

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Use your actual domain
EMAIL_VERIFICATION_URL=https://core.admitra.io/verify-email
PASSWORD_RESET_URL=https://core.admitra.io/reset-password
FRONTEND_URL=https://core.admitra.io
```

### Frontend `.env.local`
```env
# Backend API URL
NEXT_PUBLIC_API_URL=https://api.core.admitra.io/api
```

---

## 🚀 How It Works

1. **User visits**: `https://core.admitra.io`
   - Nginx proxies to Next.js on port 3000
   - User sees the frontend application

2. **Frontend makes API calls**: `https://api.core.admitra.io/api/...`
   - Nginx proxies to Express backend on port 5000
   - Backend processes request and returns data

3. **Email links**: Users receive emails with links to `https://core.admitra.io/verify-email`
   - These link back to your frontend for account verification

---

## ✅ Testing After Deployment

### Test Backend
```bash
curl https://api.core.admitra.io/
# Expected: "API is running!"
```

### Test Frontend
Open browser: `https://core.admitra.io`
- Should load your Next.js application

### Test API Endpoint
```bash
curl https://api.core.admitra.io/api/auth/test
# Or whatever endpoint you have
```

---

## 📝 Important Notes

1. **DNS Propagation**: After adding DNS records, wait 5-15 minutes for changes to propagate globally

2. **Wildcard Not Needed**: You don't need a wildcard certificate since we're explicitly specifying all subdomains

3. **Nginx Configuration**: 
   - `core-api` config handles `api.core.admitra.io`
   - `core-web` config handles `core.admitra.io` and `www.core.admitra.io`

4. **CORS**: Your backend is configured to accept requests from `https://core.admitra.io` via the `FRONTEND_URL` env variable

---

## 🔄 Update Checklist

Before deploying, ensure you've updated:
- [x] Backend `.env` file with `core.admitra.io` URLs
- [x] Frontend `.env.local` with API URL
- [x] DNS records in domain registrar
- [x] Nginx configurations (already in deployment guide)
- [x] SSL certificate command (already in deployment guide)

---

**Your Deployment Guide** (`DEPLOYMENT_GUIDE_HOSTINGER.md`) has been updated with all these URLs.

Follow the guide step-by-step, and your application will be live at `https://core.admitra.io`!


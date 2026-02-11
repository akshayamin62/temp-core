# Complete Deployment Guide: Kareer Studio on Hostinger KVM 1

## 📋 Project Overview
- **Full-Stack Application**: Node.js/Express backend + Next.js frontend
- **Database**: MongoDB Atlas (Cloud)
- **Hosting**: Hostinger KVM 1 VPS
- **Domain**: temp-core.admitra.io
- **Tech Stack**: TypeScript, React, Express, MongoDB, Tailwind CSS
- **File Storage**: Cloud storage required (Vercel Blob / AWS S3 / Cloudinary)

---

## 🎯 Pre-Deployment Checklist

- [ ] MongoDB Atlas account created and cluster setup
- [ ] Hostinger KVM 1 VPS provisioned
- [ ] Domain name `temp-core.admitra.io` ready
- [ ] Git repository access confirmed
- [ ] All environment variables documented
- [ ] SSL certificate ready (Let's Encrypt)
- [ ] Email configuration ready (SMTP details)
- [ ] Cloud storage service selected (for file uploads)

---

## ⚠️ CRITICAL: FILE STORAGE REQUIREMENT

**Your application uses file uploads** (company logos, student documents, marksheets), but **Vercel's serverless functions don't persist files**. For Hostinger VPS deployment, you have two options:

### Option 1: Use VPS Local Storage (Simpler for VPS)
✅ Files stored on VPS disk at `/var/www/temp-core/uploads`
✅ No additional service needed
✅ Already implemented in your code with `getUploadBaseDir()`
✅ Nginx serves files directly
⚠️ **Recommended for Hostinger VPS deployment**

### Option 2: Use Cloud Storage (Better for Scalability)
Implement one of these services:
- **Vercel Blob Storage** (if you keep Vercel for staging)
- **AWS S3** (most popular, reliable)
- **Cloudinary** (great for images/documents)
- **Google Cloud Storage** or **Azure Blob**

**For this guide, we'll use Option 1 (VPS local storage)** since you're deploying on Hostinger KVM 1.

---

## PART 1: MONGODB ATLAS SETUP

### Step 1.1: Verify/Update MongoDB Cluster
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your existing cluster or create new one:
   - Cluster Name: `temp-core-prod`
   - Region: Choose closest to your users (e.g., ap-south-1 for India)
   - Tier: M0 Free (or paid tier for production)

### Step 1.2: Update Network Access
1. Go to "Network Access" tab
2. Click "Add IP Address"
3. **Important**: Add your Hostinger KVM 1 IP address
   - Get IP from Hostinger panel after VPS is provisioned
   - Format: `123.45.67.89/32` (replace with your actual IP)
4. Also add `0.0.0.0/0` temporarily for testing (remove later)

### Step 1.3: Verify Database User
1. Go to "Database Access" tab
2. Ensure you have a user with these credentials:
   - Username: `temp_core_admin` (or your existing username)
   - Password: Strong password (save securely)
   - Role: `Atlas Admin` or `Read and write to any database`

### Step 1.4: Get MongoDB Connection URI
1. Click "Databases" → "Connect" on your cluster
2. Choose "Connect your application"
3. Copy connection string:
   ```
   mongodb+srv://temp_core_admin:PASSWORD@cluster.mongodb.net/temp_core?retryWrites=true&w=majority
   ```
4. Replace `PASSWORD` with actual password
5. Replace `temp_core` with your database name
6. **Save this URI** for environment variables

---

## PART 2: HOSTINGER KVM 1 SETUP

### Step 2.1: Access Your Hostinger KVM 1 VPS

1. **Get VPS Credentials** from Hostinger:
   - IP Address: `XXX.XXX.XXX.XXX`
   - Root password (from email or panel)
   - SSH port: 22

2. **Connect via SSH** (Windows PowerShell):
   ```powershell
   ssh root@YOUR_VPS_IP
   ```
   Enter password when prompted.

3. **Or use PuTTY**:
   - Download from [putty.org](https://putty.org)
   - Host: Your IP address
   - Port: 22
   - Username: `root`

### Step 2.2: Initial Server Configuration

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verify Node.js and npm installation
node --version   # Should show v20.x.x
npm --version    # Should show v10.x.x

# Update npm to latest
npm install -g npm@latest

# Install essential tools
apt install -y git curl wget vim nano build-essential

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx (Web Server & Reverse Proxy)
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Verify installations
git --version
pm2 --version
nginx -v
certbot --version
```

### Step 2.3: Configure Firewall

```bash
# Install and configure UFW firewall
apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## PART 3: DEPLOY BACKEND

### Step 3.1: Create Application Directory

```bash
# Create main app directory
mkdir -p /var/www/temp-core
cd /var/www/temp-core

# Create backend and frontend directories
mkdir backend frontend uploads

# Set proper permissions for uploads
chmod 755 uploads
```

### Step 3.2: Clone Backend Code

**Option A: Via Git (Recommended)**
```bash
cd /var/www/temp-core/backend

# If you have a Git repository
git clone https://github.com/YOUR_USERNAME/temp-core-backend.git .

# Or if backend is in a subfolder
git clone https://github.com/YOUR_USERNAME/temp-core.git temp
mv temp/backend/* .
rm -rf temp
```

**Option B: Via SCP from Local Machine**
```powershell
# Run this on your local Windows machine (PowerShell)
cd "C:\Users\aksha\Desktop\Kareer Studio\Integrated"
scp -r backend/* root@YOUR_VPS_IP:/var/www/temp-core/backend/
```

### Step 3.3: Set Up Backend Environment Variables

```bash
cd /var/www/temp-core/backend

# Create .env file
nano .env
```

**Paste this content** (update with your actual values):

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://temp_core_admin:YOUR_PASSWORD@cluster.mongodb.net/temp_core?retryWrites=true&w=majority

# JWT Configuration (Generate a new secret for production!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-CHANGE-THIS-TO-RANDOM-STRING
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail with App Password)
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Frontend URLs for Email Links
FRONTEND_URL=https://temp-core.admitra.io

# CORS Configuration
ALLOWED_ORIGINS=https://temp-core.admitra.io,https://www.temp-core.admitra.io

# File Upload Configuration (VPS uses local storage)
# No additional config needed - uses /var/www/temp-core/uploads
```

**To generate a secure JWT_SECRET**:
```bash
# Run this command to generate a random 64-character string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and use it as JWT_SECRET
```

**Save file**: Press `Ctrl + X`, then `Y`, then `Enter`

### Step 3.4: Install Dependencies & Build

```bash
cd /var/www/temp-core/backend

# Install npm dependencies
npm install --production

# Or if you need dev dependencies for build
npm install

# Build TypeScript to JavaScript
npm run build

# This compiles src/ folder to dist/ folder
# Check if dist/ folder was created
ls -la dist/
```

### Step 3.5: Test Backend Locally

```bash
cd /var/www/temp-core/backend

# Test if server starts (Ctrl+C to stop after verification)
npm start

# Expected output:
# ✅ Connected to MongoDB successfully
# 🚀 Server is running on port 5000
```

If you see errors:
- Check MongoDB URI in .env
- Verify MongoDB Atlas IP whitelist includes your VPS IP
- Check if port 5000 is available: `netstat -tuln | grep 5000`

### Step 3.6: Set Up PM2 for Backend

```bash
cd /var/www/temp-core/backend

# Start backend with PM2
pm2 start dist/src/server.js --name "temp-core-backend"

# Configure PM2 to start on system reboot
pm2 startup systemd
# Copy and run the command that PM2 outputs

pm2 save

# Check status
pm2 status

# View logs
pm2 logs temp-core-backend --lines 50
```

**PM2 Useful Commands**:
```bash
pm2 status              # Check running processes
pm2 logs temp-core-backend # View real-time logs
pm2 restart temp-core-backend # Restart backend
pm2 stop temp-core-backend # Stop backend
pm2 delete temp-core-backend # Remove from PM2
```

---

## PART 4: DEPLOY FRONTEND

### Step 4.1: Clone Frontend Code

```bash
cd /var/www/temp-core/frontend

# Via Git
git clone https://github.com/YOUR_USERNAME/temp-core-frontend.git .

# Or via SCP from local machine (run on Windows)
# scp -r frontend/* root@YOUR_VPS_IP:/var/www/temp-core/frontend/
```

### Step 4.2: Set Up Frontend Environment Variables

```bash
cd /var/www/temp-core/frontend

# Create .env.local file for production
nano .env.local
```

**Paste this content**:

```env
# Backend API URL (will be proxied through Nginx)
NEXT_PUBLIC_API_URL=https://api.temp-core.admitra.io/api

# IVY League API URL (same as above)
NEXT_PUBLIC_IVY_API_URL=https://api.temp-core.admitra.io/api

# Port configuration (change if port 3000 is in use)
PORT=3001
```

**Save file**: `Ctrl + X`, `Y`, `Enter`

### Step 4.3: Install Dependencies & Build Next.js

```bash
cd /var/www/temp-core/frontend

# Install dependencies
npm install --production

# Build Next.js application
npm run build

# This creates .next/ folder with production build
# Verify build completed
ls -la .next/

# Expected folders: server/, static/, cache/
```

**If build fails**:
- Check Node.js version: `node --version` (should be v20.x)
- Check available memory: `free -h` (Next.js build needs 1-2GB RAM)
- If low memory, create swap space:
  ```bash
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```

### Step 4.4: Test Frontend Locally

```bash
cd /var/www/temp-core/frontend

# Test production build (Ctrl+C to stop)
npm start

# Expected: Server running on port 3001
# Note: We use port 3001 to avoid conflicts with other projects on port 3000
```

### Step 4.5: Set Up PM2 for Frontend

```bash
cd /var/www/temp-core/frontend

# Start frontend with PM2
pm2 start npm --name "temp-core-frontend" -- start

# Save PM2 configuration
pm2 save

# Check status
pm2 status

# View logs
pm2 logs temp-core-frontend --lines 50
```

**Verify both services are running**:
```bash
pm2 status
# Should show:
# temp-core-backend  │ online
# temp-core-frontend │ online
```

---

## PART 5: NGINX CONFIGURATION

### Step 5.1: Create Nginx Config for Backend API

```bash
# Create backend API configuration
nano /etc/nginx/sites-available/temp-core-api
```

**Paste this configuration**:

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.temp-core.admitra.io;
    
    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Main API Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.temp-core.admitra.io;

    # SSL certificates (will be created by Certbot)
    ssl_certificate /etc/letsencrypt/live/temp-core.admitra.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/temp-core.admitra.io/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Increase client body size for file uploads
    client_max_body_size 50M;

    # Serve uploaded files directly
    location /uploads/ {
        alias /var/www/temp-core/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    # Proxy API requests to backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/x-javascript;
    gzip_min_length 1000;

    # Logs
    access_log /var/log/nginx/temp-core-api-access.log;
    error_log /var/log/nginx/temp-core-api-error.log;
}
```

**Save**: `Ctrl + X`, `Y`, `Enter`

### Step 5.2: Create Nginx Config for Frontend

```bash
# Create frontend configuration
nano /etc/nginx/sites-available/temp-core-web
```

**Paste this configuration**:

```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name temp-core.admitra.io www.temp-core.admitra.io;
    
    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Main Frontend Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name temp-core.admitra.io www.temp-core.admitra.io;

    # SSL certificates (will be created by Certbot)
    ssl_certificate /etc/letsencrypt/live/temp-core.admitra.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/temp-core.admitra.io/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Increase client body size for file uploads
    client_max_body_size 50M;

    # Next.js static files (with long-term caching)
    location /_next/static {
        proxy_pass http://localhost:3001;
        add_header Cache-Control "public, max-age=31536000, immutable";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js images
    location /_next/image {
        proxy_pass http://localhost:3001;
        add_header Cache-Control "public, max-age=31536000, immutable";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js data files
    location /_next/data {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Main Next.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/x-javascript text/html;
    gzip_min_length 1000;

    # Logs
    access_log /var/log/nginx/temp-core-web-access.log;
    error_log /var/log/nginx/temp-core-web-error.log;
}
```

**Save**: `Ctrl + X`, `Y`, `Enter`

### Step 5.3: Enable Nginx Sites (WITHOUT SSL FIRST)

Before getting SSL certificates, we need to enable the sites with HTTP only:

```bash
# Create temporary HTTP-only configs for SSL certificate generation
nano /etc/nginx/sites-available/temp-core-api-temp
```

**Paste this temporary config**:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.temp-core.admitra.io;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Create temporary frontend config
nano /etc/nginx/sites-available/temp-core-web-temp
```

**Paste this temporary config**:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name temp-core.admitra.io www.temp-core.admitra.io;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Create certbot directory
mkdir -p /var/www/certbot

# Enable temporary sites
ln -s /etc/nginx/sites-available/temp-core-api-temp /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/temp-core-web-temp /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# If successful, reload Nginx
systemctl reload nginx
```

---

## PART 6: CONFIGURE DNS

**CRITICAL: Do this BEFORE obtaining SSL certificates**

### Step 6.1: Update DNS Records

Go to your domain registrar (where you purchased **admitra.io**) and add these DNS records:

**Record 1: Main subdomain**
```
Type: A
Name: temp-core
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600 (or Auto)
```

**Record 2: WWW subdomain**
```
Type: A
Name: www.temp-core
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600 (or Auto)
```

**Record 3: API subdomain**
```
Type: A
Name: api.temp-core
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600 (or Auto)
```

### Step 6.2: Verify DNS Propagation

```bash
# Wait 5-10 minutes, then check DNS propagation
nslookup temp-core.admitra.io
nslookup api.temp-core.admitra.io
nslookup www.temp-core.admitra.io

# Should show your VPS IP address

# Or use online tools:
# https://dnschecker.org
```

---

## PART 7: SET UP SSL CERTIFICATE (HTTPS)

### Step 7.1: Obtain SSL Certificates with Certbot

```bash
# Obtain certificate for all domains at once
certbot certonly --nginx \
  -d temp-core.admitra.io \
  -d www.temp-core.admitra.io \
  -d api.temp-core.admitra.io \
  --email your-email@gmail.com \
  --agree-tos \
  --no-eff-email

# Follow the prompts
# Certbot will verify domain ownership and issue certificates
```

**Expected output**:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/temp-core.admitra.io/fullchain.pem
Key is saved at: /etc/letsencrypt/live/temp-core.admitra.io/privkey.pem
```

### Step 7.2: Enable HTTPS Configs

```bash
# Remove temporary HTTP-only configs
rm /etc/nginx/sites-enabled/temp-core-api-temp
rm /etc/nginx/sites-enabled/temp-core-web-temp

# Enable the full HTTPS configs we created earlier
ln -s /etc/nginx/sites-available/temp-core-api /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/temp-core-web /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# If successful, reload Nginx
systemctl reload nginx
```

### Step 7.3: Set Up Auto-Renewal

```bash
# Test renewal (dry run)
certbot renew --dry-run

# If successful, enable automatic renewal
systemctl enable certbot.timer
systemctl start certbot.timer

# Check timer status
systemctl status certbot.timer
```

---

## PART 8: VERIFY DEPLOYMENT

### Step 8.1: Test Backend API

```bash
# Test HTTP->HTTPS redirect
curl -I http://api.temp-core.admitra.io

# Test HTTPS endpoint
curl https://api.temp-core.admitra.io/
# Expected: "API is running!" or similar response

# Test with browser
# Open: https://api.temp-core.admitra.io
```

### Step 8.2: Test Frontend

```bash
# Open in browser
https://temp-core.admitra.io

# Check for:
# ✅ Website loads with styles
# ✅ No console errors (F12 > Console)
# ✅ HTTPS lock icon in address bar
```

### Step 8.3: Test File Upload/Download

1. Login to admin panel
2. Upload a company logo or document
3. Verify file appears in: `/var/www/temp-core/uploads/`
4. Check file is accessible via: `https://api.temp-core.admitra.io/uploads/filename.jpg`

### Step 8.4: Monitor Applications

```bash
# Check PM2 status
pm2 status

# View real-time logs
pm2 logs

# Monitor resource usage
pm2 monit

# Check Nginx logs
tail -f /var/log/nginx/temp-core-web-access.log
tail -f /var/log/nginx/temp-core-api-error.log
```

---

## PART 9: DATABASE SEEDING (IF NEEDED)

If you need to populate initial form structures and data:

```bash
cd /var/www/temp-core/backend

# Seed form structure (CORE document fields, form parts, sections)
npm run seed:forms

# Seed additional data if you have other seed scripts
# Check package.json for available seed commands
```

---

## PART 10: SECURITY HARDENING

### Step 10.1: Create Non-Root User (Recommended)

```bash
# Create app user
adduser appuser
usermod -aG sudo appuser

# Switch to app user for future operations
su - appuser
```

### Step 10.2: Configure Automatic Security Updates

```bash
# Install unattended-upgrades
apt install -y unattended-upgrades

# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades
```

### Step 10.3: Set Up Fail2Ban (SSH Protection)

```bash
# Install Fail2Ban
apt install -y fail2ban

# Create local config
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
nano /etc/fail2ban/jail.local

# Find [sshd] section and ensure:
# enabled = true
# maxretry = 3
# bantime = 3600

# Restart Fail2Ban
systemctl restart fail2ban
systemctl enable fail2ban
```

---

## PART 11: BACKUP STRATEGY

### Step 11.1: MongoDB Atlas Backups

- MongoDB Atlas automatically backs up your data
- Configure retention policy in Atlas dashboard
- Default: 7 days retention

### Step 11.2: VPS File Backups

```bash
# Create backup script
nano /root/backup.sh
```

**Paste this script**:
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup uploads folder
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/temp-core/uploads

# Backup environment files
tar -czf $BACKUP_DIR/env_$DATE.tar.gz /var/www/temp-core/backend/.env /var/www/temp-core/frontend/.env.local

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /root/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e

# Add this line:
0 2 * * * /root/backup.sh >> /var/log/backup.log 2>&1
```

---

## PART 12: UPDATING YOUR APPLICATION

### Update Backend

```bash
cd /var/www/temp-core/backend

# Pull latest code (if using Git)
git pull origin main

# Install new dependencies
npm install

# Rebuild TypeScript
npm run build

# Restart with PM2
pm2 restart temp-core-backend

# View logs to ensure no errors
pm2 logs temp-core-backend --lines 50
```

### Update Frontend

```bash
cd /var/www/temp-core/frontend

# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Rebuild Next.js
npm run build

# Restart with PM2
pm2 restart temp-core-frontend

# View logs
pm2 logs temp-core-frontend --lines 50
```

---

## PART 13: TROUBLESHOOTING

### Issue: CSS Not Loading / Unstyled Website

**Symptoms**: Website loads but appears unstyled, only HTML visible

**Solution**:
```bash
# 1. Check if frontend is running
pm2 status
pm2 logs temp-core-frontend

# 2. Verify Next.js build completed
cd /var/www/temp-core/frontend
ls -la .next/
# Should see: server/, static/, cache/ folders

# 3. Rebuild if needed
npm run build
pm2 restart temp-core-frontend

# 4. Check Nginx logs
tail -f /var/log/nginx/temp-core-web-error.log

# 5. Verify Nginx is proxying correctly
curl -I http://localhost:3001/_next/static/
curl -I https://temp-core.admitra.io/_next/static/

# 6. Clear browser cache or test in incognito
```

### Issue: 502 Bad Gateway

**Symptoms**: Nginx shows "502 Bad Gateway" error

**Solution**:
```bash
# 1. Check if backend/frontend processes are running
pm2 status

# 2. If stopped, start them
pm2 start temp-core-backend
pm2 start temp-core-frontend

# 3. Check if ports 5000 and 3001 are listening
netstat -tuln | grep -E '5000|3001'

# 4. Check PM2 logs for errors
pm2 logs --lines 100

# 5. Restart services
pm2 restart all
systemctl restart nginx
```

### Issue: MongoDB Connection Failed

**Symptoms**: Backend logs show "MongooseError" or connection timeout

**Solution**:
```bash
# 1. Verify MongoDB URI in .env
cd /var/www/temp-core/backend
cat .env | grep MONGO_URI

# 2. Check VPS IP is whitelisted in MongoDB Atlas
# Go to MongoDB Atlas → Network Access
# Add your VPS IP: XXX.XXX.XXX.XXX/32

# 3. Test connection
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGO_URI').then(() => console.log('Connected!')).catch(e => console.error(e));"

# 4. Restart backend
pm2 restart temp-core-backend
```

### Issue: File Uploads Not Working

**Symptoms**: Files upload successfully but can't be viewed/downloaded

**Solution**:
```bash
# 1. Check uploads directory exists and has correct permissions
ls -la /var/www/temp-core/uploads/
chmod -R 755 /var/www/temp-core/uploads/

# 2. Verify Nginx serves files correctly
curl -I https://api.temp-core.admitra.io/uploads/test.jpg

# 3. Check Nginx config has /uploads/ location block
nano /etc/nginx/sites-available/temp-core-api
# Should have: location /uploads/ { alias /var/www/temp-core/uploads/; }

# 4. Reload Nginx
nginx -t
systemctl reload nginx

# 5. Check backend serves files
curl http://localhost:5000/uploads/test.jpg
```

### Issue: SSL Certificate Errors

**Symptoms**: Browser shows "Not Secure" or certificate warnings

**Solution**:
```bash
# 1. Check certificate status
certbot certificates

# 2. Verify certificate files exist
ls -la /etc/letsencrypt/live/temp-core.admitra.io/

# 3. Renew certificates manually
certbot renew --force-renewal

# 4. Reload Nginx
systemctl reload nginx

# 5. Test SSL
curl -I https://temp-core.admitra.io
```

### Issue: Port Already in Use (EADDRINUSE)

**Symptoms**: Error when starting frontend/backend: "listen EADDRINUSE: address already in use :::3001" or ":::5000"

**Note**: This project uses port 3001 for frontend (not 3000) to avoid conflicts with other projects

**Cause**: Process is already running on that port (usually PM2 is already running it)

**Solution**:
```bash
# 1. Check if PM2 is already running the process
pm2 status

# If you see temp-core-frontend or temp-core-backend running, you're good!
# Don't run npm start manually - PM2 is managing it

# 2. If you need to restart, use PM2
pm2 restart temp-core-frontend
pm2 restart temp-core-backend

# 3. If you need to check what's using the port
netstat -tuln | grep ':3001'
netstat -tuln | grep ':5000'

# 4. If a rogue process is using the port (not PM2), kill it
lsof -ti:3001 | xargs kill -9   # Kill process on port 3001
lsof -ti:5000 | xargs kill -9   # Kill process on port 5000

# 5. Then start with PM2
cd /var/www/temp-core/frontend
pm2 start npm --name "temp-core-frontend" -- start

cd /var/www/temp-core/backend
pm2 start dist/src/server.js --name "temp-core-backend"
```

### Issue: High Memory Usage

**Symptoms**: Server becomes slow, processes crash

**Solution**:
```bash
# 1. Check memory usage
free -h
pm2 monit

# 2. Add swap space (if not already)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 3. Restart high-memory processes
pm2 restart temp-core-frontend
pm2 restart temp-core-backend

# 4. Optimize PM2 (use cluster mode if needed)
pm2 delete temp-core-backend
pm2 start dist/src/server.js --name "temp-core-backend" -i 1

# 5. Monitor
pm2 monit
```

---

## PART 14: USEFUL COMMANDS REFERENCE

### PM2 Commands
```bash
pm2 status                    # Check all processes
pm2 logs                      # View all logs
pm2 logs <name>               # View specific process logs
pm2 restart <name>            # Restart process
pm2 stop <name>               # Stop process
pm2 delete <name>             # Remove process
pm2 monit                     # Monitor resources
pm2 save                      # Save current process list
pm2 resurrect                 # Restore saved processes
```

### Nginx Commands
```bash
nginx -t                      # Test configuration
systemctl status nginx        # Check nginx status
systemctl reload nginx        # Reload config (no downtime)
systemctl restart nginx       # Restart nginx
tail -f /var/log/nginx/error.log  # View error logs
```

### System Commands
```bash
df -h                         # Check disk space
free -h                       # Check memory usage
htop                          # Interactive process viewer
netstat -tuln                 # Check listening ports
ufw status                    # Check firewall status
journalctl -xe                # View system logs
```

### SSL Commands
```bash
certbot certificates          # List certificates
certbot renew                 # Renew certificates
certbot renew --dry-run       # Test renewal
certbot delete                # Remove certificate
```

---

## PART 15: ENVIRONMENT VARIABLES SUMMARY

### Backend .env (Production)
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
JWT_SECRET=generate-random-64-char-string-here
JWT_EXPIRES_IN=7d
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
FRONTEND_URL=https://temp-core.admitra.io
ALLOWED_ORIGINS=https://temp-core.admitra.io,https://www.temp-core.admitra.io
```

### Frontend .env.local (Production)
```env
NEXT_PUBLIC_API_URL=https://api.temp-core.admitra.io/api
NEXT_PUBLIC_IVY_API_URL=https://api.temp-core.admitra.io/api
```

---

## PART 16: DEPLOYMENT CHECKLIST

- [ ] MongoDB Atlas cluster created and configured
- [ ] MongoDB Atlas IP whitelist updated with VPS IP
- [ ] Hostinger KVM 1 VPS provisioned and accessible via SSH
- [ ] Node.js, npm, PM2, Nginx, Certbot installed
- [ ] Firewall (UFW) configured (ports 22, 80, 443)
- [ ] Backend code deployed to `/var/www/temp-core/backend`
- [ ] Backend .env file created with production values
- [ ] Backend dependencies installed and TypeScript compiled
- [ ] Backend running on PM2 as `temp-core-backend`
- [ ] Frontend code deployed to `/var/www/temp-core/frontend`
- [ ] Frontend .env.local file created
- [ ] Frontend dependencies installed and Next.js built
- [ ] Frontend running on PM2 as `temp-core-frontend`
- [ ] Uploads directory created at `/var/www/temp-core/uploads`
- [ ] DNS records created (temp-core, www.temp-core, api.temp-core)
- [ ] DNS propagation verified
- [ ] Nginx configurations created (temp-core-api, temp-core-web)
- [ ] Nginx sites enabled and tested
- [ ] SSL certificates obtained via Certbot
- [ ] HTTPS working for all domains
- [ ] File uploads/downloads tested
- [ ] Email functionality tested
- [ ] Authentication tested (login, register, password reset)
- [ ] PM2 startup script configured
- [ ] SSL auto-renewal configured
- [ ] Backup script created and scheduled
- [ ] Security hardening completed (Fail2Ban, etc.)

---

## PART 17: POST-DEPLOYMENT TASKS

### 1. Create Super Admin Account
```bash
# SSH to server
cd /var/www/temp-core/backend

# If you have a seed script for super admin
npm run seed:superadmin

# Or create manually through your application's registration flow
```

### 2. Configure Email Templates
- Test all email flows (registration, password reset, verification)
- Ensure `FRONTEND_URL` in backend .env is correct

### 3. Monitor for First 24 Hours
```bash
# Watch logs for errors
pm2 logs --lines 100

# Monitor resource usage
pm2 monit

# Check Nginx logs
tail -f /var/log/nginx/temp-core-web-error.log
tail -f /var/log/nginx/temp-core-api-error.log
```

### 4. Performance Testing
- Test page load speeds
- Check API response times
- Verify file upload/download speeds
- Test concurrent user scenarios

---

## SUPPORT & RESOURCES

- **MongoDB Atlas**: [docs.mongodb.com/atlas](https://docs.mongodb.com/atlas)
- **PM2 Documentation**: [pm2.keymetrics.io](https://pm2.keymetrics.io)
- **Nginx Documentation**: [nginx.org/docs](https://nginx.org/docs)
- **Let's Encrypt/Certbot**: [certbot.eff.org](https://certbot.eff.org)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Node.js Best Practices**: [github.com/goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices)

---

## QUICK START SUMMARY

For experienced users, here's the condensed version:

```bash
# 1. Server Setup
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git
npm install -g pm2

# 2. Deploy Backend
mkdir -p /var/www/temp-core/{backend,frontend,uploads}
cd /var/www/temp-core/backend
# Clone code, create .env, then:
npm install && npm run build
pm2 start dist/src/server.js --name "temp-core-backend"

# 3. Deploy Frontend
cd /var/www/temp-core/frontend
# Clone code, create .env.local, then:
npm install && npm run build
pm2 start npm --name "temp-core-frontend" -- start
pm2 startup && pm2 save

# 4. Configure Nginx
# Create configs in /etc/nginx/sites-available/ (see Part 5)
ln -s /etc/nginx/sites-available/temp-core-{api,web} /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 5. SSL
certbot certonly --nginx -d temp-core.admitra.io -d www.temp-core.admitra.io -d api.temp-core.admitra.io
systemctl reload nginx

# 6. Firewall
ufw allow 22,80,443/tcp && ufw --force enable
```

---

**Last Updated**: February 11, 2026
**Version**: 1.0
**Domain**: temp-core.admitra.io
**VPS**: Hostinger KVM 1

---

## NOTES

- This guide assumes you're using the existing codebase from `C:\Users\aksha\Desktop\Kareer Studio\Integrated\`
- All recent bug fixes (meeting details, debouncing, chat errors, pointer 6 access, etc.) are included in the deployment
- File uploads are stored locally on VPS at `/var/www/temp-core/uploads/`
- MongoDB Atlas is used for database (cloud-based, no local MongoDB needed)
- PM2 ensures processes auto-restart on crashes or server reboot
- Let's Encrypt provides free SSL certificates with auto-renewal
- Nginx acts as reverse proxy and static file server

For questions or issues during deployment, refer to the Troubleshooting section (Part 13).

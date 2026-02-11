# Complete Deployment Guide: CORE on Hostinger with MongoDB Atlas

## 📋 Project Overview
- **Full-Stack Application**: Node.js/Express backend + Next.js frontend
- **Database**: MongoDB Atlas (Cloud)
- **Hosting**: Hostinger VPS/Shared Hosting
- **Tech Stack**: TypeScript, React, Express, MongoDB, Tailwind CSS

---

## 🎯 Pre-Deployment Checklist

- [ ] MongoDB Atlas account created and cluster setup
- [ ] Hostinger account with hosting/VPS plan
- [ ] Domain name configured
- [ ] Git repository created (GitHub/GitLab)
- [ ] All environment variables documented
- [ ] SSL certificate provisioned
- [ ] Email configuration ready (SMTP details)

---

## PART 1: MONGODB ATLAS SETUP

### Step 1.1: Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Sign Up Free"
3. Create account with email/password or Google/GitHub
4. Verify email address

### Step 1.2: Create a Cluster
1. Log in to MongoDB Atlas
2. Click "Create" → Choose "M0 Free Tier" (for development/small projects)
3. **Cluster Settings**:
   - Cloud Provider: AWS
   - Region: Choose closest to your users (e.g., ap-south-1 for India)
   - Cluster Name: `core-prod`
4. Click "Create Deployment"
5. Wait 2-3 minutes for cluster to be ready

### Step 1.3: Set Up Database Access
1. Go to "Database Access" tab
2. Click "Add Database User"
3. **Create User**:
   - Username: `core_admin`
   - Password: Use strong password (25+ characters, mix of uppercase, lowercase, numbers, symbols)
   - Built-in Role: `Atlas Admin`
   - Click "Add User"
4. **Copy the password** - you'll need it next

### Step 1.4: Set Up Network Access
1. Go to "Network Access" tab
2. Click "Add IP Address"
3. Choose one of these options:
   - **Option A**: Add Hostinger IP (if static)
   - **Option B**: Allow from anywhere: `0.0.0.0/0` (less secure but works for testing)
   - Recommended: Whitelist only your Hostinger IP once you know it

### Step 1.5: Get MongoDB URI
1. Click "Databases" tab
2. Click "Connect" button on your cluster
3. Choose "Drivers"
4. Select "Node.js" driver
5. Copy the connection string that looks like:
   ```
   mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/CORE?retryWrites=true&w=majority&appName=Cluster0
   ```
6. Replace `PASSWORD` with actual password
7. **Save this URI** - you'll need it for environment variables

---

## PART 2: HOSTINGER SETUP

### Step 2.1: Choose Hosting Plan

**Option A: VPS (Recommended for Full-Stack)**
- Go to Hostinger → VPS Hosting
- Choose: **Business VPS** or above ($12-25/month)
- Operating System: **Ubuntu 22.04 LTS**
- Location: Choose based on your users
- Initial Settings:
  - Hostname: `core`
  - User: Create strong root password
  - Choose basic packages (include Node.js)

**Option B: Shared Hosting + Deployment Service**
- Use Hostinger's App Hosting
- Limited Node.js support - not recommended for full-stack

**Recommended: VPS Option A**

### Step 2.2: Access Your Server
1. Once VPS is provisioned, you'll get:
   - IP Address (e.g., `123.45.67.89`)
   - Root password (via email or panel)
   - SSH port (default: 22)

2. Connect via SSH (on Windows):
   - Install PuTTY: [putty.org](https://putty.org)
   - Host: Your IP address
   - Port: 22
   - Username: `root`
   - Password: Use the one from Hostinger

3. Or use PowerShell/Terminal (Mac/Linux):
   ```bash
   ssh root@YOUR_IP_ADDRESS
   ```

### Step 2.3: Initial Server Configuration

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install npm (comes with Node.js)
npm install -g npm@latest

# Install Git
apt install -y git

# Install PM2 (Process Manager for Node.js)
npm install -g pm2

# Install MongoDB CLI (optional but useful)
apt install -y curl
curl -O https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/6.0/amd64/DEBS/mongodb-mongosh_1.6.2_amd64.deb
dpkg -i mongodb-mongosh_1.6.2_amd64.deb

# Install Nginx (Web Server & Reverse Proxy)
apt install -y nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Verify installations
node --version
npm --version
git --version
pm2 --version
```

---

## PART 3: DEPLOY BACKEND

### Step 3.1: Create Application Directory
```bash
# Create app directory
mkdir -p /var/www/core
cd /var/www/core

# Create separate directories for backend and frontend
mkdir backend frontend
```

### Step 3.2: Clone Backend Code

**Option A: Via Git (Recommended)**
```bash
cd /var/www/core/backend

# Clone your repository (use HTTPS or SSH)
git clone https://github.com/akshayamin62/CORE.git .

# Or if it's in a subfolder:
git clone https://github.com/akshayamin62/CORE.git
cd CORE/backend
```

**Option B: Via SCP/Manual Upload**
```bash
# On your local machine, upload files
scp -r backend/* root@YOUR_IP:/var/www/core/backend/
```

### Step 3.3: Set Up Backend Environment Variables

```bash
cd /var/www/core/backend

# Create .env file
nano .env
```

**Paste this content** (update values):
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://core_admin:YOUR_PASSWORD@cluster.mongodb.net/CORE?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-production-12345678901234567890
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail with App Password)
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-16-chars

# Frontend URLs for Email Links
EMAIL_VERIFICATION_URL=https://core.admitra.io/verify-email
PASSWORD_RESET_URL=https://core.admitra.io/reset-password

# CORS Configuration
FRONTEND_URL=https://core.admitra.io
```

**Save file**: Press `Ctrl + X`, then `Y`, then `Enter`

### Step 3.4: Install Dependencies & Build

```bash
cd /var/www/core/backend

# Install npm dependencies
npm install

# Build TypeScript to JavaScript
npm run build
# This compiles TypeScript files from src/ to dist/

# Test if server starts
npm start
# Expected: "✅ Connected to MongoDB successfully" and "🚀 Server is running on port 5000"
# Press Ctrl + C to stop
```

### Step 3.5: Set Up PM2 for Backend

```bash
cd /var/www/core/backend

# Start backend with PM2 (using compiled JavaScript)
pm2 start dist/server.js --name "core-backend"

# Make PM2 start on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs core-backend
```

---

## PART 4: DEPLOY FRONTEND

### Step 4.1: Clone Frontend Code

```bash
cd /var/www/core/frontend

# Clone repository
git clone https://github.com/akshayamin62/CORE.git .
# Or if in subfolder: git clone ... && cd CORE/frontend

# Or upload via SCP
# scp -r frontend/* root@YOUR_IP:/var/www/core/frontend/
```

### Step 4.2: Set Up Frontend Environment Variables

```bash
cd /var/www/core/frontend

# Create .env.local file
nano .env.local
```

**Paste this content**:
```env
# Backend API URL (use HTTPS in production)
NEXT_PUBLIC_API_URL=https://api.core.admitra.io/api
```

**Save file**: Press `Ctrl + X`, then `Y`, then `Enter`

### Step 4.3: Install Dependencies & Build Next.js

```bash
cd /var/www/core/frontend

# Install dependencies
npm install

# Build Next.js application
npm run build
# This creates .next folder (production build)

# Test production build
npm start
# Expected: Server running on port 3000
# Press Ctrl + C to stop
```

### Step 4.4: Set Up PM2 for Frontend

```bash
cd /var/www/core/frontend

# Start frontend with PM2
pm2 start npm --name "core-frontend" -- start

# Verify
pm2 status

# View logs
pm2 logs core-frontend
```

---

## PART 5: NGINX CONFIGURATION

### Step 5.1: Create Nginx Config for Backend API

```bash
sudo nano /etc/nginx/sites-available/core-api
```

**Paste this configuration** (also available in `nginx-core-api.conf`):
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.core.admitra.io;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Main API Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.core.admitra.io;

    ssl_certificate /etc/letsencrypt/live/core.admitra.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/core.admitra.io/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    gzip_min_length 1000;

    access_log /var/log/nginx/core-api-access.log;
    error_log /var/log/nginx/core-api-error.log;
}
```

**Save**: `Ctrl + X`, `Y`, `Enter`

### Step 5.2: Create Nginx Config for Frontend

```bash
sudo nano /etc/nginx/sites-available/core-web
```

**Paste this configuration** (also available in `nginx-core-web.conf`):
```nginx
# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name core.admitra.io www.core.admitra.io;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Main Frontend Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name core.admitra.io www.core.admitra.io;

    ssl_certificate /etc/letsencrypt/live/core.admitra.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/core.admitra.io/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 50M;

    # Next.js static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js images
    location /_next/image {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js data files
    location /_next/data {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Main app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    gzip_min_length 1000;

    access_log /var/log/nginx/core-web-access.log;
    error_log /var/log/nginx/core-web-error.log;
}
```

**Save**: `Ctrl + X`, `Y`, `Enter`

### Step 5.3: Enable Nginx Sites

```bash
# Create symlinks to enable sites
sudo ln -s /etc/nginx/sites-available/core-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/core-web /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
# Expected: "successful"

# Start/Reload Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## PART 6: SET UP SSL CERTIFICATE (HTTPS)

### Step 6.1: Configure DNS

1. Go to your domain registrar where you purchased **admitra.io**
2. Navigate to DNS Management/DNS Settings
3. Add/Update these DNS records:

**Record 1: Main subdomain** (core.admitra.io):
```
Type: A
**Note:** If you followed Step 5.1 and 5.2 correctly with the complete configurations above, your Nginx files already include HTTPS settings. You can **skip this step** and proceed to Step 6.4.

However, if you only set up HTTP initially, update them now:

```bash
# Update API config with HTTPS
sudo nano /etc/nginx/sites-available/core-api
# Copy the complete configuration from Step 5.1 above

# Update frontend config with HTTPS
sudo nano /etc/nginx/sites-available/core-web
# Copy the complete configuration from Step 5.2 above``bash
sudo nano /etc/nginx/sites-available/core-web
```

**Replace entire content with**:
```nginx
server {
    listen 80;
    server_name core.admitra.io www.core.admitra.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name core.admitra.io www.core.admitra.io;

    ssl_certificate /etc/letsencrypt/live/core.admitra.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/core.admitra.io/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Next.js static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js images
    location /_next/image {
        proxy_pass http://localhost:3000;
    }

    # Main app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/x-javascript;
    gzip_min_length 1000;
}
```

### Step 6.4: Test and Enable HTTPS

```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Auto-renew SSL certificates
sudo certbot renew --dry-run

# Set up auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## PART 7: DATABASE SEEDING

Your application has seed scripts to populate initial data:

```bash
cd /var/www/core/backend

# Seed form structure and services
npm run seed:forms

# Seed documents
npm run seed:documents
```

---

## PART 8: TESTING AND VERIFICATION

### Test Backend API
```bash
# Check if backend is running
curl https://api.core.admitra.io/

# Expected response: "API is running!"
```

### Test Frontend
```bash
# Visit in browser
https://core.admitra.io
```

### Monitor Applications
```bash
# Check PM2 status
pm2 status

# View real-time logs
pm2 logs

# View specific logs
pm2 logs core-backend
pm2 logs core-frontend

# Monitor resources
pm2 monit
```

---

## PART 9: FIREWALL & SECURITY

### Setup UFW Firewall
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### Security Best Practices
```bash
# Set strong root password
passwd

# Create non-root user for app (recommended)
adduser appuser
usermod -aG sudo appuser

# Disable root login (advanced)
# sudo nano /etc/ssh/sshd_config
# Change: PermitRootLogin no
# Restart: sudo systemctl restart sshd
```

---

## PART 10: BACKUPS AND MAINTENANCE

### MongoDB Atlas Automatic Backups
- MongoDB Atlas automatically backs up your data
- Go to Atlas Dashboard → Backups
- Configure backup retention policy (default: 7 days)

### Manual Backup from Command Line
```bash
# Export database
mongodump --uri "mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/CORE"

# Restore database
mongorestore --uri "mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/" dump/
```

### Application Logs Backup
```bash
# Backup PM2 logs
pm2 save

# View log file location
pm2 logs --lines 1000 > /var/backups/core-logs-$(date +%Y%m%d).log
```

---

## PART 11: ENVIRONMENT VARIABLES SUMMARY

### Production .env (Backend)
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://core_admin:PASSWORD@cluster.mongodb.net/CORE?retryWrites=true&w=majority
JWT_SECRET=unique-secret-key-at-least-32-chars-long
JWT_EXPIRES_IN=7d
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=gmail-app-password
EMAIL_VERIFICATION_URL=https://core.admitra.io/verify-email
PASSWORD_RESET_URL=https://core.admitra.io/reset-password
FRONTEND_URL=https://core.admitra.io
```

### Production .env.local (Frontend)
```env
NEXT_PUBLIC_API_URL=https://api.core.admitra.io/api
```

---

## PART 12: COMMON ISSUES & TROUBLESHOOTING

### Issue: CSS Not Loading (HTML Only, No Styles)

**Symptoms:** Website loads but appears unstyled, only HTML visible

**Solution:**
```bash
# 1. Rebuild Next.js application
cd /var/www/core/frontend
npm run build

# 2. Restart frontend
pm2 restart core-frontend

# 3. Update Nginx configuration (already included in guide above)
# Make sure your nginx config has _next/static location block



# 4. Test Nginx config and reload
sudo nginx -t
sudo systemctl reload nginx

# 5. Clear browser cache or test in incognito mode

# 6. Check if Next.js is running properly
pm2 logs core-frontend
curl http://localhost:3000

# 7. Check for console errors in browser (F12 > Console tab)
```

**Additional checks:**
```bash
# Verify frontend build completed successfully
cd /var/www/core/frontend
ls -la .next/
# Should see: server/, static/, cache/ folders

# Check if PM2 is serving correctly
pm2 status
# core-frontend should show "online" status
```

---

### Other Common Issues

| Issue | Solution |
|-------|----------|
| **502 Bad Gateway** | Check backend is running: `pm2 logs core-backend` |
| **Backend can't connect to MongoDB** | Verify MongoDB URI, check IP whitelist in MongoDB Atlas |
| **Frontend shows API errors** | Check `NEXT_PUBLIC_API_URL` matches backend URL, verify CORS in backend |
| **SSL certificate errors** | Run `sudo certbot renew`, check `/etc/letsencrypt/live/` |
| **High CPU/Memory usage** | Check `pm2 monit`, restart with `pm2 restart all` |
| **Pages loading slowly** | Enable gzip (already in Nginx config), check MongoDB indexes |
| **Email not sending** | Verify EMAIL_ADDRESS and EMAIL_PASSWORD, enable "Less secure apps" in Gmail |

---

## PART 13: DEPLOYMENT CHECKLIST

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with strong password
- [ ] Network access configured
- [ ] Hostinger VPS/Hosting account created
- [ ] SSH access verified
- [ ] Node.js, npm, PM2, Nginx installed
- [ ] Backend cloned and dependencies installed
- [ ] Backend .env file configured
- [ ] Backend running on PM2
- [ ] Frontend cloned and dependencies installed
- [ ] Frontend .env.local configured
- [ ] Frontend built and running on PM2
- [ ] Nginx configured for both services
- [ ] Domain DNS records updated
- [ ] SSL certificates installed
- [ ] HTTPS working for both domains
- [ ] Backend API responding
- [ ] Frontend loading correctly
- [ ] Forms and authentication tested
- [ ] MongoDB seeding completed
- [ ] Firewall configured
- [ ] Backups configured

---

## PART 14: USEFUL COMMANDS FOR MAINTENANCE

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Restart all services
pm2 restart all

# View application files
cd /var/www/core
ls -la

# Update backend (after git pull)
cd backend
git pull
npm install
npm run build
pm2 restart core-backend

# Update frontend (after git pull)
cd ../frontend
git pull
npm install
npm run build
pm2 restart core-frontend

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Restart Nginx
sudo systemctl restart nginx

# Check disk space
df -h

# Check memory usage
free -h
```

---

## SUPPORT & RESOURCES

- **MongoDB Atlas Docs**: [docs.mongodb.com/atlas](https://docs.mongodb.com/atlas)
- **Node.js PM2 Guide**: [pm2.keymetrics.io](https://pm2.keymetrics.io)
- **Nginx Documentation**: [nginx.org/docs](https://nginx.org/docs)
- **Let's Encrypt/Certbot**: [certbot.eff.org](https://certbot.eff.org)
- **Hostinger Support**: Your Hostinger account dashboard

---

**Last Updated**: January 22, 2026
**Version**: 1.0


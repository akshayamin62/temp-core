# Environment Setup Guide

## Backend Environment Variables

Create a `.env` file in the `backend` folder with the following variables:

```env
# Server Configuration
PORT=5000

# MongoDB Connection
MONGO_URI=your_mongodb_atlas_connection_string

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail)
EMAIL_ADDRESS=
EMAIL_PASSWORD=

# Frontend URLs for Email Links
EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email
PASSWORD_RESET_URL=http://localhost:3000/reset-password
```

### Important Notes:

1. **EMAIL_ADDRESS & EMAIL_PASSWORD**:
   - You've provided: `u22cs067@coed.svnit.ac.in`
   - The password appears to be a Gmail App Password (which is correct)
   - Make sure "Less secure app access" is enabled or use an App Password

2. **Frontend URLs**:
   - **Current**: `http://localhost:3000` (for development)
   - **Production**: Change these to your actual domain
   - Examples:
     - `https://yourdomain.com/verify-email`
     - `https://yourdomain.com/reset-password`

3. **What to Change for Production**:
   ```env
   # Development (current)
   EMAIL_VERIFICATION_URL=http://localhost:3000/verify-email
   PASSWORD_RESET_URL=http://localhost:3000/reset-password
   
   # Production (example - change to your actual domain)
   EMAIL_VERIFICATION_URL=https://community.yourdomain.com/verify-email
   PASSWORD_RESET_URL=https://community.yourdomain.com/reset-password
   ```

## Frontend Environment Variables

Create a `.env.local` file in the `frontend` folder:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Important Notes:

1. **Development**: `http://localhost:5000/api`
2. **Production**: Change to your backend API URL
   - Example: `https://api.yourdomain.com/api`

## Complete Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
# Copy the variables from above and replace with your values

# Start the development server
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
# Add NEXT_PUBLIC_API_URL

# Start the development server
npm run dev
```

## Email Service Configuration

### Gmail Setup

1. **Using Gmail with App Password** (Recommended):
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Go to "App passwords"
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASSWORD`

2. **Your Current Setup**:
   - Email: `@coed.svnit.ac.in`
   - Password: `` (appears to be an app password)
   - This should work if it's a valid Gmail app password

### Testing Email Service

The email service will:
- Send verification emails after signup
- Send password reset emails
- Log emails to console if credentials are not configured

## URL Configuration Summary

| Environment | Email Verification URL | Password Reset URL |
|-------------|----------------------|-------------------|
| Development | `http://localhost:3000/verify-email` | `http://localhost:3000/reset-password` |
| Production | `https://yourdomain.com/verify-email` | `https://yourdomain.com/reset-password` |

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production
3. **Use HTTPS** in production
4. **Keep email passwords secure**
5. **Change default values** before deploying

## Troubleshooting

### Email not sending:
- Check EMAIL_ADDRESS and EMAIL_PASSWORD
- Verify Gmail app password is correct
- Check console for error messages
- Ensure 2-Step Verification is enabled for Gmail

### Frontend can't connect to backend:
- Check NEXT_PUBLIC_API_URL is correct
- Ensure backend is running on the specified port
- Check for CORS issues

### Verification links not working:
- Ensure EMAIL_VERIFICATION_URL and PASSWORD_RESET_URL match your frontend URLs
- Check token expiration (24 hours for email, 1 hour for password reset)

## Quick Start

1. Set up MongoDB Atlas and get connection string
2. Create `.env` in backend with all required variables
3. Create `.env.local` in frontend with API URL
4. Run `npm install` in both backend and frontend
5. Start backend: `npm run dev` in backend folder
6. Start frontend: `npm run dev` in frontend folder
7. Access frontend at `http://localhost:3000`
8. Backend API at `http://localhost:5000`

## Available Pages

- `/` - Home page
- `/signup` - User registration
- `/login` - User login
- `/verify-email?token=xxx` - Email verification
- `/forgot-password` - Request password reset
- `/reset-password?token=xxx` - Reset password
- `/dashboard` - User dashboard (protected)



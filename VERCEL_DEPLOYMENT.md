# Vercel Deployment Guide

## Critical: Environment Variables Setup

The `.env` file is not deployed to Vercel (it's in `.gitignore`). You MUST set these environment variables in your Vercel dashboard:

### Required Environment Variables

1. **DATABASE_URL**
   - Value: `postgresql://postgres.xqmvfwikikxaiqzwwbca:Cp0Nv0ZDZIHfrzVp@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`
   - This is your Supabase Connection Pooler (Port 6543)

2. **SESSION_SECRET**
   - Value: `AbX266Dk1Qpr+0tU9bwoRRiZ6DSTnr+RyzhB7gyc+1A=`
   - This is used for express-session encryption

3. **NODE_ENV**
   - Value: `production`

4. **VERCEL**
   - Value: `1`

### How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (sukoonedufoundation)
3. Go to "Settings" tab
4. Click on "Environment Variables"
5. Add each variable and click "Save"

### SSL Certificate Issue

If you see `SELF_SIGNED_CERT_IN_CHAIN` error:
- The code in `server/db.ts` now handles SSL properly for production
- In production, it uses `ssl: true` to properly handle Supabase's SSL certificate
- In development, it uses `ssl: { rejectUnauthorized: false }`

### Logo Display Issue

Fixed in `vercel.json` - added routes for Logo.png and favicon.png:
```json
{
  "src": "/Logo.png",
  "dest": "/public/Logo.png"
},
{
  "src": "/favicon.png",
  "dest": "/public/favicon.png"
}
```

### Files Modified for Vercel Compatibility

1. **vercel.json** - Added routes for Logo.png and favicon.png
2. **server/index.ts** - Clean, no blocking database queries
3. **server/static.ts** - Uses process.cwd() for serverless compatibility
4. **server/db.ts** - Fixed SSL handling for production
5. **api/index.ts** - Simplified to directly pass requests

### After Deployment

1. Check Vercel function logs for any errors
2. Test the `/api/auth/login` endpoint
3. Verify the logo displays on login page and dashboard

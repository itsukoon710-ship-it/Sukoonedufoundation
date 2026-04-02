# Vercel Deployment Guide

## Critical: Environment Variables Setup

The `.env` file is not deployed to Vercel (it's in `.gitignore`). You MUST set these environment variables in your Vercel dashboard:

### Required Environment Variables

1. **DATABASE_URL**
   - Value: `postgresql://postgres.xqmvfwikikxaiqzwwbca:Cp0Nv0ZDZIHfrzVp@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require`
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
5. Add each variable:
   - Name: `DATABASE_URL`
   - Value: `postgresql://postgres.xqmvfwikikxaiqzwwbca:Cp0Nv0ZDZIHfrzVp@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require`
   - Click "Save"
   
   - Name: `SESSION_SECRET`
   - Value: `AbX266Dk1Qpr+0tU9bwoRRiZ6DSTnr+RyzhB7gyc+1A=`
   - Click "Save"
   
   - Name: `NODE_ENV`
   - Value: `production`
   - Click "Save"
   
   - Name: `VERCEL`
   - Value: `1`
   - Click "Save"

6. After adding all variables, redeploy your application

### Important Notes

- Using Supabase Connection Pooler on port 6543 for better serverless performance
- The `?sslmode=require` is automatically added by the code if not present
- Make sure your Supabase project allows connections from Vercel's IP ranges

### Files Modified for Vercel Compatibility

1. **vercel.json** - Updated to use `api/index.ts` as the serverless entry point
2. **server/index.ts** - Removed top-level database connection check, `export default app;` at the end
3. **server/static.ts** - Updated to use `process.cwd()` for better serverless compatibility
4. **server/db.ts** - Added automatic `sslmode=require` handling for Supabase pooler connections
5. **api/index.ts** - Simplified to directly pass requests to Express app
6. **.env** - Updated to use Supabase Connection Pooler URL

### After Deployment

1. Check Vercel function logs for any errors
2. Test the `/api/auth/login` endpoint
3. Test the `/api/auth/me` endpoint
4. Verify all API endpoints are working correctly

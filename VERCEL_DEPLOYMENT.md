# Vercel Deployment Guide

## Critical: Environment Variables Setup

The `.env` file is not deployed to Vercel (it's in `.gitignore`). You MUST set these environment variables in your Vercel dashboard:

### Required Environment Variables

1. **DATABASE_URL**
   - Value: `postgresql://postgres:Cp0Nv0ZDZIHfrzVp@db.xqmvfwikikxaiqzwwbca.supabase.co:5432/postgres`
   - This is your Supabase database connection string

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
   - Value: `postgresql://postgres:Cp0Nv0ZDZIHfrzVp@db.xqmvfwikikxaiqzwwbca.supabase.co:5432/postgres`
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

- The DATABASE_URL must be accessible from Vercel's serverless functions
- If you're using Supabase, ensure your database allows connections from Vercel's IP ranges
- You may need to add `0.0.0.0/0` to your Supabase database's allowed IP addresses in the Supabase dashboard under Settings > Database > Connection pooling

### Troubleshooting

If you still get `ENOTFOUND` errors after setting environment variables:

1. **Check Supabase Database Status**
   - Go to your Supabase dashboard
   - Ensure your database is active and running

2. **Check Connection String**
   - Verify the connection string in Supabase: Settings > Database > Connection string
   - Make sure you're using the correct project reference

3. **Check IP Allowlist**
   - In Supabase: Settings > Database > Connection pooling
   - Add `0.0.0.0/0` to allow connections from anywhere (for serverless functions)

4. **Check Database Password**
   - Ensure the password in the connection string is correct
   - If you've reset your database password, update the DATABASE_URL

### Build Configuration

The project is configured to:
- Build the client with `@vercel/static-build`
- Build the server with `@vercel/node` using `api/index.ts`
- Route all `/api/*` requests to the serverless function
- Serve static files from the `dist/public` directory

### Files Modified for Vercel Compatibility

1. **vercel.json** - Updated to use `api/index.ts` as the serverless entry point
2. **server/index.ts** - Removed top-level database connection check that was causing crashes
3. **server/static.ts** - Updated to use `process.cwd()` for better serverless compatibility
4. **All server files** - Verified ESM imports have `.js` extensions

### After Deployment

1. Check Vercel function logs for any errors
2. Test the `/api/auth/login` endpoint
3. Test the `/api/auth/me` endpoint
4. Verify all API endpoints are working correctly

### Security Note

The credentials in this file are for reference only. In production:
- Use strong, unique passwords
- Rotate secrets regularly
- Consider using Vercel's environment variable encryption

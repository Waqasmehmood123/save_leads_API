# Railway Deployment Guide

## Prerequisites
- Railway account (sign up at https://railway.app)
- Firebase service account JSON file

## Step-by-Step Deployment

### 1. Prepare Firebase Credentials

Copy your Firebase service account JSON content:
```bash
cat suredeal-69c36-firebase-adminsdk-fbsvc-39420527e4.json
```

Copy the entire JSON output (you'll need it for Railway environment variables).

### 2. Deploy to Railway

#### Option A: Deploy from GitHub (Recommended)

1. Push your code to GitHub:
```bash
cd api
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. Go to https://railway.app/new
3. Click "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect the Node.js project

#### Option B: Deploy with Railway CLI

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize project:
```bash
cd api
railway init
```

4. Deploy:
```bash
railway up
```

### 3. Configure Environment Variables

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add the following variables:

**Required:**
- `FIREBASE_SERVICE_ACCOUNT` - Paste your entire Firebase service account JSON (as a single line or multiline)
- `PORT` - Railway will set this automatically, but you can set it to `3001` if needed

**Optional:**
- `NODE_ENV` - Set to `production`

### 4. Set Firebase Service Account

Copy your Firebase JSON and paste it as the value for `FIREBASE_SERVICE_ACCOUNT`.

**Important:** Make sure the JSON is properly formatted. You can use this format:
```json
{"type":"service_account","project_id":"suredeal-69c36",...}
```

Or use the Railway secret file feature:
1. Click "Add Variable"
2. Select "Add Secret File"
3. Name it `FIREBASE_SERVICE_ACCOUNT`
4. Paste the JSON content

### 5. Deploy and Test

1. Railway will automatically deploy after you add environment variables
2. Once deployed, you'll get a URL like: `https://your-app.railway.app`
3. Test the health endpoint:
```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 6. Update Make.com Webhook URL

Update your Make.com webhook to point to:
```
https://your-app.railway.app/api/save-results
```

## Monitoring

### View Logs
```bash
railway logs
```

Or view logs in the Railway dashboard under the "Deployments" tab.

### Check Deployment Status
```bash
railway status
```

## Troubleshooting

### Issue: "Failed to load Firebase credentials"
- Check that `FIREBASE_SERVICE_ACCOUNT` environment variable is set correctly
- Verify the JSON is valid (use a JSON validator)
- Make sure there are no extra spaces or line breaks

### Issue: "Port already in use"
- Railway automatically assigns a PORT. Don't hardcode it.
- The server listens on `process.env.PORT || 3001`

### Issue: "Module not found"
- Run `npm install` locally to ensure package.json is correct
- Check that all dependencies are in the `dependencies` section (not `devDependencies`)

### Issue: Deployment fails
- Check Railway logs for specific error messages
- Ensure Node.js version is compatible (>=18.0.0)
- Verify all files are committed to git

## Custom Domain (Optional)

1. Go to your Railway project
2. Click "Settings"
3. Scroll to "Domains"
4. Click "Generate Domain" or add your custom domain
5. Follow DNS configuration instructions

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Firebase Admin SDK service account JSON |
| `PORT` | No | Server port (Railway sets automatically) |
| `NODE_ENV` | No | Environment (production/development) |

## Useful Commands

```bash
# View logs
railway logs

# Open project in browser
railway open

# Link to existing project
railway link

# Run command in Railway environment
railway run npm start

# View environment variables
railway variables
```

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup

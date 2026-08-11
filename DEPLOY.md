# Deploy to Railway

## Step 1: Push to GitHub

```bash
cd Stoneymountain/cmms
git init
git add .
git commit -m "Initial CMMS commit"
git remote add origin https://github.com/YOUR_USERNAME/cmms
git push -u origin main
```

## Step 2: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize GitHub and select your cmms repo
5. Railway auto-detects the Node.js project

## Step 3: Add PostgreSQL

1. In Railway dashboard, click **"+ Add Service"**
2. Select **PostgreSQL**
3. Railway creates a `DATABASE_URL` automatically

## Step 4: Environment Variables

Railway auto-sets `DATABASE_URL`. Add:

- **JWT_SECRET** — Generate a random string (e.g., `openssl rand -hex 32`)
- **NODE_ENV** — Set to `production`

## Step 5: Deploy

1. Click **"Deploy"** 
2. Railway builds the server and client, then starts it
3. Get your public URL (e.g., `cmms-production.up.railway.app`)

## Step 6: Run Database Setup

Once deployed:

```bash
# Via Railway CLI (after `railway login`)
railway run node server/db/setup.js
```

Or trigger via the release command in Procfile (automatic on first deploy).

## Access

Visit your Railway URL and log in with:
- nate@stoneymountain.local / changeme123
- dalton@stoneymountain.local / changeme123

## Monitoring

- Check logs in Railway dashboard
- Database queries visible in PostgreSQL logs
- Deployments auto-trigger on git push to main

## Custom Domain (Optional)

In Railway → Settings → Custom Domain, add `cmms.yourdomain.com` and point DNS.

---

That's it. Dalton can now access the CMMS anywhere with internet.

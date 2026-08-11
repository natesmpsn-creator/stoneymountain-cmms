# Stoneymountain CMMS Setup Guide

## Prerequisites

- Node.js 16+
- PostgreSQL 12+

## Local Development

### 1. Database Setup

```bash
createdb cmms
```

### 2. Environment Variables

Create `.env`:

```
DATABASE_URL=postgresql://username:password@localhost:5432/cmms
JWT_SECRET=your-secret-key
PORT=5000
```

### 3. Install & Run

```bash
# Install server dependencies
npm install

# Initialize database
node db/setup.js

# Start server (runs on :5000, serves React from /public)
npm start
```

The server serves the pre-built React app from `/public`. If you need to dev on the React side:

```bash
cd client-src
npm install
npm start  # Runs on :3000, proxies API to :5000
```

## Build for Production

```bash
npm run build
```

This installs `client-src` dependencies, builds React, and copies the output to `/public`. The server serves it.

## Railway Deployment

1. Push to GitHub
2. Create new Railway project → "Deploy from GitHub"
3. Railway auto-detects Node.js
4. Add PostgreSQL service (Railway creates `DATABASE_URL` automatically)
5. Add env var: `JWT_SECRET=your-secret-key`
6. Deploy
7. After deploy, run: `railway run node db/setup.js`

Your CMMS is live at the Railway URL.

## Demo Credentials

- **Email:** nate@stoneymountain.local
- **Password:** changeme123

Or:

- **Email:** dalton@stoneymountain.local  
- **Password:** changeme123

## API Endpoints

### Auth
- `POST /api/login` — Login

### Requests
- `GET /api/requests` — List all
- `POST /api/requests` — Create new
- `PATCH /api/requests/:id` — Update status/priority

### Schedules
- `GET /api/schedules` — List all
- `POST /api/schedules` — Create new
- `PATCH /api/schedules/:id` — Update

### Assets
- `GET /api/assets` — List all
- `POST /api/assets` — Create new
